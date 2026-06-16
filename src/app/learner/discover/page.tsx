import { redirect } from "next/navigation";
import { CoursePurchasePanel } from "@/components/learner/course-purchase-panel";
import { RoleShell } from "@/components/layout/role-shell";
import { getCurrentUser } from "@/lib/auth";
import { calculateFinalAmount } from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { stockCourses } from "@/lib/stock-courses";

export default async function LearnerDiscoverPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
        enrollments: true,
        trainer: { include: { trainerProfile: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.enrollment.findMany({
      where: { learnerId: user.id },
      select: { courseId: true }
    })
  ]);
  const enrolledIds = new Set(enrollments.map((enrollment) => enrollment.courseId));

  return (
    <RoleShell user={user} label="Learner workspace" title="Discover courses" activeHref="/learner/discover">
      <section className="rounded-3xl border border-ink/10 bg-[linear-gradient(135deg,#eff6ff,#ffffff_48%,#f5f3ff)] p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Course catalog</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black text-ink">Find your next practical AI skill without mixing shopping into your learning dashboard.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
          Preview trainer-led micro-courses, compare pricing, and use the AI Payment Agent checkout panel when you are ready.
        </p>
      </section>

      <section className="mt-6">
        <CoursePurchasePanel
          learnerName={user.fullName}
          learnerEmail={user.email}
          courses={[
            ...courses.map((course, index) => {
              const totals = calculateFinalAmount(course);

              return {
                id: course.id,
                title: course.title,
                description: course.description,
                trainerName: course.trainer.trainerProfile?.brandName ?? course.trainer.fullName,
                trainerEmail: course.trainer.email,
                category: course.category,
                level: course.level,
                duration: course.duration,
                rating: (4.9 - (index % 3) * 0.1).toFixed(1),
                topic: course.category,
                originalAmount: totals.originalAmount,
                discountLabel: totals.discount.label,
                discountAmount: totals.discount.amount,
                finalAmount: totals.finalAmount,
                enrolled: enrolledIds.has(course.id)
              };
            }),
            ...stockCourses.map((course) => ({
              id: course.id,
              title: course.title,
              description: course.description,
              trainerName: course.trainerName,
              category: course.category,
              level: course.level,
              duration: course.duration,
              rating: course.rating,
              topic: course.topic,
              originalAmount: course.originalPrice,
              discountLabel: course.discountLabel,
              discountAmount: course.discountActive ? course.originalPrice - course.discountedPrice : 0,
              finalAmount: course.discountActive ? course.discountedPrice : course.originalPrice,
              enrolled: false
            }))
          ]}
        />
      </section>
    </RoleShell>
  );
}
