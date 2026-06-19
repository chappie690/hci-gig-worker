import { NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { isStrongPassword, strongPasswordMessage } from "@/lib/password-rules";
import { prisma } from "@/lib/prisma";

const mockResetCode = "123456";

const resetPasswordSchema = z.object({
  email: z.string({ required_error: "Email is required." }).trim().email("Enter a valid email address."),
  code: z.string({ required_error: "Reset code is required." }).trim().length(6, "Enter the 6 digit reset code."),
  password: z.string({ required_error: "New password is required." }).refine(isStrongPassword, strongPasswordMessage())
});

export async function POST(request: Request) {
  try {
    const body = resetPasswordSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Email, reset code, and new password are required.");
    }));

    if (body.code !== mockResetCode) {
      throw new ValidationError("That reset code does not match. Use the mock code 123456.");
    }

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true }
    });

    if (!user) {
      throw new ValidationError("No account was found with this email.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.password) }
    });

    const response = NextResponse.json({
      success: true,
      message: "Password reset successful. Please sign in with your new password."
    });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.errors[0]?.message ?? "Please check the submitted details." }, { status: 400 });
    }

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }

    return NextResponse.json({ success: false, message: "Password reset could not be completed. Please try again." }, { status: 500 });
  }
}
