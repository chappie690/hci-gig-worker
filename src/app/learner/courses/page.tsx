export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleShell } from "@/components/layout/role-shell";
import { LearnerCourseList } from "@/components/learner/learner-course-list";
import { LocalEnrolledCourses } from "@/components/learner/local-enrolled-courses";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockCourses } from "@/lib/stock-courses";

type SafeEnrollment = {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  course?: {
    title?: string;
    description?: string | null;
    trainer?: {
      fullName?: string | null;
      trainerProfile?: {
        brandName?: string | null;
      } | null;
    } | null;
    trainingSessions?: {
      startTime: Date | string;
    }[];
  } | null;
};

export default async function LearnerCoursesPage() {
  let user;

  try {
    user = await getCurrentUser();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to load current user:", error);
    }

    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  const enrollments = await getSafeEnrollments(user.id);

  return (
    <RoleShell
      user={user}
      label="Learner workspace"
      title="My courses"
      activeHref="/learner/courses"
    >
      <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss dark:text-emerald-300">
              Enrolled learning
            </p>

            <h2 className="mt-3 text-3xl font-black text-ink dark:text-slate-100">
              Keep shopping and studying separate.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65 dark:text-slate-300">
              These are the courses you already own. Continue lessons, check
              progress, and jump back into upcoming sessions.
            </p>
          </div>

          <Button asChild variant="secondary">
            <Link href="/learner/discover">Discover more courses</Link>
          </Button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <LearnerCourseList
          enrollments={enrollments.map((enrollment) => ({
            id: enrollment.id,
            courseId: enrollment.courseId,
            status: enrollment.status,
            progress: enrollment.progress,
            course: {
              title: enrollment.course?.title ?? "Untitled course",
              description: enrollment.course?.description ?? "Continue your learning journey with this SkillPilot AI course.",
              trainerName: enrollment.course?.trainer?.trainerProfile?.brandName ?? enrollment.course?.trainer?.fullName ?? "SkillPilot Trainer",
              nextSession: enrollment.course?.trainingSessions?.[0]?.startTime ? new Date(enrollment.course.trainingSessions[0].startTime).toISOString() : null
            }
          }))}
        />

        <LocalEnrolledCourses stockCourses={stockCourses} />
      </section>
    </RoleShell>
  );
}

async function getSafeEnrollments(learnerId: string): Promise<SafeEnrollment[]> {
  try {
    return await prisma.enrollment.findMany({
      where: { learnerId },
      include: {
        course: {
          include: {
            trainer: { include: { trainerProfile: true } },
            trainingSessions: {
              where: {
                status: "SCHEDULED",
                startTime: { gte: new Date() },
              },
              orderBy: { startTime: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Learner enrollments fallback used:", error);
    }

    return [];
  }
}
