import { NextResponse } from "next/server";
import { z } from "zod";
import { generateChatbotReply } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { generateText } from "@/lib/groq";
import { calculateFinalAmount, generateReceiptNumber, paymentMethods } from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";
import { stockCourses } from "@/lib/stock-courses";
import { describeSubscription, formatSubscriptionPrice, getDefaultSubscription, getLearnerPlanAccess, getPlansForRole, type SubscriptionMetadata } from "@/lib/subscriptions";

const chatbotSchema = z.object({
  message: z.string({ required_error: "Message is required." }).trim().min(2, "Ask a course question first."),
  courseId: z.string().optional().nullable(),
  teachingStyle: z.enum(["Direct", "Encouraging", "Humorous"]).optional(),
  paymentMethod: z.object({
    methodType: z.enum(paymentMethods),
    label: z.string().trim().max(80),
    updatedAt: z.string().optional()
  }).optional().nullable(),
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
  }).optional().nullable(),
  action: z.object({
    type: z.enum(["CONFIRM_PURCHASE", "CONFIRM_UNENROLL"]),
    courseId: z.string().optional()
  }).optional().nullable()
});

type LearnerUser = {
  id: string;
  fullName: string;
};

type ActionCard =
  | { type: "SAVE_PAYMENT_METHOD"; title: string; description: string; buttonLabel: string }
  | { type: "CONFIRM_PURCHASE"; title: string; description: string; buttonLabel: string; courseId: string; courseTitle: string; amount: number }
  | { type: "VIEW_RECEIPT"; title: string; description: string; buttonLabel: string; href: string }
  | { type: "VIEW_COURSE"; title: string; description: string; buttonLabel: string; href: string }
  | { type: "SUBSCRIPTION_ACTION"; title: string; description: string; buttonLabel: string; action: "UPGRADE" | "CANCEL" | "RENEW" | "FIX_PAYMENT"; role: "LEARNER" | "TRAINER"; planName?: string }
  | { type: "CONFIRM_UNENROLL"; title: string; description: string; buttonLabel: string; courseId: string; courseTitle: string };

type SavedPaymentMethod = z.infer<typeof chatbotSchema>["paymentMethod"];

type EnrollmentSummary = {
  id: string;
  progress: number;
  status: string;
  course: {
    id: string;
    title: string;
    category: string;
    level: string;
    duration: string;
  };
  payment: {
    receiptNumber: string;
    amount: number;
    status: string;
    paymentMethod: string;
  };
};

type LearnerPayment = {
  amount: number;
  status: string;
  receiptNumber: string;
  paymentMethod: string;
  createdAt: Date;
};

type LearnerSession = {
  title: string;
  startTime: Date;
  courseId: string;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const body = chatbotSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Message is required.");
    }));

    if (user.role !== "LEARNER") {
      throw new ForbiddenError();
    }

    assertRateLimit(`chatbot:${user.id}`, 12);

    if (body.action?.type === "CONFIRM_PURCHASE") {
      return handlePurchaseConfirmation(user, body.action.courseId, body.paymentMethod, body.subscription?.userRole === "LEARNER" ? body.subscription : null);
    }

    if (body.action?.type === "CONFIRM_UNENROLL") {
      return handleUnenrollConfirmation(user, body.action.courseId);
    }

    const enrollment = body.courseId
      ? await prisma.enrollment.findFirst({
          where: { learnerId: user.id, courseId: body.courseId },
          include: {
            course: true
          }
        })
      : null;

    if (body.courseId && !enrollment) {
      return NextResponse.json({ message: "Course not found for this learner." }, { status: 404 });
    }

    const [sessions, payments, enrollments] = await Promise.all([
      prisma.trainingSession.findMany({
        where: {
          status: "SCHEDULED",
          startTime: { gte: new Date() },
          ...(body.courseId
            ? { courseId: body.courseId }
            : {
                course: {
                  enrollments: {
                    some: { learnerId: user.id }
                  }
                }
              })
        },
        orderBy: { startTime: "asc" },
        take: 5
      }),
      prisma.payment.findMany({
        where: {
          learnerId: user.id,
          ...(body.courseId ? { courseId: body.courseId } : {})
        },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      prisma.enrollment.findMany({
        where: { learnerId: user.id },
        include: {
          course: true,
          payment: true
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    const learnerMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        courseId: body.courseId || null,
        sender: "USER",
        message: body.message
      },
      include: { course: true }
    });

    const paymentIntentReply = await buildPaymentAgentReply({
      user,
      message: body.message,
      savedPaymentMethod: body.paymentMethod,
      subscription: body.subscription?.userRole === "LEARNER" ? body.subscription : null,
      enrollments,
      payments,
      sessions
    });

    const reply = paymentIntentReply ?? await generateChatbotReply({
      learnerName: user.fullName,
      question: body.message,
      teachingStyle: body.teachingStyle,
      course: enrollment?.course
        ? {
            title: enrollment.course.title,
            description: enrollment.course.description,
            category: enrollment.course.category,
            level: enrollment.course.level,
            duration: enrollment.course.duration
          }
        : null,
      context: {
        progress: enrollment?.progress,
        upcomingSessions: sessions.map((session) => ({ title: session.title, startTime: session.startTime })),
        payments: payments.map((payment) => ({
          amount: payment.amount,
          status: payment.status,
          receiptNumber: payment.receiptNumber,
          paymentMethod: payment.paymentMethod
        }))
      }
    });

    const [aiMessage] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          userId: user.id,
          courseId: body.courseId || null,
          sender: "AI_BOT",
          message: reply.message
        },
        include: { course: true }
      }),
      ...(enrollment?.course
        ? [
            prisma.automationTask.create({
              data: {
                trainerId: enrollment.course.trainerId,
                type: "CHATBOT_REPLY",
                title: `Chatbot reply: ${enrollment.course.title}`,
                description: `AI chatbot answered ${user.fullName}'s learner question for ${enrollment.course.title}.`,
                status: "COMPLETED",
                scheduledAt: new Date()
              }
            })
          ]
        : [])
    ]);

    return NextResponse.json({
      source: reply.source,
      messages: [formatMessage(learnerMessage), formatMessage(aiMessage)],
      actionCards: "actionCards" in reply ? reply.actionCards : []
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function handlePurchaseConfirmation(user: LearnerUser, courseId: string | undefined, paymentMethod: SavedPaymentMethod, subscription: SubscriptionMetadata | null | undefined) {
  if (!courseId) {
    throw new ValidationError("Choose a course before confirming purchase.");
  }

  if (!paymentMethod) {
    return createSyntheticChatResponse(user.id, "Please save a payment method first before buying a course.", [
      {
        type: "SAVE_PAYMENT_METHOD",
        title: "Save payment method",
        description: "Store a safe mock method before the AI Payment Agent creates a demo checkout.",
        buttonLabel: "Save Payment Method"
      }
    ]);
  }

  const currentSubscription = subscription ?? getDefaultSubscription("LEARNER");
  const access = getLearnerPlanAccess(currentSubscription.planName);
  if (access.courseLimit <= 0) {
    return createSyntheticChatResponse(user.id, `Course enrollment is locked on ${currentSubscription.planName}. Upgrade to Starter Learner at $19/month or Pro Learner at $49/month before buying a course.`, [
      {
        type: "VIEW_COURSE",
        title: "Manage subscription",
        description: "Open Settings to upgrade with a mock subscription receipt.",
        buttonLabel: "Manage Subscription",
        href: "/learner/settings"
      }
    ]);
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, status: "PUBLISHED" },
    include: { enrollments: true }
  });

  if (!course) {
    throw new ValidationError("That course is not available for purchase.");
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      learnerId_courseId: {
        learnerId: user.id,
        courseId: course.id
      }
    }
  });

  if (existingEnrollment) {
    return createSyntheticChatResponse(user.id, `You are already enrolled in ${course.title}. I will not create a duplicate payment.`, [
      {
        type: "VIEW_COURSE",
        title: "Open course",
        description: "Continue learning from your enrolled course page.",
        buttonLabel: "View Course",
        href: `/learner/course-player/${course.id}`
      }
    ]);
  }

  const { finalAmount } = calculateFinalAmount(course);
  const receiptNumber = generateReceiptNumber();

  const [payment] = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({
      data: {
        learnerId: user.id,
        courseId: course.id,
        amount: finalAmount,
        status: "PAID",
        receiptNumber,
        paymentMethod: `${paymentMethod.methodType} (${paymentMethod.label})`
      }
    });

    await tx.enrollment.create({
      data: {
        learnerId: user.id,
        courseId: course.id,
        paymentId: createdPayment.id,
        progress: 0,
        status: "ACTIVE"
      }
    });

    await tx.notification.create({
      data: {
        userId: user.id,
        title: "Enrollment confirmed",
        message: `Payment ${receiptNumber} confirmed. You are enrolled in ${course.title}.`,
        type: "PAYMENT_SUCCESS"
      }
    });

    await tx.notification.create({
      data: {
        userId: course.trainerId,
        title: "New learner enrolled",
        message: `${user.fullName} enrolled in ${course.title} through the AI Payment Agent.`,
        type: "TRAINER_ENROLLMENT"
      }
    });

    return [createdPayment];
  });

  return createSyntheticChatResponse(
    user.id,
    `Mock payment complete. You are enrolled in ${course.title}. Receipt ${payment.receiptNumber} is ready, and no real money moved.`,
    [
      {
        type: "VIEW_RECEIPT",
        title: "Receipt ready",
        description: `Paid ${formatCurrency(payment.amount)} with ${paymentMethod.methodType}.`,
        buttonLabel: "View Receipt",
        href: `/payment/success/${payment.id}`
      },
      {
        type: "VIEW_COURSE",
        title: "Start learning",
        description: "Open the course player and begin your first lesson.",
        buttonLabel: "View Course",
        href: `/learner/course-player/${course.id}`
      }
    ]
  );
}

async function handleUnenrollConfirmation(user: LearnerUser, courseId: string | undefined) {
  if (!courseId) {
    throw new ValidationError("Choose an enrolled course before confirming unenrollment.");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      learnerId_courseId: {
        learnerId: user.id,
        courseId
      }
    },
    include: { course: true }
  });

  if (!enrollment) {
    return createSyntheticChatResponse(user.id, "I could not find an active enrollment for that course.", []);
  }

  await prisma.$transaction([
    prisma.enrollment.delete({ where: { id: enrollment.id } }),
    prisma.notification.create({
      data: {
        userId: user.id,
        title: "Course unenrolled",
        message: `You unenrolled from ${enrollment.course.title}.`,
        type: "ENROLLMENT_CANCELLED"
      }
    })
  ]);

  return createSyntheticChatResponse(user.id, `You have been unenrolled from ${enrollment.course.title}. Your learner dashboard will update after refresh.`, []);
}

async function buildPaymentAgentReply({
  message,
  savedPaymentMethod,
  subscription,
  enrollments,
  payments,
  sessions
}: {
  user: LearnerUser;
  message: string;
  savedPaymentMethod?: SavedPaymentMethod;
  subscription?: SubscriptionMetadata | null;
  enrollments: EnrollmentSummary[];
  payments: LearnerPayment[];
  sessions: LearnerSession[];
}) {
  const intent = detectLearnerPaymentIntent(message);
  if (!intent) return null;

  if (intent === "SHOW_ENROLLED") {
    const list = enrollments.length
      ? enrollments.map((enrollment, index) => `${index + 1}. ${enrollment.course.title} - ${enrollment.progress}% progress (${enrollment.status.toLowerCase()})`).join("\n")
      : "You do not have enrolled courses yet.";
    return { source: "payment-agent" as const, message: list, actionCards: [] as ActionCard[] };
  }

  if (intent === "PAYMENT_HISTORY") {
    const list = payments.length
      ? payments.map((payment, index) => `${index + 1}. ${formatCurrency(payment.amount)} ${payment.status.toLowerCase()} via ${payment.paymentMethod} - receipt ${payment.receiptNumber}`).join("\n")
      : "I do not see payment records yet.";
    return { source: "payment-agent" as const, message: list, actionCards: [] as ActionCard[] };
  }

  if (intent === "PROMOTIONS") {
    const discounted = await prisma.course.findMany({
      where: { status: "PUBLISHED", discountActive: true },
      orderBy: { createdAt: "desc" },
      take: 4
    });
    const stockDeals = stockCourses.filter((course) => course.discountActive).slice(0, 3);
    const lines = [
      ...discounted.map((course) => `${course.title}: ${course.discountLabel ?? `${course.discountPercent}% off`} (${formatCurrency(calculateFinalAmount(course).finalAmount)})`),
      ...stockDeals.map((course) => `${course.title}: ${course.discountLabel} (${formatCurrency(course.discountedPrice)})`)
    ];
    const fallback = lines.length ? `Current promotions:\n${lines.join("\n")}` : "I do not see active promotions right now.";
    return {
      source: "payment-agent" as const,
      message: await smartPaymentAgentText(fallback, message, { promotions: lines }),
      actionCards: [] as ActionCard[]
    };
  }

  if (intent === "SUBSCRIPTION") {
    const currentSubscription = subscription ?? getDefaultSubscription("LEARNER");
    const plans = getPlansForRole("LEARNER");
    const upgrade = plans.find((plan) => plan.price > currentSubscription.planPrice) ?? plans[plans.length - 1];
    const lower = message.toLowerCase();
    const cancelledNote = currentSubscription.status === "CANCELLED"
      ? "Your plan is cancelled in demo mode, so renewal is paused."
      : `Your renewal date is ${formatLongDate(currentSubscription.renewalDate)}.`;
    const fallback = subscriptionExplanation(lower, currentSubscription, upgrade, cancelledNote);
    return {
      source: "payment-agent" as const,
      message: await smartPaymentAgentText(fallback, message, { subscription: currentSubscription, availablePlans: plans }),
      actionCards: learnerSubscriptionActions(lower, currentSubscription)
    };
  }

  if (intent === "CERTIFICATES") {
    const completed = enrollments.filter((enrollment) => enrollment.status === "COMPLETED" || enrollment.progress >= 100);
    return {
      source: "payment-agent" as const,
      message: completed.length
        ? `Unlocked certificates:\n${completed.map((enrollment, index) => `${index + 1}. ${enrollment.course.title}`).join("\n")}`
        : "No certificates are unlocked yet. Score at least 8/10 on a course quiz to unlock a certificate.",
      actionCards: [] as ActionCard[]
    };
  }

  if (intent === "NEXT_SESSION") {
    const next = sessions[0];
    return {
      source: "payment-agent" as const,
      message: next ? `Your next session is "${next.title}" on ${formatDate(next.startTime)}.` : "I do not see an upcoming session yet.",
      actionCards: [] as ActionCard[]
    };
  }

  if (intent === "RECOMMEND") {
    const fallback = "A suitable plan is to take one beginner course first, finish the quiz for a certificate, then upgrade into an intermediate automation or chatbot course. Start with discounted beginner courses if you want lower-risk progress.";
    return {
      source: "payment-agent" as const,
      message: await smartPaymentAgentText(fallback, message, {
        enrolledCourses: enrollments.map((enrollment) => ({ title: enrollment.course.title, progress: enrollment.progress })),
        paidPayments: payments.length
      }),
      actionCards: [] as ActionCard[]
    };
  }

  if (intent === "UNENROLL") {
    const course = findEnrolledCourseByMessage(message, enrollments);
    if (!course) {
      return {
        source: "payment-agent" as const,
        message: enrollments.length ? "Which enrolled course should I unenroll you from?" : "You do not have enrolled courses to unenroll from.",
        actionCards: [] as ActionCard[]
      };
    }

    return {
      source: "payment-agent" as const,
      message: `Please confirm before I unenroll you from ${course.title}. This will remove it from your active learner dashboard, but historical payment records remain for the demo.`,
      actionCards: [
        {
          type: "CONFIRM_UNENROLL",
          title: "Confirm unenroll",
          description: `Remove ${course.title} from active enrollments.`,
          buttonLabel: "Confirm Unenroll",
          courseId: course.id,
          courseTitle: course.title
        }
      ] satisfies ActionCard[]
    };
  }

  if (intent === "BUY") {
    const course = await findPublishedCourseByMessage(message);
    if (!course) {
      return {
        source: "payment-agent" as const,
        message: "I could not confidently find that course in the live catalog. Open Course Catalog to choose the exact course.",
        actionCards: [
          {
            type: "VIEW_COURSE",
            title: "Open course catalog",
            description: "Browse available courses and prices.",
            buttonLabel: "View Course",
            href: "/learner/discover"
          }
        ] satisfies ActionCard[]
      };
    }

    const existing = enrollments.find((enrollment) => enrollment.course.id === course.id);
    if (existing) {
      return {
        source: "payment-agent" as const,
        message: `You are already enrolled in ${course.title}. No duplicate purchase is needed.`,
        actionCards: [
          {
            type: "VIEW_COURSE",
            title: "Open course",
            description: "Continue learning from your enrolled course page.",
            buttonLabel: "View Course",
            href: `/learner/course-player/${course.id}`
          }
        ] satisfies ActionCard[]
      };
    }

    if (!savedPaymentMethod) {
      return {
        source: "payment-agent" as const,
        message: "Please save a payment method first before buying a course.",
        actionCards: [
          {
            type: "SAVE_PAYMENT_METHOD",
            title: "Save payment method",
            description: "Only safe mock details are stored: method type, masked card ending or wallet provider, and update time.",
            buttonLabel: "Save Payment Method"
          }
        ] satisfies ActionCard[]
      };
    }

    const totals = calculateFinalAmount(course);
    return {
      source: "payment-agent" as const,
      message: `I found ${course.title}. Original price: ${formatCurrency(totals.originalAmount)}. Discount: ${totals.discount.label} (-${formatCurrency(totals.discount.amount)}). Final mock payment amount: ${formatCurrency(totals.finalAmount)}. Confirm purchase?`,
      actionCards: [
        {
          type: "CONFIRM_PURCHASE",
          title: "Confirm purchase",
          description: `${course.title} for ${formatCurrency(totals.finalAmount)} using ${savedPaymentMethod.methodType}.`,
          buttonLabel: "Confirm Purchase",
          courseId: course.id,
          courseTitle: course.title,
          amount: totals.finalAmount
        }
      ] satisfies ActionCard[]
    };
  }

  return null;
}

function detectLearnerPaymentIntent(message: string) {
  const normalized = message.toLowerCase();
  if (/\b(buy|purchase|enroll me|enrol me|enroll in|checkout)\b/.test(normalized)) return "BUY";
  if (/\b(unenroll|unenrol|cancel enrollment|drop course)\b/.test(normalized)) return "UNENROLL";
  if (/\b(enrolled courses|my courses|show my enrolled)\b/.test(normalized)) return "SHOW_ENROLLED";
  if (/\b(payment history|receipts?|invoice|paid)\b/.test(normalized)) return "PAYMENT_HISTORY";
  if (/\b(promotion|promotions|discount|deal|offer)\b/.test(normalized)) return "PROMOTIONS";
  if (/\b(subscription|renewal|renew|expired|upgrade|plan)\b/.test(normalized)) return "SUBSCRIPTION";
  if (/\b(certificate|certificates|unlocked)\b/.test(normalized)) return "CERTIFICATES";
  if (/\b(next session|upcoming session|next meeting)\b/.test(normalized)) return "NEXT_SESSION";
  if (/\b(what course|take next|recommend|suitable plan)\b/.test(normalized)) return "RECOMMEND";
  return null;
}

function subscriptionExplanation(lower: string, subscription: SubscriptionMetadata, upgrade: ReturnType<typeof getPlansForRole>[number], cancelledNote: string) {
  if (lower.includes("certificate")) {
    return subscription.planName === "Free Plan"
      ? `You cannot access certificates because Free Plan does not include certificates. Upgrade to Starter Learner at $19/month or Pro Learner at $49/month to unlock certificates. ${cancelledNote} This is HCI demo billing only; no real money is charged.`
      : `Your ${subscription.planName} includes certificates. If a certificate is still locked, you must score at least 8/10 on the course quiz first. ${cancelledNote}`;
  }

  if (lower.includes("enroll") || lower.includes("course")) {
    return subscription.planName === "Free Plan"
      ? `Free Plan lets you browse courses but does not include course enrollment. Upgrade to Starter Learner at $19/month for up to 3 courses/month, or Pro Learner at $49/month for unlimited access. ${cancelledNote}`
      : subscription.planName === "Starter Learner"
        ? `Starter Learner includes up to 3 courses/month. If you reached that limit, upgrade to Pro Learner at $49/month for unlimited access. ${cancelledNote}`
        : `Pro Learner includes unlimited course access. If enrollment is blocked, it is likely because the course is already enrolled or unavailable. ${cancelledNote}`;
  }

  if (lower.includes("chatbot") || lower.includes("limited")) {
    return subscription.planName === "Pro Learner"
      ? `Pro Learner includes full Pilot Pete access. ${cancelledNote}`
      : `Your ${subscription.planName} has ${subscription.planName === "Free Plan" ? "limited" : "basic"} Pilot Pete usage. Upgrade to Pro Learner at $49/month for full Pilot Pete access. ${cancelledNote}`;
  }

  if (lower.includes("upgrade")) {
    return `You are on ${subscription.planName}. Upgrade suggestion: ${upgrade.name} at ${formatSubscriptionPrice(upgrade.price)} for ${upgrade.features.slice(0, 3).join(", ")}. Use Settings to complete the mock upgrade and generate a demo receipt. No real billing occurs.`;
  }

  return `Your SkillPilot demo subscription is ${describeSubscription(subscription)}. ${cancelledNote} Upgrade suggestion: ${upgrade.name} at ${formatSubscriptionPrice(upgrade.price)} is best if you want ${upgrade.features.slice(0, 2).join(" and ")}. This is HCI demo billing only; no real money is charged.`;
}

function learnerSubscriptionActions(lower: string, subscription: SubscriptionMetadata): ActionCard[] {
  if (lower.includes("upgrade") || lower.includes("pro learner")) {
    return [{
      type: "SUBSCRIPTION_ACTION",
      title: "Upgrade to Pro Learner",
      description: "Activate Pro Learner at $49/month with unlimited course access, certificates, full Pilot Pete support, and priority reminders.",
      buttonLabel: "Upgrade to Pro Learner",
      action: "UPGRADE",
      role: "LEARNER",
      planName: "Pro Learner"
    }];
  }

  if (lower.includes("cancel")) {
    return [{
      type: "SUBSCRIPTION_ACTION",
      title: "Cancel subscription",
      description: `Cancel ${subscription.planName} in mock mode. No real billing action is performed.`,
      buttonLabel: "Cancel Subscription",
      action: "CANCEL",
      role: "LEARNER"
    }];
  }

  if (lower.includes("failed") || lower.includes("payment failed")) {
    return [{
      type: "SUBSCRIPTION_ACTION",
      title: "Fix failed payment",
      description: "Restore the current learner plan with a mock payment fix and receipt.",
      buttonLabel: "Fix Failed Payment",
      action: "FIX_PAYMENT",
      role: "LEARNER"
    }];
  }

  if (lower.includes("renew") || lower.includes("expired")) {
    return [{
      type: "SUBSCRIPTION_ACTION",
      title: "Renew subscription",
      description: `Renew ${subscription.planName} for another month in mock mode.`,
      buttonLabel: "Renew Subscription",
      action: "RENEW",
      role: "LEARNER"
    }];
  }

  return [{
    type: "VIEW_COURSE",
    title: "Manage subscription",
    description: "Open Settings to upgrade, downgrade, renew, cancel, or fix a failed mock payment.",
    buttonLabel: "Manage Subscription",
    href: "/learner/settings"
  }];
}

async function smartPaymentAgentText(fallback: string, question: string, context: unknown) {
  const groq = await generateText({
    system:
      "You are SkillPilot AI Payment Agent inside a demo learning platform. Give concise, professional learner payment, promotion, subscription, or course-plan advice. Use $ currency only. Never claim to process real money. Never ask for full card details. Mention that checkout is mock/demo when relevant.",
    user: {
      question,
      fallbackFacts: fallback,
      context
    },
    schema: z.string().min(20),
    temperature: 0.35,
    maxTokens: 280
  });

  return groq.ok ? groq.value : fallback;
}

async function findPublishedCourseByMessage(message: string) {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    include: { enrollments: true },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  const normalized = normalize(message);
  return courses.find((course) => normalized.includes(normalize(course.title))) ??
    courses.find((course) => normalize(course.title).split(" ").filter((word) => word.length > 2).some((word) => normalized.includes(word)) && normalized.includes(normalize(course.category).split(" ")[0] ?? "")) ??
    courses.find((course) => normalized.includes(normalize(course.category))) ??
    null;
}

function findEnrolledCourseByMessage(message: string, enrollments: EnrollmentSummary[]) {
  const normalized = normalize(message);
  return enrollments.find((enrollment) => normalized.includes(normalize(enrollment.course.title)))?.course ??
    enrollments.find((enrollment) => normalized.includes(normalize(enrollment.course.category)))?.course ??
    (enrollments.length === 1 ? enrollments[0].course : null);
}

async function createSyntheticChatResponse(userId: string, message: string, actionCards: ActionCard[]) {
  const aiMessage = await prisma.chatMessage.create({
    data: {
      userId,
      sender: "AI_BOT",
      message
    },
    include: { course: true }
  });

  return NextResponse.json({
    source: "payment-agent",
    messages: [formatMessage(aiMessage)],
    actionCards
  });
}

function formatMessage(message: { id: string; sender: string; message: string; createdAt: Date; course: { id: string; title: string } | null }) {
  return {
    id: message.id,
    sender: message.sender,
    message: message.message,
    createdAt: message.createdAt.toISOString(),
    course: message.course ? { id: message.course.id, title: message.course.title } : null
  };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
