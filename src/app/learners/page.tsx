import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LearnersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { course: { trainerId: user.id } },
    include: {
      learner: true,
      course: true,
      payment: true
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <AppShell user={user} title="Learners" subtitle="Learner CRM" activeHref="/trainer/learners">
      <PageSection
        eyebrow="Learner operations"
        title="Track progress, payments, and learner context"
        description="See who is enrolled, which course they are taking, and where they need attention before the next live session."
      />

      <section className="grid gap-5">
        {enrollments.map((enrollment) => (
          <Card key={enrollment.id}>
            <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_1.1fr_0.7fr] lg:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-limewash text-sm font-bold text-moss">
                    {initials(enrollment.learner.fullName)}
                  </div>
                  <div>
                    <p className="font-semibold">{enrollment.learner.fullName}</p>
                    <p className="text-sm text-ink/55">{enrollment.learner.email}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{enrollment.course.title}</p>
                  <Badge>{enrollment.status.toLowerCase()}</Badge>
                </div>
                <Progress className="mt-3" value={enrollment.progress} />
                <p className="mt-2 text-sm text-ink/55">{enrollment.progress}% complete</p>
              </div>
              <div className="rounded-lg bg-cloud p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-moss">Payment</p>
                <p className="mt-2 text-sm font-semibold text-ink">{enrollment.payment.receiptNumber}</p>
                <p className="text-sm text-ink/60">{enrollment.payment.status.toLowerCase()} via {enrollment.payment.paymentMethod}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Learner support queue</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <QueueItem label="Needs onboarding" value="2" />
          <QueueItem label="Low progress" value="1" />
          <QueueItem label="Ready for upsell" value="3" />
        </CardContent>
      </Card>
    </AppShell>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function QueueItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 p-4">
      <p className="text-sm text-ink/55">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
