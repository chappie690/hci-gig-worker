import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionCookie, getRoleDashboardPath } from "@/lib/auth";
import { handleRouteError, ValidationError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  fullName: z.string({ required_error: "Full name is required." }).trim().min(2, "Full name is required."),
  email: z.string({ required_error: "Email is required." }).trim().email("Enter a valid email address."),
  password: z.string({ required_error: "Password is required." }).min(8, "Password must be at least 8 characters."),
  role: z.enum(["LEARNER", "TRAINER"], {
    required_error: "Choose Learner or Trainer."
  })
});

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Full name, email, password, and role are required.");
    }));
    const existing = await prisma.user.findUnique({ where: { email: body.email } });

    if (existing) {
      throw new ValidationError("An account with this email already exists.");
    }

    const user = await prisma.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        role: body.role,
        trainerProfile:
          body.role === "TRAINER"
            ? {
                create: {
                  brandName: `${body.fullName} AI Training`,
                  tagline: "Independent AI trainer",
                  bio: "Building an AI training brand with SkillPilot AI.",
                  skills: "AI training, course design, learner coaching",
                  portfolioSummary: "New SkillPilot AI trainer profile.",
                  logoPrompt: "Modern AI trainer logo with clean geometric shapes.",
                  socialLinks: "{}"
                }
              }
            : undefined
      }
    });

    const redirectTo = getRoleDashboardPath(user.role);
    const response = NextResponse.json(
      { redirectTo, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } },
      { status: 201 }
    );
    await createSessionCookie(response, { id: user.id, role: user.role });
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
