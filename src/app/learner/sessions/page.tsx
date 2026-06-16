import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleShell } from "@/components/layout/role-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LearnerSessionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const sessions = await prisma.trainingSession.findMany({
    where: {
      course: {
        enrollments: {
          some: { learnerId: user.id }
        }
      }
    },
    include: {
      course: {
        include: {
          trainer: {
            include: { trainerProfile: true }
          }
        }
      }
    },
    orderBy: { startTime: "asc" }
  });

  const upcoming = sessions.filter((session) => session.status === "SCHEDULED" && session.startTime >= new Date());
  const completed = sessions.filter((session) => session.status === "COMPLETED").length;
  const cancelled = sessions.filter((session) => session.status === "CANCELLED").length;

  return (
    <RoleShell user={user} label="Learner workspace" title="My training sessions" activeHref="/learner/sessions">
      <section className="mb-6 border-b border-ink/10 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Smart Scheduling</p>
        <h2 className="mt-1 text-2xl font-bold text-ink">Upcoming live sessions for your enrolled courses</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
          View session status, course context, trainer details, and meeting links from one learner calendar.
        </p>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Metric label="Upcoming" value={String(upcoming.length)} />
        <Metric label="Completed" value={String(completed)} />
        <Metric label="Cancelled" value={String(cancelled)} />
      </section>

      <section className="grid gap-4">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardContent className="grid gap-5 p-5 lg:grid-cols-[0.24fr_1fr_0.35fr] lg:items-start">
              <div className="rounded-lg bg-cloud p-4 text-center">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-moss">{formatMonth(session.startTime)}</p>
                <p className="mt-2 text-4xl font-bold text-ink">{formatDay(session.startTime)}</p>
                <p className="mt-1 text-sm text-ink/55">{formatTimeRange(session.startTime, session.endTime)}</p>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-ink">{session.title}</h3>
                  <Badge className={statusClass(session.status)}>{session.status.toLowerCase()}</Badge>
                </div>
                <p className="mt-2 text-sm font-semibold text-moss">{session.course.title}</p>
                <p className="mt-2 text-sm text-ink/65">
                  Trainer: {session.course.trainer.trainerProfile?.brandName ?? session.course.trainer.fullName}
                </p>
                <p className="mt-3 break-all rounded-lg border border-ink/10 bg-cloud px-3 py-2 text-sm font-semibold text-ink">
                  {session.meetingLink}
                </p>
                <p className="mt-2 text-xs font-semibold text-ink/55">
                  {session.sessionVideoUrl ? "YouTube session video available" : "Mock video placeholder will be shown"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button asChild variant="secondary">
                  <Link href={`/learner/course-player/${session.courseId}`}>Start / Do course</Link>
                </Button>
                <Button asChild>
                  <Link href={`/mock-meet/${session.id}`}>Join session</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink/20 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-ink">No sessions yet.</p>
            <p className="mt-2 text-sm text-ink/60">Training sessions for your enrolled courses will appear here when your trainer schedules them.</p>
          </div>
        ) : null}
      </section>
    </RoleShell>
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

function statusClass(status: string) {
  if (status === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "CANCELLED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(date);
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date);
}

function formatTimeRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}
