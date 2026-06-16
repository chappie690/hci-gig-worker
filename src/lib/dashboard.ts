import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

export async function getDashboardData(userId: string) {
  const [courses, enrollments, sessions, payments] = await Promise.all([
    prisma.course.findMany({
      where: { trainerId: userId },
      include: {
        enrollments: true,
        payments: true,
        trainingSessions: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.enrollment.findMany({
      where: { course: { trainerId: userId } },
      include: { learner: true, course: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.trainingSession.findMany({
      where: { trainerId: userId, startTime: { gte: new Date() } },
      include: { course: true },
      orderBy: { startTime: "asc" },
      take: 5
    }),
    prisma.payment.findMany({
      where: { course: { trainerId: userId } },
      include: { learner: true, course: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const paidRevenue = payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + payment.amount, 0);
  const learnerMap = new Map(enrollments.map((enrollment) => [enrollment.learnerId, enrollment.learner]));
  const activeLearners = enrollments.filter((enrollment) => enrollment.status === "ACTIVE").length;
  const publishedCourses = courses.filter((course) => course.status === "PUBLISHED").length;

  return {
    metrics: {
      revenue: formatCurrency(paidRevenue),
      learners: learnerMap.size,
      courses: courses.length,
      sessions: sessions.length
    },
    milestoneStats: {
      revenue: paidRevenue,
      monthRevenue: paidRevenue,
      activeLearners,
      publishedCourses,
      fiveStarReviews: Math.min(5, Math.max(0, publishedCourses - 1))
    },
    chart: courses.slice(0, 6).map((course) => ({
      name: course.title.length > 18 ? `${course.title.slice(0, 18)}...` : course.title,
      revenue: course.payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + payment.amount, 0),
      learners: course.enrollments.length
    })),
    courses: courses.slice(0, 5),
    learners: Array.from(learnerMap.values()).slice(0, 5),
    sessions,
    recentPayments: payments.slice(0, 8).map((payment) => ({
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      learnerName: payment.learner.fullName,
      courseTitle: payment.course.title,
      amount: payment.amount,
      status: payment.status,
      paymentMethod: payment.paymentMethod
    })),
    payments: payments.slice(0, 5).map((payment) => ({
      id: payment.id,
      description: payment.course.title,
      learnerName: payment.learner.fullName,
      amount: payment.amount,
      status: payment.status
    }))
  };
}
