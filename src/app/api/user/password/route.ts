import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { comparePassword, hashPassword } from "@/lib/password";
import { isStrongPassword, strongPasswordMessage } from "@/lib/password-rules";
import { prisma } from "@/lib/prisma";

const passwordSchema = z.object({
  currentPassword: z.string({ required_error: "Current password is required." }).min(1, "Current password is required."),
  newPassword: z.string({ required_error: "New password is required." }).refine(isStrongPassword, strongPasswordMessage())
});

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getCurrentUser();

    if (!sessionUser) {
      throw new UnauthorizedError();
    }

    const body = passwordSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Current password and new password are required.");
    }));
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, passwordHash: true }
    });

    if (!user) {
      throw new UnauthorizedError();
    }

    const currentMatches = await comparePassword(body.currentPassword, user.passwordHash);

    if (!currentMatches) {
      throw new ValidationError("Current password is incorrect.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.newPassword) }
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully."
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
