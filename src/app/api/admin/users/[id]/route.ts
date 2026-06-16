import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
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

    if (id === user.id) {
      throw new ValidationError("You cannot delete your own admin account.");
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });

    if (!existing) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "User deleted." });
  } catch (error) {
    return handleRouteError(error);
  }
}
