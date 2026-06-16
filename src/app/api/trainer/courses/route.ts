import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { courseSchema } from "@/lib/course-validation";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    const body = courseSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Course fields are required.");
    }));

    const [course] = await prisma.$transaction([
      prisma.course.create({
        data: {
          ...body,
          trainerId: user.id
        }
      }),
      ...(body.status === "PUBLISHED"
        ? [
            prisma.notification.create({
              data: {
                userId: user.id,
                title: "Course published",
                message: `${body.title} is now live in the learner catalog.`,
                type: "COURSE_PUBLISHING"
              }
            }),
            prisma.automationTask.create({
              data: {
                trainerId: user.id,
                type: "COURSE_PUBLISHING",
                title: `Publish course: ${body.title}`,
                description: `${body.title} was created and published from the trainer course studio.`,
                status: "COMPLETED",
                scheduledAt: new Date()
              }
            })
          ]
        : [])
    ]);

    return NextResponse.json({ course, message: "Course created." }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
