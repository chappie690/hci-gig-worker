import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { courseUpdateSchema } from "@/lib/course-validation";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

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
    const existing = await prisma.course.findFirst({
      where: { id, trainerId: user.id }
    });

    if (!existing) {
      return NextResponse.json({ message: "Course not found." }, { status: 404 });
    }

    const body = courseUpdateSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Course update fields are required.");
    }));

    const publishingCourse = body.status === "PUBLISHED" && existing.status !== "PUBLISHED";
    const [course] = await prisma.$transaction([
      prisma.course.update({
        where: { id },
        data: body
      }),
      ...(publishingCourse
        ? [
            prisma.automationTask.create({
              data: {
                trainerId: user.id,
                type: "COURSE_PUBLISHING",
                title: `Publish course: ${existing.title}`,
                description: `Course publishing workflow created when ${existing.title} moved from draft to published.`,
                status: "COMPLETED",
                scheduledAt: new Date()
              }
            })
          ]
        : [])
    ]);

    return NextResponse.json({ course, message: "Course updated." });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    const { id } = await params;
    const existing = await prisma.course.findFirst({
      where: { id, trainerId: user.id }
    });

    if (!existing) {
      return NextResponse.json({ message: "Course not found." }, { status: 404 });
    }

    await prisma.course.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Course deleted." });
  } catch (error) {
    return handleRouteError(error);
  }
}
