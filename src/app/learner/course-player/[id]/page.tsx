import { notFound, redirect } from "next/navigation";
import { CoursePlayer } from "@/components/learner/course-player";
import { RoleShell } from "@/components/layout/role-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStockCourse } from "@/lib/stock-courses";

export default async function CoursePlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const enrollment = await prisma.enrollment.findFirst({
    where: { learnerId: user.id, courseId: id },
    include: { course: { include: { trainer: { include: { trainerProfile: true } } } } }
  });
  const stock = getStockCourse(id);

  if (!enrollment && !stock) {
    notFound();
  }

  const course = enrollment
    ? {
        id,
        title: enrollment.course.title,
        topic: enrollment.course.category,
        trainerName: enrollment.course.trainer.trainerProfile?.brandName ?? enrollment.course.trainer.fullName,
        description: enrollment.course.description,
        courseVideoUrl: enrollment.course.courseVideoUrl,
        progress: enrollment.progress,
        enrollmentId: enrollment.id,
        learnerName: user.fullName,
        learnerEmail: user.email
      }
    : {
        id,
        title: stock!.title,
        topic: stock!.topic,
        trainerName: stock!.trainerName,
        description: stock!.description,
        courseVideoUrl: null,
        progress: 0,
        enrollmentId: null,
        learnerName: user.fullName,
        learnerEmail: user.email
      };

  return (
    <RoleShell user={user} label="Learner workspace" title={course.title} activeHref="/learner/courses">
      <CoursePlayer course={course} />
    </RoleShell>
  );
}
