import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { trainerProfileSchema } from "@/lib/profile-validation";

const saveBrandingSchema = trainerProfileSchema.extend({
  sourcePrompt: z.string().optional()
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

    const body = saveBrandingSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Generated branding is required.");
    }));
    const { sourcePrompt, ...profileFields } = body;

    const [profile] = await prisma.$transaction([
      prisma.trainerProfile.upsert({
        where: { userId: user.id },
        update: profileFields,
        create: {
          userId: user.id,
          ...profileFields
        }
      }),
      prisma.marketingContent.create({
        data: {
          trainerId: user.id,
          type: "TAGLINE",
          prompt: sourcePrompt ?? "AI Branding Studio generated tagline",
          generatedText: profileFields.tagline,
          platform: "LINKEDIN",
          status: "DRAFT"
        }
      }),
      prisma.marketingContent.create({
        data: {
          trainerId: user.id,
          type: "BIO",
          prompt: sourcePrompt ?? "AI Branding Studio generated bio",
          generatedText: profileFields.bio,
          platform: "LINKEDIN",
          status: "DRAFT"
        }
      }),
      prisma.marketingContent.create({
        data: {
          trainerId: user.id,
          type: "PORTFOLIO",
          prompt: sourcePrompt ?? "AI Branding Studio generated portfolio summary",
          generatedText: profileFields.portfolioSummary,
          platform: "LINKEDIN",
          status: "DRAFT"
        }
      })
    ]);

    return NextResponse.json({ profile, message: "Branding saved to profile and marketing drafts." });
  } catch (error) {
    return handleRouteError(error);
  }
}
