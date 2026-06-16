import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    await ensureReminderNotifications(user.id, user.role);

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return NextResponse.json({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        actionHref: actionHref(notification.type, user.role)
      }))
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function ensureReminderNotifications(userId: string, role: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  if (role === "TRAINER") {
    const sessions = await prisma.trainingSession.findMany({
      where: { trainerId: userId, status: "SCHEDULED", startTime: { gte: now, lte: soon } },
      include: { course: true },
      take: 5
    });

    await Promise.all(sessions.map((session) => ensureNotification({
      userId,
      type: `SESSION_UPCOMING_${session.id}`,
      title: "Upcoming training session",
      message: `${session.title} for ${session.course.title} starts ${formatDate(session.startTime)}.`
    })));
    return;
  }

  if (role === "LEARNER") {
    const [sessions, enrollments] = await Promise.all([
      prisma.trainingSession.findMany({
        where: {
          status: "SCHEDULED",
          startTime: { gte: now, lte: soon },
          course: { enrollments: { some: { learnerId: userId } } }
        },
        include: { course: true },
        take: 5
      }),
      prisma.enrollment.findMany({
        where: { learnerId: userId, status: "ACTIVE", progress: { lt: 100 } },
        include: { course: true },
        take: 5
      })
    ]);

    await Promise.all([
      ...sessions.map((session) => ensureNotification({
        userId,
        type: `SESSION_UPCOMING_${session.id}`,
        title: "Upcoming meeting reminder",
        message: `${session.title} for ${session.course.title} starts ${formatDate(session.startTime)}.`
      })),
      ...enrollments.map((enrollment) => ensureNotification({
        userId,
        type: `COURSE_DEADLINE_${enrollment.courseId}`,
        title: "Course deadline approaching",
        message: `${enrollment.course.title} is still in progress at ${enrollment.progress}%. Continue learning to stay on track.`
      }))
    ]);
  }
}

async function ensureNotification(data: { userId: string; title: string; message: string; type: string }) {
  const existing = await prisma.notification.findFirst({
    where: { userId: data.userId, type: data.type }
  });

  if (existing) {
    return existing;
  }

  return prisma.notification.create({ data });
}

function actionHref(type: string, role: string) {
  if (role === "TRAINER") {
    if (type.includes("SESSION")) return "/trainer/scheduling";
    if (type.includes("ENROLLMENT")) return "/trainer/learners";
    return "/trainer/dashboard";
  }

  if (type.includes("SESSION")) return "/learner/sessions";
  if (type.includes("COURSE") || type.includes("ENROLLMENT")) return "/learner/courses";
  if (type.includes("PAYMENT")) return "/learner/dashboard";
  return undefined;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
