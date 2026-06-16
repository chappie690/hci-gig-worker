import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const progressSchema = z.object({
  progress: z.number().min(0).max(100)
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "LEARNER") {
      throw new ForbiddenError();
    }

    const { id } = await params;
    const body = progressSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Progress value is required.");
    }));

    const enrollment = await prisma.enrollment.findFirst({
      where: { id, learnerId: user.id }
    });

    if (!enrollment) {
      return NextResponse.json({ message: "Enrollment not found." }, { status: 404 });
    }

    const progress = Math.round(body.progress);
    const updated = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progress,
        status: progress >= 100 ? "COMPLETED" : "ACTIVE"
      },
      select: { id: true, progress: true, status: true }
    });

    return NextResponse.json({ enrollment: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
