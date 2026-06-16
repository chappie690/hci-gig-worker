import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleShell } from "@/components/layout/role-shell";
import { LocalEnrolledCourses } from "@/components/learner/local-enrolled-courses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockCourses } from "@/lib/stock-courses";

export default async function LearnerCoursesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { learnerId: user.id },
    include: {
      course: {
        include: {
          trainer: { include: { trainerProfile: true } },
          trainingSessions: {
            where: { status: "SCHEDULED", startTime: { gte: new Date() } },
            orderBy: { startTime: "asc" },
            take: 1
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <RoleShell user={user} label="Learner workspace" title="My courses" activeHref="/learner/courses">
      <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Enrolled learning</p>
            <h2 className="mt-3 text-3xl font-black text-ink">Keep shopping and studying separate.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
              These are the courses you already own. Continue lessons, check progress, and jump back into upcoming sessions.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/learner/discover">Discover more courses</Link>
          </Button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {enrollments.length ? (
          enrollments.map((enrollment, index) => (
            <article key={enrollment.id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge className={enrollment.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : undefined}>{enrollment.status.toLowerCase()}</Badge>
                  <h3 className="mt-3 text-xl font-bold text-ink">{enrollment.course.title}</h3>
                  <p className="mt-1 text-sm text-ink/55">{enrollment.course.trainer.trainerProfile?.brandName ?? enrollment.course.trainer.fullName}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{nextStep(index, enrollment.progress)}</span>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-ink/65">{enrollment.course.description}</p>
              <Progress className="mt-5 h-3" value={enrollment.progress} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink/55">{enrollment.progress}% complete</p>
                <div className="flex flex-wrap gap-2">
                  {enrollment.status === "COMPLETED" ? (
                    <Button asChild variant="secondary">
                      <Link href={`/learner/certificate/${enrollment.courseId}`}>View Certificate</Link>
                    </Button>
                  ) : null}
                  <Button asChild>
                    <Link href={`/learner/course-player/${enrollment.courseId}`}>Start / Do Course</Link>
                  </Button>
                </div>
              </div>
              {enrollment.course.trainingSessions[0] ? (
                <p className="mt-4 rounded-lg bg-cloud px-3 py-2 text-sm text-ink/65">
                  Next live session: {formatDate(enrollment.course.trainingSessions[0].startTime)}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-ink/10 bg-white p-8 text-center shadow-sm lg:col-span-2">
            <h3 className="text-xl font-bold text-ink">No enrolled courses yet</h3>
            <p className="mt-2 text-sm text-ink/60">Browse the catalog and use the mock AI Payment Agent checkout to add your first course.</p>
            <Button asChild className="mt-5">
              <Link href="/learner/discover">Discover courses</Link>
            </Button>
          </div>
        )}
        <LocalEnrolledCourses stockCourses={stockCourses} />
      </section>
    </RoleShell>
  );
}

function nextStep(index: number, progress: number) {
  if (progress >= 100) {
    return "Review mode";
  }

  return ["Next lesson: 8 mins", "15 mins left", "Quiz review: 10 mins"][index % 3];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
