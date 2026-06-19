import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { generateJSON } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";
import { describeSubscription, formatSubscriptionPrice, getDefaultSubscription, getPlansForRole, getTrainerPlanAccess, type SubscriptionMetadata } from "@/lib/subscriptions";

const requestSchema = z.object({
  message: z.string({ required_error: "Finance prompt is required." }).trim().min(3, "Write a finance prompt first."),
  subscription: z.object({
    userRole: z.enum(["LEARNER", "TRAINER"]),
    planName: z.string(),
    planPrice: z.number(),
    billingCycle: z.literal("month"),
    status: z.enum(["ACTIVE", "CANCELLED", "EXPIRED", "PAYMENT_FAILED"]),
    startedAt: z.string(),
    renewalDate: z.string(),
    cancelledAt: z.string().nullable(),
    paymentStatus: z.enum(["FREE", "PAID", "FAILED", "CANCELLED"]),
    receiptId: z.string()
  }).optional().nullable()
});

const financeAgentSchema = z.object({
  reply: z.string().min(10),
  recipientLearnerName: z.string().min(2),
  recipientLearnerEmail: z.string().email(),
  issueSummary: z.string().min(8),
  emailSubject: z.string().min(4),
  emailBody: z.string().min(20),
  actionTaken: z.string().min(6),
  nextStep: z.string().min(6),
  riskLevel: z.enum(["low", "medium", "high"]),
  outcome: z.enum(["resolved", "refund_review", "admin_review", "learner_email", "admin_report"]),
  requiresEmail: z.boolean(),
  escalationRecipient: z.enum(["learner", "admin", "none"])
});

type PaymentContext = {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  status: string;
  receiptNumber: string;
  paymentMethod: string;
  createdAt: string;
};

type CourseFinanceContext = {
  id: string;
  title: string;
  price: number;
  status: string;
  enrollmentCount: number;
  paidRevenue: number;
  paidCount: number;
  pendingAmount: number;
  pendingCount: number;
  failedAmount: number;
  failedCount: number;
  refundedAmount: number;
  refundedCount: number;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    assertRateLimit(`trainer-payment-agent:${user.id}`, 12);

    const body = requestSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Finance prompt is required.");
    }));

    const [payments, courses] = await Promise.all([
      prisma.payment.findMany({
        where: { course: { trainerId: user.id } },
        include: { learner: true, course: true },
        orderBy: { createdAt: "desc" },
        take: 80
      }),
      prisma.course.findMany({
        where: { trainerId: user.id },
        include: { enrollments: true, payments: true },
        orderBy: { createdAt: "desc" },
        take: 80
      })
    ]);

    const context: PaymentContext[] = payments.map((payment) => ({
      id: payment.id,
      learnerId: payment.learnerId,
      learnerName: payment.learner.fullName,
      learnerEmail: payment.learner.email,
      courseId: payment.courseId,
      courseTitle: payment.course.title,
      amount: payment.amount,
      status: payment.status,
      receiptNumber: payment.receiptNumber,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt.toISOString()
    }));
    const courseContext: CourseFinanceContext[] = courses.map((course) => {
      const paid = course.payments.filter((payment) => payment.status === "PAID");
      const pending = course.payments.filter((payment) => payment.status === "PENDING");
      const failed = course.payments.filter((payment) => payment.status === "FAILED");
      const refunded = course.payments.filter((payment) => payment.status === "REFUNDED");

      return {
        id: course.id,
        title: course.title,
        price: course.price,
        status: course.status,
        enrollmentCount: course.enrollments.length,
        paidRevenue: paid.reduce((sum, payment) => sum + payment.amount, 0),
        paidCount: paid.length,
        pendingAmount: pending.reduce((sum, payment) => sum + payment.amount, 0),
        pendingCount: pending.length,
        failedAmount: failed.reduce((sum, payment) => sum + payment.amount, 0),
        failedCount: failed.length,
        refundedAmount: refunded.reduce((sum, payment) => sum + payment.amount, 0),
        refundedCount: refunded.length
      };
    });
    const signals = detectFinanceSignals(context);
    const analytics = buildFinanceAnalytics(context, courseContext);
    const subscription = body.subscription?.userRole === "TRAINER" ? body.subscription : getDefaultSubscription("TRAINER");
    const fallback = buildFallbackFinanceReply(body.message, context, signals, analytics, user, subscription);

    const groq = await generateJSON({
      system:
        "You are SkillPilot AI Payment Agent for trainers. Answer finance questions directly first, with explanation, action, and next step. Handle total revenue, course revenue, learner payment status, double payment, failed payment, refund request, suspicious transaction, fraud indicator, subscription issue, pricing recommendation, discount suggestion, receipt confirmation, learner emails, and admin reports. This is a demo: do not claim real email, refund, payment, or fraud enforcement happened. If the prompt asks to email/send/tell/notify, draft a professional mock email and set requiresEmail true. For normal questions, set requiresEmail false. If risk is suspicious or high, recommend admin review or generate an admin report only when escalation is appropriate. Return structured JSON only.",
      user: {
        trainerName: user.fullName,
        trainerEmail: user.email,
        prompt: body.message,
        subscription,
        analytics,
        courses: courseContext,
        paymentRecords: context.slice(0, 30),
        suspiciousSignals: signals
      },
      schema: financeAgentSchema,
      temperature: 0.35,
      maxTokens: 1200
    });

    const preferLocalAnalytics = shouldPreferLocalAnalytics(body.message);
    const result = groq.ok && !preferLocalAnalytics ? normalizeFinanceReply(groq.value, fallback, body.message, context, user) : fallback;

    return NextResponse.json({
      source: groq.ok ? preferLocalAnalytics ? "local-analytics" : "groq" : "local-fallback",
      message: groq.ok ? undefined : groq.message,
      subscriptionAction: inferTrainerSubscriptionAction(body.message, subscription),
      ...result
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function inferTrainerSubscriptionAction(prompt: string, subscription: SubscriptionMetadata) {
  const lower = prompt.toLowerCase();

  if (lower.includes("upgrade") && lower.includes("business")) {
    return {
      action: "UPGRADE" as const,
      planName: "Trainer Business",
      title: "Upgrade to Trainer Business",
      description: "Unlock unlimited publishing, fraud/suspicious transaction support, and better revenue insights.",
      buttonLabel: "Upgrade to Trainer Business"
    };
  }

  if (lower.includes("upgrade") || lower.includes("trainer pro")) {
    return {
      action: "UPGRADE" as const,
      planName: "Trainer Pro",
      title: "Upgrade to Trainer Pro",
      description: "Unlock AI Marketing, Social Automation, advanced analytics, and Payment Agent support.",
      buttonLabel: "Upgrade to Trainer Pro"
    };
  }

  if (lower.includes("cancel")) {
    return {
      action: "CANCEL" as const,
      planName: subscription.planName,
      title: "Cancel trainer subscription",
      description: `Cancel ${subscription.planName} in mock mode. No real billing action is performed.`,
      buttonLabel: "Cancel Trainer Subscription"
    };
  }

  if (lower.includes("renew")) {
    return {
      action: "RENEW" as const,
      planName: subscription.planName,
      title: "Renew trainer subscription",
      description: `Renew ${subscription.planName} for another month in mock mode.`,
      buttonLabel: "Renew Trainer Subscription"
    };
  }

  if (lower.includes("failed") || lower.includes("payment failed")) {
    return {
      action: "FIX_PAYMENT" as const,
      planName: subscription.planName,
      title: "Fix failed payment",
      description: "Restore the current trainer plan with a mock payment fix and receipt.",
      buttonLabel: "Fix Failed Payment"
    };
  }

  return null;
}

function normalizeFinanceReply(
  value: z.infer<typeof financeAgentSchema>,
  fallback: z.infer<typeof financeAgentSchema>,
  prompt: string,
  payments: PaymentContext[],
  trainer: { fullName: string; email: string }
) {
  const wantsAdminReport = asksForAdminReport(prompt);
  const shouldEmail = asksForEmail(prompt) || wantsAdminReport;
  const normalizedEscalation = wantsAdminReport ? "admin" : shouldEmail ? "learner" : "none";
  const recipient = normalizedEscalation === "admin"
    ? { name: "SkillPilot Admin", email: "admin@skillpilot.ai" }
    : findLearner(prompt, payments) ?? { name: value.recipientLearnerName || fallback.recipientLearnerName, email: value.recipientLearnerEmail || fallback.recipientLearnerEmail };
  const riskLevel = value.riskLevel || fallback.riskLevel;
  const issueSummary = value.issueSummary || fallback.issueSummary;

  return {
    ...fallback,
    ...value,
    recipientLearnerName: recipient.name,
    recipientLearnerEmail: recipient.email,
    issueSummary,
    emailSubject: value.emailSubject || fallback.emailSubject,
    emailBody: ensureEmailSignature(value.emailBody || fallback.emailBody, trainer.fullName),
    actionTaken: value.actionTaken || fallback.actionTaken,
    nextStep: value.nextStep || fallback.nextStep,
    riskLevel,
    requiresEmail: shouldEmail,
    escalationRecipient: normalizedEscalation,
    outcome: shouldEmail ? value.outcome || fallback.outcome : fallback.outcome
  };
}

function buildFallbackFinanceReply(
  prompt: string,
  payments: PaymentContext[],
  signals: ReturnType<typeof detectFinanceSignals>,
  analytics: ReturnType<typeof buildFinanceAnalytics>,
  trainer: { fullName: string; email: string },
  subscription: SubscriptionMetadata
): z.infer<typeof financeAgentSchema> {
  const insight = buildDirectFinanceInsight(prompt, payments, signals, analytics, subscription);

  if (insight) {
    return insight;
  }

  const lower = prompt.toLowerCase();
  const learner = findLearner(prompt, payments) ?? inferLearnerFromPrompt(prompt);
  const highRisk = /\b(fraud|suspicious|abuse|mismatch|high payment|unusually high|admin|escalate)\b/.test(lower);
  const refund = /\b(refund|refunded|refunds)\b/.test(lower);
  const failed = /\b(failed|declined|update method|payment failed)\b/.test(lower);
  const duplicate = /\b(double|duplicate|multiple payments|same course)\b/.test(lower);
  const riskLevel = highRisk ? "high" : duplicate || refund || failed ? "medium" : "low";
  const escalationRecipient = asksForAdminReport(prompt) ? "admin" : asksForEmail(prompt) ? "learner" : "none";
  const issueSummary = summarizeIssue(prompt, signals);
  const recipient = escalationRecipient === "admin"
    ? { name: "SkillPilot Admin", email: "admin@skillpilot.ai" }
    : learner;
  const subject = escalationRecipient === "admin"
    ? `Payment risk review: ${issueSummary}`
    : refund
      ? "Your SkillPilot refund review update"
      : failed
        ? "Action needed: SkillPilot payment method update"
        : duplicate
          ? "SkillPilot double payment review"
          : "SkillPilot payment support update";
  const body = escalationRecipient === "admin"
    ? `Hi Admin Team,\n\nSkillPilot Payment Agent flagged a ${riskLevel}-risk finance issue for review.\n\nIssue summary: ${issueSummary}\nSuggested action: Review the transaction history, verify learner/course matching, and decide whether a refund review or account support note is needed.\n\nThis is a mock report for HCI demonstration only.\n\nRegards,\n${trainer.fullName}`
    : `Hi ${recipient.name},\n\nI am following up about your SkillPilot payment record.\n\nIssue summary: ${issueSummary}\n\nAction taken: I have marked this as a mock support review inside the SkillPilot prototype. No real payment has been charged, refunded, or moved by this demo.\n\nNext step: Please review your payment method or wait for trainer/admin confirmation, depending on the issue.\n\nRegards,\n${trainer.fullName}`;

  return {
    reply: buildDirectReply(riskLevel, issueSummary, escalationRecipient),
    recipientLearnerName: recipient.name,
    recipientLearnerEmail: recipient.email,
    issueSummary,
    emailSubject: subject,
    emailBody: body,
    actionTaken: escalationRecipient === "admin" ? "Prepared a mock admin escalation report." : asksForEmail(prompt) ? "Prepared a mock learner finance email." : "Reviewed local payment indicators and prepared guidance.",
    nextStep: escalationRecipient === "admin" ? "Send the mock admin report for review." : asksForEmail(prompt) ? "Preview and send the mock email if it looks correct." : "Review the recommendation and choose whether to draft an email.",
    riskLevel,
    outcome: escalationRecipient === "admin" ? "admin_report" : refund ? "refund_review" : asksForEmail(prompt) ? "learner_email" : "resolved",
    requiresEmail: asksForEmail(prompt) || escalationRecipient === "admin",
    escalationRecipient
  };
}

function buildDirectFinanceInsight(
  prompt: string,
  payments: PaymentContext[],
  signals: ReturnType<typeof detectFinanceSignals>,
  analytics: ReturnType<typeof buildFinanceAnalytics>,
  subscription: SubscriptionMetadata
): z.infer<typeof financeAgentSchema> | null {
  const lower = prompt.toLowerCase();
  const learner = findLearner(prompt, payments);
  const course = findCourse(prompt, analytics);
  const access = getTrainerPlanAccess(subscription.planName);

  if (/\b(why.*fraud|fraud detection|access fraud|suspicious transaction support|unlock fraud)\b/.test(lower) && !access.fraudSupport) {
    const business = getPlansForRole("TRAINER").find((plan) => plan.name === "Trainer Business");
    return makeNoEmailReply(
      `Fraud detection is available in Trainer Business. You are currently on ${subscription.planName}. Upgrade to Trainer Business at ${formatSubscriptionPrice(business?.price ?? 149)} to unlock suspicious transaction support, better revenue insights, and admin-style risk review. No real billing occurs in this mock flow.`,
      "Fraud detection locked",
      "Checked trainer subscription access.",
      "Open Settings to upgrade to Trainer Business, or ask for a non-fraud revenue summary that your current plan supports.",
      "low"
    );
  }

  if (/\b(upgrade me|upgrade to trainer pro|upgrade to trainer business|should i upgrade|subscription billing status|billing status|current plan)\b/.test(lower)) {
    const plans = getPlansForRole("TRAINER");
    const next = lower.includes("business") ? plans.find((plan) => plan.name === "Trainer Business") : plans.find((plan) => plan.price > subscription.planPrice) ?? plans[plans.length - 1];
    const message = lower.includes("billing status") || lower.includes("current plan")
      ? `Your trainer subscription is ${describeSubscription(subscription)}. Payment status is ${subscription.paymentStatus.toLowerCase()}. This is mock billing only; no real payment is made.`
      : `You are on ${subscription.planName}. ${next ? `Upgrade to ${next.name} at ${formatSubscriptionPrice(next.price)} if you need ${next.features.slice(0, 3).join(", ")}.` : "You are already on the highest trainer plan."} Use Settings to complete the mock upgrade and generate a demo receipt.`;
    return makeNoEmailReply(message, "Trainer subscription guidance", "Checked current trainer subscription and available plans.", "Use Settings to upgrade, downgrade, renew, cancel, or fix a failed mock payment.", "low");
  }

  if (/\b(financial status|finance status|payment health|business status|revenue status|overall status|how am i doing)\b/.test(lower)) {
    const strongest = analytics.highestRevenueCourse;
    const riskNote = signals.length
      ? `${signals.length} suspicious signal${signals.length === 1 ? "" : "s"} need review. Highest risk: ${signals[0].title}.`
      : "No major suspicious payment signals are currently flagged.";
    const status = analytics.failedCount > 2 || signals.some((signal) => signal.riskLevel === "high") ? "watch list" : "healthy";
    const message = `Your financial status is ${status}: ${formatCurrency(analytics.totalRevenue)} paid revenue, ${formatCurrency(analytics.pendingAmount)} pending, ${formatCurrency(analytics.refundedAmount)} refunded, and ${formatCurrency(analytics.failedAmount)} failed. ${strongest ? `Strongest course by revenue is ${strongest.courseTitle} with ${formatCurrency(strongest.revenue)}.` : "No course has paid revenue yet."} ${riskNote} Recommended next action: ${analytics.pendingCount ? "follow up on pending payments and convert them before launching new discounts." : "promote your strongest course and monitor failed attempts weekly."}`;
    return makeNoEmailReply(message, "Financial status summary", "Reviewed revenue, pending payments, refunds, failures, course strength, and risk signals.", "Use this summary to decide whether to follow up on payments, adjust pricing, or escalate suspicious activity.", signals.some((signal) => signal.riskLevel === "high") ? "high" : analytics.failedCount > 1 ? "medium" : "low");
  }

  if (/\b(most expensive|highest price|highest priced|priciest|premium course)\b/.test(lower)) {
    const target = analytics.mostExpensiveCourse;
    const message = target
      ? `Your most expensive course is ${target.courseTitle} at ${formatCurrency(target.price)}. It is positioned as a premium offer, with ${target.enrollmentCount} learner enrollment${target.enrollmentCount === 1 ? "" : "s"} and ${formatCurrency(target.revenue)} paid revenue so far. Recommendation: keep the premium price if learner demand stays steady; otherwise add a limited bonus before cutting the core price.`
      : "I do not see any trainer courses with prices yet. Create or publish a priced course before using premium-course pricing analysis.";
    return makeNoEmailReply(message, "Most expensive course", "Compared current trainer course prices.", target ? "Check whether the premium course also has strong enrollments before raising price." : "Add a course price, then ask again.", "low");
  }

  if (/\b(cheapest|lowest price|lowest priced|least expensive|entry price|entry-level price)\b/.test(lower)) {
    const target = analytics.cheapestCourse;
    const message = target
      ? `Your cheapest course is ${target.courseTitle} at ${formatCurrency(target.price)}. It works well as an entry offer if it leads learners toward higher-value courses. Current paid revenue is ${formatCurrency(target.revenue)} from ${target.paidCount} paid payment${target.paidCount === 1 ? "" : "s"}.`
      : "I do not see any priced courses yet, so I cannot identify an entry-level offer.";
    return makeNoEmailReply(message, "Cheapest course", "Compared current trainer course prices.", target ? "Use this course as a low-friction starter offer or bundle it with a higher-priced course." : "Add course pricing and ask again.", "low");
  }

  if (/\b(highest revenue|most revenue|top earning|best earning|strongest revenue|highest earning)\b/.test(lower)) {
    const target = analytics.highestRevenueCourse;
    const message = target
      ? `Your highest revenue course is ${target.courseTitle} with ${formatCurrency(target.revenue)} in paid revenue from ${target.paidCount} paid payment${target.paidCount === 1 ? "" : "s"}. This is your strongest finance signal. Next step: run a focused promotion or test a modest premium bundle around this course.`
      : "No course has paid revenue yet. The next useful action is to promote a published course and watch which one gets the first paid enrollments.";
    return makeNoEmailReply(message, "Highest revenue course", "Compared paid revenue by course.", target ? "Use this course as the anchor for pricing and marketing decisions." : "Create demand before changing pricing.", "low");
  }

  if (/\b(total revenue|overall revenue|how much.*earned|earned total|lifetime revenue)\b/.test(lower)) {
    return makeNoEmailReply(
      `Total paid revenue is ${formatCurrency(analytics.totalRevenue)} from ${analytics.paidCount} paid payments. Pending value is ${formatCurrency(analytics.pendingAmount)}, and failed payment value is ${formatCurrency(analytics.failedAmount)}.`,
      "Total revenue review",
      "Use this as the top-line revenue readout.",
      analytics.failedCount > 0 ? "Review failed payments before forecasting monthly revenue." : "No immediate revenue risk was detected.",
      analytics.failedCount > 2 ? "medium" : "low"
    );
  }

  if (/\b(course revenue|revenue for|sold most|top course|best course)\b/.test(lower)) {
    const target = course ?? analytics.highestRevenueCourse;
    const message = target
      ? `${target.courseTitle} has ${formatCurrency(target.revenue)} paid revenue across ${target.paidCount} paid payments. ${analytics.topCourse?.courseTitle === target.courseTitle ? "It is currently the strongest course by paid revenue." : "Compare it against your top course before changing price."}`
      : "I do not see paid course revenue yet. Publish a course, enroll learners, then use the Payment Agent to compare revenue by course.";
    return makeNoEmailReply(message, "Course revenue review", "Reviewed paid revenue by course.", target ? "Use pricing or promotion changes based on demand." : "Generate demand with AI Marketing before changing pricing.", "low");
  }

  if (/\b(pending payments?|pending amount|awaiting payment|who.*pending)\b/.test(lower)) {
    const message = analytics.pendingCount
      ? `You have ${analytics.pendingCount} pending payment${analytics.pendingCount === 1 ? "" : "s"} worth ${formatCurrency(analytics.pendingAmount)}. Most recent pending records: ${formatPaymentList(analytics.pendingPayments)}. Recommended next action: send a polite payment reminder or check whether the learner needs a different mock payment method.`
      : "You do not currently have pending payments in the local records. No reminder is needed right now.";
    return makeNoEmailReply(message, "Pending payment review", "Checked pending payment records.", analytics.pendingCount ? "Ask me to draft a learner reminder if you want a mock email." : "Keep monitoring new checkout attempts.", analytics.pendingCount > 2 ? "medium" : "low");
  }

  if (/\b(failed payments?|failed amount|declined payments?|payment failures?)\b/.test(lower) && !asksForEmail(prompt)) {
    const message = analytics.failedCount
      ? `You have ${analytics.failedCount} failed payment${analytics.failedCount === 1 ? "" : "s"} worth ${formatCurrency(analytics.failedAmount)}. Recent failures: ${formatPaymentList(analytics.failedPayments)}. Recommended next action: contact affected learners or ask them to update their mock payment method before retrying.`
      : "I do not see failed payments in the current trainer records.";
    return makeNoEmailReply(message, "Failed payment review", "Checked failed payment records.", analytics.failedCount ? "Ask me to email the learner if you want support wording." : "No failed-payment action is needed.", analytics.failedCount > 2 ? "medium" : "low");
  }

  if (/\b(refund request|refund requests|refunds?|refunded|refund abuse)\b/.test(lower) && !asksForEmail(prompt)) {
    const riskLevel = lower.includes("abuse") || analytics.refundedCount > 2 ? "medium" : "low";
    const message = analytics.refundedCount
      ? `There are ${analytics.refundedCount} refunded payment${analytics.refundedCount === 1 ? "" : "s"} totaling ${formatCurrency(analytics.refundedAmount)}. Recent refunded records: ${formatPaymentList(analytics.refundedPayments)}. Recommendation: review whether the refund reason is learner support, duplicate payment, or possible abuse before approving any new refund.`
      : "There are no refunded payments in the current local records. If a learner is requesting a refund, collect the receipt number and course name before deciding.";
    return makeNoEmailReply(message, "Refund review", "Checked refunded payment records and refund-risk wording.", analytics.refundedCount ? "Ask me to draft a refund review email if you want a learner-facing response." : "Ask the learner for receipt details first.", riskLevel);
  }

  if (/\b(payment status|status for|has .* paid|learner payment|receipt confirmation|receipt)\b/.test(lower)) {
    const learnerPayments = learner ? payments.filter((payment) => payment.learnerEmail === learner.email) : payments.slice(0, 5);
    const latest = learnerPayments[0];
    const message = latest
      ? `${latest.learnerName}'s latest payment is ${latest.status.toLowerCase()} for ${latest.courseTitle}, amount ${formatCurrency(latest.amount)}, receipt ${latest.receiptNumber}, method ${latest.paymentMethod}.`
      : "I could not find a matching learner payment record. Ask with the learner name or receipt number for a more specific lookup.";
    return makeNoEmailReply(message, "Learner payment status", "Checked local payment records.", latest?.status === "FAILED" ? "Ask the learner to update their mock payment method or draft a payment-failed email." : "Keep the receipt number for support follow-up.", latest?.status === "FAILED" ? "medium" : "low");
  }

  if (/\b(pricing|price recommendation|suggest price|raise price|discount suggestion|suggest discount|promotion)\b/.test(lower)) {
    const target = course ?? analytics.highestRevenueCourse;
    const lowDemand = analytics.courseSummaries.find((item) => item.paidCount === 0 || item.revenue < 80);
    const message = target && target.paidCount >= 2
      ? `${target.courseTitle} shows demand with ${target.paidCount} paid payments. Recommendation: test a 10-15% price increase or add a premium live-review bundle before discounting.`
      : lowDemand
        ? `${lowDemand.courseTitle} has low paid demand. Recommendation: use a 15-20% launch discount and pair it with one outcome-focused promotional post.`
        : "For pricing, use a 15% launch discount for new courses and avoid discounting courses that already have steady paid demand.";
    return makeNoEmailReply(message, "Pricing recommendation", "Compared paid count and revenue signals.", "Apply changes manually in Courses; the agent does not change prices automatically.", "low");
  }

  if (/\b(subscription|renewal|expired|plan|upgrade|cancel|failed payment|payment failed)\b/.test(lower)) {
    const plans = getPlansForRole("TRAINER");
    const targetPlan = lower.includes("business")
      ? plans.find((plan) => plan.name === "Trainer Business")
      : lower.includes("pro")
        ? plans.find((plan) => plan.name === "Trainer Pro")
        : plans.find((plan) => plan.price > subscription.planPrice) ?? plans[plans.length - 1];
    const planList = plans.map((plan) => `${plan.name} at ${formatSubscriptionPrice(plan.price)}`).join(", ");
    const message = lower.includes("cancel")
      ? `You can cancel your trainer subscription in this mock flow. Your current plan is ${subscription.planName} at ${formatSubscriptionPrice(subscription.planPrice)}, status ${subscription.status.toLowerCase()}, payment status ${subscription.paymentStatus.toLowerCase()}. If you confirm cancellation, SkillPilot will mark the demo subscription cancelled and keep a receipt-style record; no real billing occurs.`
      : lower.includes("failed") || lower.includes("payment failed")
        ? `Your trainer subscription payment status is ${subscription.paymentStatus.toLowerCase()}. If a mock payment failed, the Payment Agent can restore the current plan, create a demo receipt, and keep your access state readable on the dashboard. No real payment method is charged.`
        : lower.includes("renew") || lower.includes("expired")
          ? `Your trainer plan is ${subscription.planName}, renewal date ${new Date(subscription.renewalDate).toLocaleDateString("en-US")}, payment status ${subscription.paymentStatus.toLowerCase()}. I can renew it in mock mode for another month and generate a demo receipt.`
          : lower.includes("upgrade")
            ? `You are currently on ${subscription.planName}. ${targetPlan ? `The best matching upgrade is ${targetPlan.name} at ${formatSubscriptionPrice(targetPlan.price)} because it includes ${targetPlan.features.slice(0, 3).join(", ")}.` : "You are already on the highest trainer plan."} The upgrade is mock-only and will not charge real money.`
            : `Your current trainer plan is ${subscription.planName} at ${formatSubscriptionPrice(subscription.planPrice)}. Billing status: ${subscription.status.toLowerCase()}, payment status: ${subscription.paymentStatus.toLowerCase()}, renewal: ${new Date(subscription.renewalDate).toLocaleDateString("en-US")}. Available trainer plans are ${planList}.`;

    return makeNoEmailReply(
      message,
      "Subscription status",
      "Explained demo subscription behavior.",
      "Use the action button if you want the Payment Agent to update the mock subscription state.",
      "low"
    );
  }

  if (/\b(fraud|suspicious|duplicate|double|multiple payment|failed payment|refund abuse|mismatch|suspicious timing)\b/.test(lower) && !asksForEmail(prompt)) {
    const topSignal = signals[0];
    const riskLevel = topSignal?.riskLevel ?? (lower.includes("fraud") || lower.includes("suspicious") ? "high" : "medium");
    const message = topSignal
      ? `${topSignal.title}: ${topSignal.message} Risk is ${riskLevel}. Recommended action: ${riskLevel === "high" ? "mark for admin review and prepare an admin report if you want escalation" : "contact the learner or review refund/payment history before taking action"}.`
      : `The prompt suggests a ${riskLevel}-risk payment issue. Recommended action: review receipts, compare learner/course details, and ${riskLevel === "high" ? "escalate to admin" : "contact the learner if needed"}.`;
    return makeNoEmailReply(message, "Suspicious transaction review", "Classified the risk from prompt and local payment indicators.", riskLevel === "high" ? "Ask me to send a mock admin report if you want escalation." : "Ask me to draft a learner email if you want contact wording.", riskLevel);
  }

  return null;
}

function makeNoEmailReply(
  reply: string,
  issueSummary: string,
  actionTaken: string,
  nextStep: string,
  riskLevel: "low" | "medium" | "high"
): z.infer<typeof financeAgentSchema> {
  return {
    reply,
    recipientLearnerName: "Demo Learner",
    recipientLearnerEmail: "demo.learner@example.com",
    issueSummary,
    emailSubject: "SkillPilot finance support note",
    emailBody: "No email draft was needed for this finance question.",
    actionTaken,
    nextStep,
    riskLevel,
    outcome: riskLevel === "high" ? "admin_review" : "resolved",
    requiresEmail: false,
    escalationRecipient: "none"
  };
}

function buildFinanceAnalytics(payments: PaymentContext[], courses: CourseFinanceContext[]) {
  const paid = payments.filter((payment) => payment.status === "PAID");
  const pending = payments.filter((payment) => payment.status === "PENDING");
  const failed = payments.filter((payment) => payment.status === "FAILED");
  const refunded = payments.filter((payment) => payment.status === "REFUNDED");
  const courseMap = new Map<string, { courseId: string; courseTitle: string; price: number; revenue: number; paidCount: number; failedCount: number; pendingCount: number; enrollmentCount: number }>();

  for (const payment of payments) {
    const coursePrice = courses.find((course) => course.id === payment.courseId)?.price ?? payment.amount;
    const enrollmentCount = courses.find((course) => course.id === payment.courseId)?.enrollmentCount ?? 0;
    const current = courseMap.get(payment.courseId) ?? { courseId: payment.courseId, courseTitle: payment.courseTitle, price: coursePrice, revenue: 0, paidCount: 0, failedCount: 0, pendingCount: 0, enrollmentCount };

    if (payment.status === "PAID") {
      current.revenue += payment.amount;
      current.paidCount += 1;
    }

    if (payment.status === "FAILED") current.failedCount += 1;
    if (payment.status === "PENDING") current.pendingCount += 1;
    courseMap.set(payment.courseId, current);
  }

  for (const course of courses) {
    if (!courseMap.has(course.id)) {
      courseMap.set(course.id, {
        courseId: course.id,
        courseTitle: course.title,
        price: course.price,
        revenue: course.paidRevenue,
        paidCount: course.paidCount,
        failedCount: course.failedCount,
        pendingCount: course.pendingCount,
        enrollmentCount: course.enrollmentCount
      });
    }
  }

  const courseSummaries = Array.from(courseMap.values()).sort((first, second) => second.revenue - first.revenue);
  const pricedCourses = [...courseSummaries].filter((course) => Number.isFinite(course.price));
  const mostExpensiveCourse = [...pricedCourses].sort((first, second) => second.price - first.price)[0] ?? null;
  const cheapestCourse = [...pricedCourses].sort((first, second) => first.price - second.price)[0] ?? null;

  return {
    totalRevenue: paid.reduce((sum, payment) => sum + payment.amount, 0),
    paidCount: paid.length,
    pendingCount: pending.length,
    failedCount: failed.length,
    refundedCount: refunded.length,
    pendingAmount: pending.reduce((sum, payment) => sum + payment.amount, 0),
    failedAmount: failed.reduce((sum, payment) => sum + payment.amount, 0),
    refundedAmount: refunded.reduce((sum, payment) => sum + payment.amount, 0),
    courseSummaries,
    topCourse: courseSummaries[0] ?? null,
    highestRevenueCourse: courseSummaries[0] ?? null,
    mostExpensiveCourse,
    cheapestCourse,
    pendingPayments: pending.slice(0, 5),
    failedPayments: failed.slice(0, 5),
    refundedPayments: refunded.slice(0, 5)
  };
}

function detectFinanceSignals(payments: PaymentContext[]) {
  const signals: Array<{ title: string; message: string; riskLevel: "low" | "medium" | "high" }> = [];
  const failuresByLearner = new Map<string, { name: string; count: number }>();
  const refundsByLearner = new Map<string, { name: string; count: number }>();
  const learnerCourseAttempts = new Map<string, { learnerName: string; courseTitle: string; count: number }>();
  const timingByLearner = new Map<string, PaymentContext[]>();

  for (const payment of payments) {
    if (payment.status === "FAILED") {
      const current = failuresByLearner.get(payment.learnerId) ?? { name: payment.learnerName, count: 0 };
      failuresByLearner.set(payment.learnerId, { ...current, count: current.count + 1 });
    }

    if (payment.status === "REFUNDED") {
      const current = refundsByLearner.get(payment.learnerId) ?? { name: payment.learnerName, count: 0 };
      refundsByLearner.set(payment.learnerId, { ...current, count: current.count + 1 });
    }

    if (payment.amount > 500) {
      signals.push({
        title: "Unusually high payment",
        message: `${payment.learnerName} has a ${formatCurrency(payment.amount)} transaction for ${payment.courseTitle}.`,
        riskLevel: "high"
      });
    }

    const attemptKey = `${payment.learnerId}:${payment.courseId}`;
    const current = learnerCourseAttempts.get(attemptKey) ?? { learnerName: payment.learnerName, courseTitle: payment.courseTitle, count: 0 };
    learnerCourseAttempts.set(attemptKey, { ...current, count: current.count + 1 });
    timingByLearner.set(payment.learnerId, [payment, ...(timingByLearner.get(payment.learnerId) ?? [])]);
  }

  for (const value of failuresByLearner.values()) {
    if (value.count >= 2) {
      signals.push({
        title: "Repeated failed payments",
        message: `${value.name} has ${value.count} failed payment attempts.`,
        riskLevel: "medium"
      });
    }
  }

  for (const value of learnerCourseAttempts.values()) {
    if (value.count >= 2) {
      signals.push({
        title: "Multiple payments for same course",
        message: `${value.learnerName} has ${value.count} payment records for ${value.courseTitle}.`,
        riskLevel: "medium"
      });
    }
  }

  for (const value of refundsByLearner.values()) {
    if (value.count >= 2) {
      signals.push({
        title: "Possible refund abuse",
        message: `${value.name} has ${value.count} refunded payment records.`,
        riskLevel: "medium"
      });
    }
  }

  for (const records of timingByLearner.values()) {
    const sorted = records.sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
    if (sorted.length >= 3) {
      const newest = new Date(sorted[0].createdAt).getTime();
      const oldest = new Date(sorted[2].createdAt).getTime();
      if (newest - oldest < 1000 * 60 * 60) {
        signals.push({
          title: "Suspicious transaction timing",
          message: `${sorted[0].learnerName} has 3 payment attempts within one hour.`,
          riskLevel: "medium"
        });
      }
    }
  }

  return signals.slice(0, 8);
}

function asksForEmail(prompt: string) {
  return /\b(send|email|tell|notify|message)\b/i.test(prompt);
}

function asksForAdminReport(prompt: string) {
  return /\b(admin|escalate|report)\b/i.test(prompt);
}

function shouldPreferLocalAnalytics(prompt: string) {
  if (asksForEmail(prompt) || asksForAdminReport(prompt)) {
    return false;
  }

  return /\b(financial status|finance status|payment health|business status|revenue status|overall status|total revenue|overall revenue|how much.*earned|earned total|lifetime revenue|course revenue|revenue for|sold most|top course|best course|most expensive|highest price|highest priced|priciest|premium course|cheapest|lowest price|lowest priced|least expensive|entry price|highest revenue|most revenue|top earning|best earning|strongest revenue|pending payments?|pending amount|failed payments?|failed amount|declined payments?|refunds?|refunded|refund abuse|payment status|receipt confirmation|receipt|pricing|price recommendation|suggest price|raise price|discount suggestion|suggest discount|promotion|subscription|renewal|expired|plan|upgrade|fraud|suspicious|duplicate|double|multiple payment|mismatch|suspicious timing)\b/i.test(prompt);
}

function findLearner(prompt: string, payments: PaymentContext[]) {
  const normalized = prompt.toLowerCase();

  for (const payment of payments) {
    const fullName = payment.learnerName.toLowerCase();
    const firstName = fullName.split(/\s+/)[0] ?? "";
    if (normalized.includes(fullName) || (firstName.length > 2 && normalized.includes(firstName))) {
      return { name: payment.learnerName, email: payment.learnerEmail };
    }
  }

  return null;
}

function findCourse(prompt: string, analytics: ReturnType<typeof buildFinanceAnalytics>) {
  const normalized = prompt.toLowerCase();
  const summaries = analytics.courseSummaries;

  for (const course of summaries) {
    const title = course.courseTitle.toLowerCase();
    const words = title.split(/\s+/).filter((word) => word.length > 3);

    if (normalized.includes(title) || words.some((word) => normalized.includes(word))) {
      return course;
    }
  }

  return null;
}

function formatPaymentList(payments: PaymentContext[]) {
  if (!payments.length) {
    return "none found";
  }

  return payments
    .slice(0, 3)
    .map((payment) => `${payment.learnerName} - ${payment.courseTitle} (${formatCurrency(payment.amount)}, ${payment.status.toLowerCase()})`)
    .join("; ");
}

function inferLearnerFromPrompt(prompt: string) {
  const match = prompt.match(/\b(?:learner|to|email|notify|tell)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  const name = match?.[1] ?? "Demo Learner";
  return {
    name,
    email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "demo.learner"}@example.com`
  };
}

function summarizeIssue(prompt: string, signals: ReturnType<typeof detectFinanceSignals>) {
  const lower = prompt.toLowerCase();

  if (lower.includes("double") || lower.includes("duplicate")) return "Possible duplicate or double payment issue";
  if (lower.includes("refund")) return "Refund request is being reviewed";
  if (lower.includes("failed") || lower.includes("update method")) return "Payment failed and learner should update their method";
  if (lower.includes("suspicious") || lower.includes("fraud")) return "Suspicious payment activity requires review";
  if (lower.includes("high")) return "Unusually high transaction amount needs verification";
  if (signals[0]) return signals[0].message;
  return "General learner payment support request";
}

function buildDirectReply(riskLevel: string, issueSummary: string, escalationRecipient: string) {
  if (escalationRecipient === "admin") {
    return `I found a ${riskLevel}-risk finance issue: ${issueSummary}. I recommend marking this for admin review and sending a mock admin report. No real payment or email action will happen until you confirm the mock send.`;
  }

  if (escalationRecipient === "learner") {
    return `I prepared a learner finance email for: ${issueSummary}. Preview it first, then use Send Mock Email if the wording looks right. This does not send a real email.`;
  }

  return `I reviewed the finance prompt and local payment signals. Current recommendation: ${issueSummary}. Keep this as a demo support note unless you choose to draft a learner or admin email.`;
}

function ensureEmailSignature(body: string, trainerName: string) {
  if (body.toLowerCase().includes("this is a mock") || body.toLowerCase().includes("hci demonstration")) {
    return body;
  }

  return `${body.trim()}\n\nNote: This is a mock email for HCI demonstration.\n\nRegards,\n${trainerName}`;
}
