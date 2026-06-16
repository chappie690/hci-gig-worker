import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { PaymentAgentPanel } from "@/components/dashboard/payment-agent-panel";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PaymentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const payments = await prisma.payment.findMany({
    where: { course: { trainerId: user.id } },
    include: { learner: true, course: true },
    orderBy: { createdAt: "desc" }
  });

  const paid = payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + payment.amount, 0);
  const pending = payments.filter((payment) => payment.status === "PENDING").reduce((sum, payment) => sum + payment.amount, 0);
  const failed = payments.filter((payment) => payment.status === "FAILED").length;
  const agentPayments = payments.map((payment) => ({
    id: payment.id,
    description: payment.course.title,
    learnerName: payment.learner.fullName,
    amount: payment.amount,
    status: payment.status
  }));

  return (
    <AppShell user={user} title="Payments" subtitle="AI Payment Agent" activeHref="/trainer/payments">
      <PageSection
        eyebrow="Revenue operations"
        title="Track receipts, payment risk, and follow-up actions"
        description="Monitor course revenue, payment methods, and use the AI Payment Agent to create next-step guidance for each learner payment."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Collected" value={formatCurrency(paid)} />
        <Metric label="Pending" value={formatCurrency(pending)} />
        <Metric label="Failed" value={failed} />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Payment ledger</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {payments.map((payment) => (
              <div key={payment.id} className="grid gap-4 rounded-lg border border-ink/10 p-4 lg:grid-cols-[1fr_0.6fr_0.45fr_0.35fr] lg:items-center">
                <div>
                  <p className="font-semibold">{payment.course.title}</p>
                  <p className="text-sm text-ink/55">{payment.learner.fullName} · {payment.receiptNumber}</p>
                </div>
                <p className="text-sm text-ink/65">{payment.paymentMethod}</p>
                <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                <Badge>{payment.status.toLowerCase()}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <PaymentAgentPanel payments={agentPayments} />
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-ink/55">{label}</p>
        <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}
