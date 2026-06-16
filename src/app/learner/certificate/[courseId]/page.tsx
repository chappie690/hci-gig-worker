import { notFound, redirect } from "next/navigation";
import { CertificateViewer } from "@/components/learner/certificate-viewer";
import { RoleShell } from "@/components/layout/role-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStockCourse } from "@/lib/stock-courses";

export default async function LearnerCertificatePage({ params }: { params: Promise<{ courseId: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { courseId } = await params;
  const enrollment = await prisma.enrollment.findFirst({
    where: { learnerId: user.id, courseId },
    include: { course: { include: { trainer: { include: { trainerProfile: true } } } } }
  });
  const stockCourse = getStockCourse(courseId);

  if (!enrollment && !stockCourse) {
    notFound();
  }

  const course = enrollment
    ? {
        id: enrollment.course.id,
        title: enrollment.course.title,
        trainerName: enrollment.course.trainer.trainerProfile?.brandName ?? enrollment.course.trainer.fullName,
        trainerEmail: enrollment.course.trainer.email
      }
    : {
        id: stockCourse!.id,
        title: stockCourse!.title,
        trainerName: stockCourse!.trainerName
      };

  return (
    <RoleShell user={user} label="Learner workspace" title="Course certificate" activeHref="/learner/courses">
      <CertificateViewer course={course} learner={{ fullName: user.fullName, email: user.email }} />
    </RoleShell>
  );
}
