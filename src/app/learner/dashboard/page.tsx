import { redirect } from "next/navigation";
import { LearnerDashboardExperience } from "@/components/learner/learner-dashboard-experience";
import { RoleShell } from "@/components/layout/role-shell";
import { getCurrentUser } from "@/lib/auth";
import { calculateFinalAmount } from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { stockCourses } from "@/lib/stock-courses";

export default async function LearnerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [enrollments, payments, notifications, sessions] = await Promise.all([
    prisma.enrollment.findMany({
      where: { learnerId: user.id },
      include: { course: { include: { trainer: { include: { trainerProfile: true } } } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.payment.findMany({
      where: { learnerId: user.id },
      include: { course: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.trainingSession.findMany({
      where: {
        status: "SCHEDULED",
        startTime: { gte: new Date() },
        course: {
          enrollments: {
            some: { learnerId: user.id }
          }
        }
      },
      include: { course: { include: { trainer: true } } },
      orderBy: { startTime: "asc" },
      take: 5
    })
  ]);
  const enrolledCourseIds = enrollments.map((enrollment) => enrollment.courseId);
  const marketplaceCourses = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      ...(enrolledCourseIds.length ? { id: { notIn: enrolledCourseIds } } : {})
    },
    include: {
      enrollments: true,
      trainer: { include: { trainerProfile: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 2
  });
  const mappedMarketplaceCourses = marketplaceCourses.map((course, index) => {
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
      enrolled: false
    };
  });
  const mappedStockCourses = stockCourses.map((course) => ({
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
  }));

  return (
    <RoleShell user={user} label="Learner workspace" title="My learning dashboard" activeHref="/learner/dashboard">
      <LearnerDashboardExperience
        userName={user.fullName}
        userEmail={user.email}
        enrollments={enrollments.map((enrollment) => ({
          id: enrollment.id,
          courseId: enrollment.courseId,
          progress: enrollment.progress,
          status: enrollment.status,
          course: {
            title: enrollment.course.title,
            duration: enrollment.course.duration,
            trainerName: enrollment.course.trainer.trainerProfile?.brandName ?? enrollment.course.trainer.fullName
          }
        }))}
        notifications={notifications.map((notification) => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          isRead: notification.isRead
        }))}
        sessions={sessions.map((session) => ({
          id: session.id,
          title: session.title,
          courseTitle: session.course.title,
          startTime: session.startTime.toISOString(),
          status: session.status
        }))}
        payments={payments.map((payment) => ({
          id: payment.id,
          receiptNumber: payment.receiptNumber,
          courseTitle: payment.course.title,
          amount: payment.amount,
          status: payment.status
        }))}
        recommendedCourses={mappedMarketplaceCourses.slice(0, 2)}
        recommendationCourses={[...mappedMarketplaceCourses, ...mappedStockCourses]}
      />
    </RoleShell>
  );
}
