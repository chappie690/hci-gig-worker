import { NextResponse } from "next/server";
import { z } from "zod";
import { ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const checkEmailSchema = z.object({
  email: z.string({ required_error: "Email is required." }).trim().email("Enter a valid email address.")
});

export async function POST(request: Request) {
  try {
    const body = checkEmailSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Email is required.");
    }));
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ exists: false, message: "No account was found with this email." }, { status: 404 });
    }

    return NextResponse.json({
      exists: true,
      message: "A mock reset code has been sent to your email."
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ exists: false, message: error.errors[0]?.message ?? "Enter a valid email address." }, { status: 400 });
    }

    if (error instanceof ValidationError) {
      return NextResponse.json({ exists: false, message: error.message }, { status: error.status });
    }

    return NextResponse.json({ exists: false, message: "No account was found with this email." }, { status: 503 });
  }
}
