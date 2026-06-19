import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PaymentAgentCharts } from "@/components/payments/payment-agent-charts";
import { TrainerPaymentAgentChatbot } from "@/components/payments/trainer-payment-agent-chatbot";
import { SubscriptionStatusCard, TrainerFeatureGate } from "@/components/settings/subscription-access";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function TrainerPaymentAgentPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [payments, courses] = await Promise.all([
    prisma.payment.findMany({
      where: { course: { trainerId: user.id } },
      include: { learner: true, course: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.course.findMany({
      where: { trainerId: user.id },
      include: { enrollments: true, payments: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const paidPayments = payments.filter((payment) => payment.status === "PAID");
  const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const statusCount = (status: string) => payments.filter((payment) => payment.status === status).length;
  const courseRevenue = courses.map((course) => ({
    name: shortName(course.title),
    revenue: course.payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + payment.amount, 0),
    enrollments: course.enrollments.length
  }));
  const statusData = ["PAID", "PENDING", "FAILED", "REFUNDED"].map((status) => ({ name: status, value: statusCount(status) }));
  const recommendations = buildRecommendations(courses);
  const suspicious = detectSuspicious(payments);

  return (
    <AppShell user={user} title="Payment Agent" subtitle="Revenue intelligence" activeHref="/trainer/payment-agent">
      <PageSection
        eyebrow="AI Payment Agent"
        title="Monitor revenue, pricing, discounts, and payment risk"
        description="The Payment Agent does not move real money. It assists with recommendation, verification, monitoring, and revenue tracking from local database records."
      />

      <div className="mb-6">
        <SubscriptionStatusCard user={user} role="TRAINER" />
      </div>

      <TrainerFeatureGate user={user} feature="Payment Agent support" minimumPlan="Trainer Pro">
        <section className="mb-6 grid gap-4 md:grid-cols-5">
          <Metric label="Total revenue" value={formatCurrency(totalRevenue)} />
          <Metric label="Paid" value={statusCount("PAID")} />
          <Metric label="Pending" value={statusCount("PENDING")} />
          <Metric label="Failed" value={statusCount("FAILED")} />
          <Metric label="Refunded" value={statusCount("REFUNDED")} />
        </section>

        <PaymentAgentCharts revenue={courseRevenue} statuses={statusData} />

        <div className="mt-6">
          <TrainerPaymentAgentChatbot trainer={{ fullName: user.fullName, email: user.email }} />
        </div>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>AI pricing and discount recommendations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {recommendations.map((recommendation) => (
                <div key={recommendation.courseId} className="rounded-lg border border-ink/10 p-4 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-ink dark:text-slate-100">{recommendation.courseTitle}</p>
                    <Badge className={recommendation.type === "raise" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}>{recommendation.type === "raise" ? "price" : "discount"}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-slate-300">{recommendation.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <TrainerFeatureGate user={user} feature="Fraud detection" minimumPlan="Trainer Business">
            <Card>
              <CardHeader>
                <CardTitle>Fraud and suspicious transaction indicators</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {suspicious.length ? (
                  suspicious.map((item) => (
                    <div key={item.key} className="rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-900/70 dark:bg-red-950/30">
                      <p className="font-semibold text-red-800 dark:text-red-100">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-200">{item.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-100">No major suspicious signals</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-700 dark:text-emerald-200">The current local records do not show repeated failures, unusual amounts, or repeated attempts beyond the configured thresholds.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TrainerFeatureGate>
        </section>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-ink/10 dark:border-slate-700">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-cloud text-ink/60 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Receipt</th>
                    <th className="px-4 py-3 font-semibold">Learner</th>
                    <th className="px-4 py-3 font-semibold">Course</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10 dark:divide-slate-700">
                  {payments.slice(0, 10).map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 font-medium text-ink dark:text-slate-100">{payment.receiptNumber}</td>
                      <td className="px-4 py-3 text-ink/65 dark:text-slate-300">{payment.learner.fullName}</td>
                      <td className="px-4 py-3 text-ink/65 dark:text-slate-300">{payment.course.title}</td>
                      <td className="px-4 py-3 text-ink/65 dark:text-slate-300">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3 text-ink/65 dark:text-slate-300">{payment.paymentMethod}</td>
                      <td className="px-4 py-3"><Badge>{payment.status.toLowerCase()}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TrainerFeatureGate>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-ink/55 dark:text-slate-300">{label}</p>
        <p className="mt-2 text-2xl font-bold text-ink dark:text-slate-100">{value}</p>
      </CardContent>
    </Card>
  );
}

function buildRecommendations(courses: Array<{ id: string; title: string; price: number; enrollments: unknown[]; payments: Array<{ status: string }> }>) {
  return courses.map((course) => {
    const paidCount = course.payments.filter((payment) => payment.status === "PAID").length;

    if (course.enrollments.length <= 1) {
      return {
        courseId: course.id,
        courseTitle: course.title,
        type: "discount" as const,
        message: `Low enrollment signal: consider a 10-15% launch discount or bundle bonus to move ${course.title} toward its first active cohort.`
      };
    }

    if (paidCount >= 2 || course.enrollments.length >= 3) {
      return {
        courseId: course.id,
        courseTitle: course.title,
        type: "raise" as const,
        message: `Demand signal detected: test a higher price near ${formatCurrency(Math.round(course.price * 1.15))} or add a premium cohort tier.`
      };
    }

    return {
      courseId: course.id,
      courseTitle: course.title,
      type: "discount" as const,
      message: "Keep pricing steady, but offer a limited learner incentive if enrollment velocity slows."
    };
  });
}

function detectSuspicious(payments: Array<{ id: string; learnerId: string; amount: number; status: string; learner: { fullName: string } }>) {
  const signals: Array<{ key: string; title: string; message: string }> = [];
  const failuresByLearner = new Map<string, { name: string; count: number }>();

  for (const payment of payments) {
    if (payment.status === "FAILED") {
      const current = failuresByLearner.get(payment.learnerId) ?? { name: payment.learner.fullName, count: 0 };
      failuresByLearner.set(payment.learnerId, { ...current, count: current.count + 1 });
    }

    if (payment.amount > 500) {
      signals.push({
        key: `high-${payment.id}`,
        title: "Very high transaction amount",
        message: `${payment.learner.fullName} has a ${formatCurrency(payment.amount)} transaction. Review the receipt before high-value delivery.`
      });
    }
  }

  for (const [learnerId, value] of failuresByLearner) {
    if (value.count >= 2) {
      signals.push({
        key: `failed-${learnerId}`,
        title: "Multiple failed payments",
        message: `${value.name} has ${value.count} failed payment attempts. Verify billing details before retrying.`
      });
    }
  }

  const attemptsByLearner = new Map<string, number>();
  payments.forEach((payment) => attemptsByLearner.set(payment.learnerId, (attemptsByLearner.get(payment.learnerId) ?? 0) + 1));
  for (const [learnerId, count] of attemptsByLearner) {
    if (count >= 3) {
      const learnerName = payments.find((payment) => payment.learnerId === learnerId)?.learner.fullName ?? "A learner";
      signals.push({
        key: `attempts-${learnerId}`,
        title: "Repeated payment attempts",
        message: `${learnerName} has ${count} payment records. Review for duplicate attempts or support needs.`
      });
    }
  }

  return signals;
}

function shortName(value: string) {
  return value.length > 16 ? `${value.slice(0, 15)}...` : value;
}
