import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RoleShell } from "@/components/layout/role-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SessionWatchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const session = await prisma.trainingSession.findFirst({
    where: {
      id,
      course: { enrollments: { some: { learnerId: user.id } } }
    },
    include: { course: { include: { trainer: { include: { trainerProfile: true } } } } }
  });

  if (!session) {
    notFound();
  }

  return (
    <RoleShell user={user} label="Learner workspace" title={session.title} activeHref="/learner/sessions">
      <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Mock video session</p>
        <h2 className="mt-3 text-3xl font-black text-ink dark:text-slate-100">{session.title}</h2>
        <p className="mt-2 text-sm font-semibold text-moss">{session.course.title}</p>
        <p className="mt-2 text-sm text-ink/60 dark:text-slate-300">Trainer: {session.course.trainer.trainerProfile?.brandName ?? session.course.trainer.fullName}</p>
        <p className="mt-2 text-sm text-ink/60 dark:text-slate-300">{formatSessionTime(session.startTime, session.endTime)}</p>
        {session.sessionVideoUrl ? (
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm dark:border-slate-700">
            <iframe
              className="aspect-video w-full"
              src={session.sessionVideoUrl}
              title={`${session.title} YouTube session video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="mt-6 grid aspect-video place-items-center rounded-3xl bg-slate-950 text-white">
            <div className="text-center">
              <p className="text-xl font-black">Live training video placeholder</p>
              <p className="mt-2 text-sm text-white/70">{session.meetingLink}</p>
            </div>
          </div>
        )}
        <div className="mt-6">
          <p className="text-sm font-semibold text-ink/60 dark:text-slate-300">Watch progress</p>
          <Progress className="mt-2 h-3" value={64} />
        </div>
        <Button asChild className="mt-6" variant="secondary">
          <Link href="/learner/sessions">Return to sessions</Link>
        </Button>
      </section>
    </RoleShell>
  );
}

function formatSessionTime(start: Date, end: Date) {
  const date = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(start);
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  return `${date}, ${time.format(start)} - ${time.format(end)}`;
}
