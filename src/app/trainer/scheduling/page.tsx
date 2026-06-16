import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SchedulingManager } from "@/components/trainer/scheduling-manager";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TrainerSchedulingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [sessions, courses] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { trainerId: user.id },
      include: { course: { include: { enrollments: { select: { learnerId: true } } } } },
      orderBy: { startTime: "asc" }
    }),
    prisma.course.findMany({
      where: { trainerId: user.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true }
    })
  ]);

  const serializedSessions = sessions.map((session) => ({
    id: session.id,
    courseId: session.courseId,
    title: session.title,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    meetingLink: session.meetingLink,
    sessionVideoUrl: session.sessionVideoUrl,
    status: session.status,
    course: session.course
  }));

  return (
    <AppShell user={user} title="Scheduling" subtitle="Smart training calendar" activeHref="/trainer/scheduling">
      <PageSection
        eyebrow="Smart Scheduling"
        title="Manage live training sessions across your courses"
        description="Create, edit, cancel, and complete sessions while SkillPilot notifies enrolled learners and tracks reminder workflows."
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Metric label="Scheduled" value={String(sessions.filter((session) => session.status === "SCHEDULED").length)} />
        <Metric label="Completed" value={String(sessions.filter((session) => session.status === "COMPLETED").length)} />
        <Metric label="Cancelled" value={String(sessions.filter((session) => session.status === "CANCELLED").length)} />
      </section>

      <SchedulingManager courses={courses} initialSessions={serializedSessions} />
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-ink/55">{label}</p>
        <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}
