import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { normalizeSessionInput, trainingSessionShape } from "@/lib/session-validation";
import { toYouTubeEmbedUrl } from "@/lib/youtube";

const sessionUpdateSchema = trainingSessionShape.partial().extend({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional()
}).superRefine((data, context) => {
  if (data.sessionVideoUrl?.trim() && !toYouTubeEmbedUrl(data.sessionVideoUrl)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sessionVideoUrl"],
      message: "Enter a valid YouTube session video link."
    });
  }
}).transform(normalizeSessionInput);

function serializeSession(session: {
  id: string;
  trainerId: string;
  courseId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  meetingLink: string;
  sessionVideoUrl: string | null;
  status: string;
  createdAt: Date;
  course: { title: string; enrollments: Array<{ learnerId: string }> };
}) {
  return {
    ...session,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    createdAt: session.createdAt.toISOString()
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    const { id } = await params;
    const existing = await prisma.trainingSession.findFirst({
      where: { id, trainerId: user.id },
      include: { course: { include: { enrollments: { select: { learnerId: true } } } } }
    });

    if (!existing) {
      return NextResponse.json({ message: "Training session not found." }, { status: 404 });
    }

    const body = sessionUpdateSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Training session update fields are required.");
    }));
    const startTime = body.startTime ? new Date(body.startTime) : undefined;
    const endTime = body.endTime ? new Date(body.endTime) : undefined;
    const finalStart = startTime ?? existing.startTime;
    const finalEnd = endTime ?? existing.endTime;

    if ((startTime && Number.isNaN(startTime.getTime())) || (endTime && Number.isNaN(endTime.getTime()))) {
      throw new ValidationError("Choose valid session times.");
    }

    if (finalEnd <= finalStart) {
      throw new ValidationError("End time must be after start time.");
    }

    let courseId = body.courseId;
    let notificationCourseTitle = existing.course.title;
    let learnerIds = existing.course.enrollments.map((enrollment) => enrollment.learnerId);

    if (courseId && courseId !== existing.courseId) {
      const course = await prisma.course.findFirst({
        where: { id: courseId, trainerId: user.id },
        include: { enrollments: { select: { learnerId: true } } }
      });

      if (!course) {
        throw new ValidationError("Select one of your courses.");
      }

      notificationCourseTitle = course.title;
      learnerIds = course.enrollments.map((enrollment) => enrollment.learnerId);
    } else {
      courseId = undefined;
    }

    const notificationMessage = body.status === "CANCELLED"
      ? `${body.title ?? existing.title} for ${notificationCourseTitle} was cancelled.`
      : body.status === "COMPLETED"
        ? `${body.title ?? existing.title} for ${notificationCourseTitle} was marked completed.`
        : `${body.title ?? existing.title} for ${notificationCourseTitle} was updated.`;

    const [session] = await prisma.$transaction([
      prisma.trainingSession.update({
        where: { id },
        data: {
          courseId,
          title: body.title,
          startTime,
          endTime,
          meetingLink: body.meetingLink,
          sessionVideoUrl: body.sessionVideoUrl,
          status: body.status
        },
        include: { course: { include: { enrollments: { select: { learnerId: true } } } } }
      }),
      ...learnerIds.map((learnerId) =>
        prisma.notification.create({
          data: {
            userId: learnerId,
            title: "Training session updated",
            message: notificationMessage,
            type: "SESSION_UPDATE"
          }
        })
      )
    ]);

    return NextResponse.json({ session: serializeSession(session), message: "Training session updated." });
  } catch (error) {
    return handleRouteError(error);
  }
}
