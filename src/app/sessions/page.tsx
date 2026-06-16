import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SessionCreator } from "@/components/trainer/session-creator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SessionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [sessions, courses] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { trainerId: user.id },
      include: { course: { include: { enrollments: true } } },
      orderBy: { startTime: "asc" }
    }),
    prisma.course.findMany({
      where: { trainerId: user.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true }
    })
  ]);

  const nextSession = sessions.find((session) => session.status === "SCHEDULED");

  return (
    <AppShell user={user} title="Sessions" subtitle="Live training schedule" activeHref="/trainer/sessions">
      <PageSection
        eyebrow="Training calendar"
        title="Coordinate live workshops and learner touchpoints"
        description="Keep upcoming sessions, meeting links, course context, and learner load visible before delivery."
      />

      <SessionCreator courses={courses} />

      {nextSession ? (
        <section className="mb-6 rounded-lg bg-ink p-6 text-white">
          <p className="text-sm uppercase tracking-[0.18em] text-white/60">Next session</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_0.45fr] lg:items-end">
            <div>
              <h2 className="text-3xl font-bold">{nextSession.title}</h2>
              <p className="mt-2 text-white/70">{nextSession.course.title}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <p className="text-sm text-white/65">{formatRange(nextSession.startTime, nextSession.endTime)}</p>
              <p className="mt-2 break-all text-sm font-semibold">{nextSession.meetingLink}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardContent className="grid gap-4 p-5 lg:grid-cols-[0.35fr_1fr_0.45fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-moss">{formatDay(session.startTime)}</p>
                <p className="mt-1 text-sm text-ink/55">{formatTime(session.startTime, session.endTime)}</p>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold">{session.title}</p>
                  <Badge>{session.status.toLowerCase()}</Badge>
                </div>
                <p className="mt-2 text-sm text-ink/65">{session.course.title} - {session.course.enrollments.length} enrolled learners</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link className="rounded-lg border border-ink/10 bg-cloud px-4 py-3 text-center text-sm font-semibold text-ink transition hover:bg-limewash focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800" href={`/mock-meet/${session.id}`}>
                  Open meeting
                </Link>
                <Link className="rounded-lg border border-ink/10 bg-white px-4 py-3 text-center text-sm font-semibold text-ink transition hover:bg-limewash focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800" href={`/trainer/sessions/${session.id}`}>
                  Details
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function formatTime(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function formatRange(start: Date, end: Date) {
  return `${formatDay(start)}, ${formatTime(start, end)}`;
}
