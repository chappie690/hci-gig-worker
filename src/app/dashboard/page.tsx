import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { PaymentAgentPanel } from "@/components/dashboard/payment-agent-panel";
import { QuestLog } from "@/components/dashboard/quest-log";
import { TrainerMilestones } from "@/components/dashboard/trainer-milestones";
import { LinkedInPostsPanel } from "@/components/dashboard/linkedin-posts-panel";
import { TrainerProfileSummary } from "@/components/dashboard/trainer-profile-summary";
import { getDashboardData } from "@/lib/dashboard";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { MetricCard } from "@/components/ui/metric-card";
import { DynamicGreeting } from "@/components/ui/dynamic-greeting";
import { SubscriptionStatusCard } from "@/components/settings/subscription-access";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [data, profile] = await Promise.all([
    getDashboardData(user.id),
    prisma.trainerProfile.findUnique({ where: { userId: user.id } })
  ]);
  const profileSummary = {
    brandName: profile?.brandName ?? `${user.fullName} AI Training`,
    tagline: profile?.tagline ?? "Practical AI training for modern learners",
    bio: profile?.bio ?? "A SkillPilot trainer profile ready for a stronger positioning statement.",
    skills: profile?.skills ?? "AI training, prompt systems, workflow automation",
    portfolioSummary: profile?.portfolioSummary ?? "Use Trainer Settings to generate and save a portfolio summary from a prompt or uploaded trainer document."
  };

  return (
    <AppShell user={user} title="Dashboard" subtitle="Trainer workspace" activeHref="/trainer/dashboard">
      <div className="grid gap-5">
        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <DynamicGreeting
            userName={user.fullName}
            context="Your trainer cockpit is ready for learners, campaigns, sessions, and revenue work."
            className="text-sm font-semibold text-ink/65 dark:text-slate-300"
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard className="min-h-36 transition hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0" label="Revenue" value={String(data.metrics.revenue)} detail="Collected payments" />
            <MetricCard className="min-h-36 transition hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0" label="Learners" value={String(data.metrics.learners)} detail="Active CRM records" />
            <MetricCard className="min-h-36 transition hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0" label="Courses" value={String(data.metrics.courses)} detail="Published and draft" />
            <MetricCard className="min-h-36 transition hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0" label="Sessions" value={String(data.metrics.sessions)} detail="Upcoming trainings" />
          </div>
        </section>

        <SubscriptionStatusCard user={user} role="TRAINER" />

        <TrainerProfileSummary user={user} profile={profileSummary} />

        <section className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Revenue and learner mix</CardTitle>
              <p className="text-sm text-ink/60 dark:text-slate-300">Compare paid revenue and enrolled learners by course. Hover the chart for exact values.</p>
            </CardHeader>
            <CardContent>
              <DashboardChart data={data.chart} />
            </CardContent>
          </Card>
          <div className="grid gap-5">
            <PaymentAgentPanel payments={data.payments} />
            <TrainerMilestones stats={data.milestoneStats} />
          </div>
        </section>

        <QuestLog />

        <LinkedInPostsPanel />

        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-ink/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-cloud text-ink/60 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Receipt</th>
                    <th className="px-4 py-3 font-semibold">Learner</th>
                    <th className="px-4 py-3 font-semibold">Course</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10 dark:divide-slate-700">
                  {data.recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 font-medium text-ink dark:text-slate-100">{payment.receiptNumber}</td>
                      <td className="px-4 py-3 text-ink/65 dark:text-slate-300">{payment.learnerName}</td>
                      <td className="px-4 py-3 text-ink/65 dark:text-slate-300">{payment.courseTitle}</td>
                      <td className="px-4 py-3 text-ink/65 dark:text-slate-300">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3">
                        <Badge>{payment.status.toLowerCase()}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-5 lg:grid-cols-3">
          <Card className="transition hover:-translate-y-1 hover:shadow-soft motion-reduce:hover:translate-y-0">
            <CardHeader>
              <CardTitle>Micro-courses</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.courses.map((course) => (
                <div key={course.id} className="rounded-lg border border-ink/10 p-4 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{course.title}</p>
                    <Badge>{course.status.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-ink/65 dark:text-slate-300">{course.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="transition hover:-translate-y-1 hover:shadow-soft motion-reduce:hover:translate-y-0">
            <CardHeader>
              <CardTitle>Learners</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.learners.map((learner) => (
                <div key={learner.id} className="rounded-lg border border-ink/10 p-4 dark:border-slate-700">
                  <p className="font-semibold">{learner.fullName}</p>
                  <p className="text-sm text-ink/65 dark:text-slate-300">{learner.email}</p>
                  <p className="mt-2 text-sm text-moss">Enrolled learner</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="transition hover:-translate-y-1 hover:shadow-soft motion-reduce:hover:translate-y-0">
            <CardHeader>
              <CardTitle>Upcoming sessions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.sessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-ink/10 p-4 dark:border-slate-700">
                  <p className="font-semibold">{session.title}</p>
                  <p className="text-sm text-ink/65 dark:text-slate-300">{session.course.title}</p>
                  <p className="text-sm text-ink/65 dark:text-slate-300">
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    }).format(session.startTime)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
