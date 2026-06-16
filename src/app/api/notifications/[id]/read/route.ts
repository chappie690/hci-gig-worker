import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const { id } = await params;
    const notification = await prisma.notification.findFirst({
      where: { id, userId: user.id }
    });

    if (!notification) {
      return NextResponse.json({ message: "Notification not found." }, { status: 404 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
      select: { id: true, isRead: true }
    });

    return NextResponse.json({ notification: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
