import { NextResponse } from "next/server";
import { generateBranding } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { brandingInputSchema } from "@/lib/profile-validation";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    assertRateLimit(`branding:${user.id}`);

    const body = brandingInputSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Branding inputs are required.");
    }));
    const profile = await prisma.trainerProfile.findUnique({
      where: { userId: user.id }
    });
    const result = await generateBranding({ ...body, trainerProfile: profile });

    return NextResponse.json({ ...result.branding, source: result.source, message: result.message });
  } catch (error) {
    return handleRouteError(error);
  }
}
