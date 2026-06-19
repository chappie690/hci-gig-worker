import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "LEARNER") {
      throw new ForbiddenError();
    }

    const { id } = await params;
    const enrollment = await prisma.enrollment.findFirst({
      where: { id, learnerId: user.id },
      include: { course: true }
    });

    if (!enrollment) {
      return NextResponse.json({ message: "Enrollment not found." }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.enrollment.delete({
        where: { id: enrollment.id }
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          title: "Course unenrolled",
          message: `You unenrolled from ${enrollment.course.title}. The course remains available in the public catalog.`,
          type: "ENROLLMENT_CANCELLED"
        }
      })
    ]);

    return NextResponse.json({
      message: `You unenrolled from ${enrollment.course.title}.`,
      enrollmentId: enrollment.id,
      courseId: enrollment.courseId
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
