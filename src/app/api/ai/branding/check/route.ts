import { NextResponse } from "next/server";
import { z } from "zod";
import { checkBrandConsistency } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  text: z.string({ required_error: "Paste brand copy to check." }).trim().min(10, "Paste at least 10 characters to check."),
  brandKit: z.record(z.unknown()).optional().default({})
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

    assertRateLimit(`branding-check:${user.id}`);

    const body = schema.parse(await request.json().catch(() => {
      throw new ValidationError("Brand copy is required.");
    }));
    const profile = await prisma.trainerProfile.findUnique({
      where: { userId: user.id }
    });
    const result = await checkBrandConsistency({
      text: body.text,
      brandKit: body.brandKit,
      trainerProfile: profile
    });

    return NextResponse.json({
      source: result.source,
      message: result.message,
      ...result.check
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
