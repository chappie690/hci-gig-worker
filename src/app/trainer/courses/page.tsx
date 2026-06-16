import { redirect } from "next/navigation";
import { CourseManager } from "@/components/trainer/course-manager";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function TrainerCoursesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const courses = await prisma.course.findMany({
    where: { trainerId: user.id },
    include: {
      enrollments: {
        include: { learner: true }
      },
      payments: true,
      trainingSessions: true
    },
    orderBy: { createdAt: "desc" }
  });

  const published = courses.filter((course) => course.status === "PUBLISHED").length;
  const revenue = courses.flatMap((course) => course.payments).filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + payment.amount, 0);
  const learners = courses.reduce((sum, course) => sum + course.enrollments.length, 0);

  return (
    <AppShell user={user} title="Courses" subtitle="Micro-course publishing" activeHref="/trainer/courses">
      <PageSection
        eyebrow="Course studio"
        title="Manage your AI micro-courses"
        description="Create, edit, publish, unpublish, delete, and inspect learner enrollment from a database-backed course workspace."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Published" value={published} detail="Live course offers" />
        <Metric label="Enrollments" value={learners} detail="Across all courses" />
        <Metric label="Revenue" value={formatCurrency(revenue)} detail="Paid course receipts" />
      </section>

      <div className="mt-6">
        <CourseManager
          trainer={{ fullName: user.fullName, email: user.email }}
          courses={courses.map((course) => ({
            id: course.id,
            title: course.title,
            description: course.description,
            category: course.category,
            level: course.level,
            price: course.price,
            duration: course.duration,
            thumbnailUrl: course.thumbnailUrl,
            courseVideoUrl: course.courseVideoUrl,
            discountActive: course.discountActive,
            discountPercent: course.discountPercent,
            discountLabel: course.discountLabel,
            status: course.status,
            revenue: course.payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + payment.amount, 0),
            learners: course.enrollments.map((enrollment) => ({
              id: enrollment.learner.id,
              fullName: enrollment.learner.fullName,
              email: enrollment.learner.email,
              progress: enrollment.progress,
              status: enrollment.status
            }))
          }))}
        />
      </div>
    </AppShell>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-ink/55">{label}</p>
        <p className="mt-2 text-3xl font-bold">{value}</p>
        <p className="mt-1 text-sm text-ink/55">{detail}</p>
      </CardContent>
    </Card>
  );
}
