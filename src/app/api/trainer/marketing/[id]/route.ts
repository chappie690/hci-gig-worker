import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { marketingSaveSchema } from "@/lib/marketing-validation";
import { prisma } from "@/lib/prisma";

function splitList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergePrompt(prompt: string, values: { hashtags: string; seoKeywords: string; callToAction: string; structuredCampaign?: Record<string, unknown> }) {
  try {
    const parsed = JSON.parse(prompt) as Record<string, unknown>;

    return JSON.stringify({
      ...parsed,
      hashtags: splitList(values.hashtags),
      seoKeywords: splitList(values.seoKeywords),
      callToAction: values.callToAction,
      ...(values.structuredCampaign ? { campaign: values.structuredCampaign } : {})
    });
  } catch {
    return JSON.stringify({
      originalPrompt: prompt,
      hashtags: splitList(values.hashtags),
      seoKeywords: splitList(values.seoKeywords),
      callToAction: values.callToAction,
      ...(values.structuredCampaign ? { campaign: values.structuredCampaign } : {})
    });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    const { id } = await params;
    const body = marketingSaveSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Marketing content is required.");
    }));

    if (body.status === "SCHEDULED" && !body.scheduledAt) {
      throw new ValidationError("Choose a date and time before scheduling.");
    }

    const existing = await prisma.marketingContent.findFirst({
      where: {
        id,
        trainerId: user.id
      }
    });

    if (!existing) {
      throw new ValidationError("Marketing content was not found.");
    }

    const scheduledAt = body.status === "SCHEDULED" && body.scheduledAt ? new Date(body.scheduledAt) : null;

    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      throw new ValidationError("Choose a valid schedule date.");
    }

    const content = await prisma.marketingContent.update({
      where: { id },
      data: {
        generatedText: body.generatedText,
        prompt: mergePrompt(existing.prompt, {
          hashtags: body.hashtags,
          seoKeywords: body.seoKeywords,
          callToAction: body.callToAction,
          structuredCampaign: body.structuredCampaign
        }),
        status: body.status,
        scheduledAt
      }
    });

    return NextResponse.json({ content, message: body.status === "SCHEDULED" ? "Post scheduled." : "Draft saved." });
  } catch (error) {
    return handleRouteError(error);
  }
}
