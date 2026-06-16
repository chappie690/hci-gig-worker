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

    if (user.role !== "ADMIN") {
      throw new ForbiddenError();
    }

    const { id } = await params;
    const existing = await prisma.course.findUnique({ where: { id }, select: { id: true } });

    if (!existing) {
      return NextResponse.json({ message: "Course not found." }, { status: 404 });
    }

    await prisma.course.delete({ where: { id } });

    return NextResponse.json({ message: "Course deleted." });
  } catch (error) {
    return handleRouteError(error);
  }
}
