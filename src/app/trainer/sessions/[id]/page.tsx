import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TrainerSessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const session = await prisma.trainingSession.findFirst({
    where: { id, trainerId: user.id },
    include: {
      course: {
        include: {
          enrollments: {
            include: { learner: true },
            orderBy: { createdAt: "desc" }
          }
        }
      }
    }
  });

  if (!session) {
    notFound();
  }

  return (
    <AppShell user={user} title={session.title} subtitle="Trainer meeting room" activeHref="/trainer/sessions">
      <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Meeting details</p>
            <h2 className="mt-3 text-3xl font-black text-ink dark:text-slate-100">{session.title}</h2>
            <p className="mt-2 text-sm font-semibold text-moss">{session.course.title}</p>
          </div>
          <Badge className={statusClass(session.status)}>{session.status.toLowerCase()}</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Info label="Date and time" value={formatSessionTime(session.startTime, session.endTime)} />
          <Info label="Learners invited" value={String(session.course.enrollments.length)} />
          <Info label="Meeting status" value={session.status.toLowerCase()} />
        </div>

        <div className="mt-6 rounded-2xl border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/55 dark:text-slate-400">Meeting link</p>
          <a className="mt-2 block break-all text-sm font-bold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200" href={session.meetingLink} target="_blank" rel="noreferrer">
            {session.meetingLink}
          </a>
        </div>

        <div className="mt-6">
          <p className="text-sm font-bold text-ink dark:text-slate-100">Session video</p>
          {session.sessionVideoUrl ? (
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm dark:border-slate-700">
              <iframe
                className="aspect-video w-full"
                src={session.sessionVideoUrl}
                title={`${session.title} trainer session video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="mt-4 grid aspect-video place-items-center rounded-3xl border border-dashed border-slate-300 bg-slate-950 text-center text-white dark:border-slate-700">
              <div>
                <p className="text-xl font-black">No YouTube session video added yet.</p>
                <p className="mt-2 text-sm text-white/70">Use Scheduling to edit this session and add a YouTube link.</p>
              </div>
            </div>
          )}
        </div>

        <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-black text-ink dark:text-slate-100">Enrolled learners</h3>
          <div className="mt-3 grid gap-2">
            {session.course.enrollments.length ? session.course.enrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-xl bg-cloud p-3 dark:bg-slate-950">
                <p className="text-sm font-bold text-ink dark:text-slate-100">{enrollment.learner.fullName}</p>
                <p className="text-xs text-ink/55 dark:text-slate-400">{enrollment.learner.email} - {enrollment.progress}% complete</p>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-ink/20 p-4 text-sm text-ink/60 dark:border-slate-700 dark:text-slate-300">No learners enrolled in this course yet.</p>
            )}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/mock-meet/${session.id}`}>Open Meeting</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/trainer/scheduling">Edit in Scheduling</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/trainer/sessions">Back to sessions</Link>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/55 dark:text-slate-400">{label}</p>
      <p className="mt-2 font-black text-ink dark:text-slate-100">{value}</p>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200";
  }

  if (status === "CANCELLED") {
    return "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-200";
  }

  return "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200";
}

function formatSessionTime(start: Date, end: Date) {
  const date = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(start);
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  return `${date}, ${time.format(start)} - ${time.format(end)}`;
}
