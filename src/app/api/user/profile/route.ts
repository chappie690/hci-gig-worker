import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  fullName: z.string({ required_error: "Full name is required." }).trim().min(2, "Full name is required."),
  email: z.string({ required_error: "Email is required." }).trim().email("Enter a valid email address.")
});

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const body = profileSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Profile details are required.");
    }));
    const existing = await prisma.user.findUnique({ where: { email: body.email } });

    if (existing && existing.id !== user.id) {
      throw new ValidationError("That email address is already used by another account.");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: body.fullName,
        email: body.email
      },
      select: { id: true, fullName: true, email: true, role: true }
    });

    return NextResponse.json({ user: updated, message: "Profile updated." });
  } catch (error) {
    return handleRouteError(error);
  }
}
