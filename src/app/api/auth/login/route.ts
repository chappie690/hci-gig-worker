import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/password";
import { createSessionCookie, getRoleDashboardPath } from "@/lib/auth";
import { handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";

const loginSchema = z.object({
  email: z.string({ required_error: "Email is required." }).trim().email("Enter a valid email address."),
  password: z.string({ required_error: "Password is required." }).min(1, "Password is required.")
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Email and password are required.");
    }));
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user || !(await comparePassword(body.password, user.passwordHash))) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const redirectTo = getRoleDashboardPath(user.role);
    const response = NextResponse.json({
      redirectTo,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role }
    });
    await createSessionCookie(response, { id: user.id, role: user.role });
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
