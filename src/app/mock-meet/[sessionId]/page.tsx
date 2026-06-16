import { notFound, redirect } from "next/navigation";
import { MockMeetRoom } from "@/components/sessions/mock-meet-room";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MockMeetPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { sessionId } = await params;
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      course: {
        include: {
          trainer: {
            include: { trainerProfile: true }
          },
          enrollments: {
            select: { learnerId: true }
          }
        }
      }
    }
  });

  if (!session) {
    notFound();
  }

  const isTrainer = session.trainerId === user.id;
  const isEnrolledLearner = session.course.enrollments.some((enrollment) => enrollment.learnerId === user.id);

  if (!isTrainer && !isEnrolledLearner) {
    notFound();
  }

  return (
    <MockMeetRoom
      session={{
        id: session.id,
        title: session.title,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
        sessionVideoUrl: session.sessionVideoUrl,
        status: session.status,
        learnerCount: session.course.enrollments.length,
        courseTitle: session.course.title,
        trainerName: session.course.trainer.trainerProfile?.brandName ?? session.course.trainer.fullName,
        returnHref: isTrainer ? "/trainer/sessions" : "/learner/sessions"
      }}
    />
  );
}
