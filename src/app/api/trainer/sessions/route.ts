import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { trainingSessionSchema } from "@/lib/session-validation";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    const body = trainingSessionSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Training session fields are required.");
    }));
    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new ValidationError("Choose valid session times.");
    }

    if (endTime <= startTime) {
      throw new ValidationError("End time must be after start time.");
    }

    const course = await prisma.course.findFirst({
      where: {
        id: body.courseId,
        trainerId: user.id
      },
      include: {
        enrollments: {
          select: { learnerId: true }
        }
      }
    });

    if (!course) {
      throw new ValidationError("Select one of your courses.");
    }

    const [session] = await prisma.$transaction([
      prisma.trainingSession.create({
        data: {
          trainerId: user.id,
          courseId: course.id,
          title: body.title,
          startTime,
          endTime,
          meetingLink: body.meetingLink,
          sessionVideoUrl: body.sessionVideoUrl,
          status: "SCHEDULED"
        },
        include: { course: { include: { enrollments: true } } }
      }),
      prisma.automationTask.create({
        data: {
          trainerId: user.id,
          type: "SESSION_REMINDER",
          title: `Session reminder: ${body.title}`,
          description: `Send learner reminders for ${course.title} before the live training session.`,
          status: "PENDING",
          scheduledAt: startTime
        }
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          title: "Training session scheduled",
          message: `${body.title} for ${course.title} is scheduled for ${startTime.toLocaleString()}.`,
          type: "SESSION_REMINDER"
        }
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          title: "Upcoming session reminder created",
          message: `SkillPilot will surface a reminder for ${body.title} before ${startTime.toLocaleString()}.`,
          type: "SESSION_REMINDER"
        }
      }),
      ...course.enrollments.map((enrollment) =>
        prisma.notification.create({
          data: {
            userId: enrollment.learnerId,
            title: "New training session scheduled",
            message: `${body.title} for ${course.title} is scheduled for ${startTime.toLocaleString()}.`,
            type: "SESSION_REMINDER"
          }
        })
      ),
      ...course.enrollments.map((enrollment) =>
        prisma.notification.create({
          data: {
            userId: enrollment.learnerId,
            title: "Upcoming session reminder",
            message: `Reminder saved: ${body.title} for ${course.title} starts on ${startTime.toLocaleString()}.`,
            type: "SESSION_REMINDER"
          }
        })
      )
    ]);

    return NextResponse.json({
      session: {
        ...session,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
        createdAt: session.createdAt.toISOString()
      },
      message: "Training session created, learners notified, and reminder automation scheduled."
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
