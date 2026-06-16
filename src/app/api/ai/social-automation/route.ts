import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSocialAutomation } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  platform: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "EMAIL"]).default("INSTAGRAM"),
  content: z.string({ required_error: "Content context is required." }).trim().min(10, "Content context is required."),
  courseTitle: z.string().trim().optional(),
  trainerProfile: z.record(z.unknown()).optional()
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    assertRateLimit(`social-ai:${user.id}`);

    const body = schema.parse(await request.json().catch(() => {
      throw new ValidationError("Social automation context is required.");
    }));
    const profile = await prisma.trainerProfile.findUnique({
      where: { userId: user.id }
    });
    const result = await generateSocialAutomation({ ...body, trainerProfile: profile });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
