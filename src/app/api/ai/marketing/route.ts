import { NextResponse } from "next/server";
import { generateMarketing } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { marketingGeneratorSchema } from "@/lib/marketing-validation";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

function marketingTypeFor(contentType: string) {
  return contentType === "CAPTION" ? "CAPTION" : "AD";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    assertRateLimit(`marketing:${user.id}`);

    const body = marketingGeneratorSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Marketing inputs are required.");
    }));

    const course = body.courseId
      ? await prisma.course.findFirst({
          where: {
            id: body.courseId,
            trainerId: user.id
          }
        })
      : null;

    if (body.courseId && !course) {
      throw new ValidationError("Select one of your courses.");
    }

    const profile = await prisma.trainerProfile.findUnique({
      where: { userId: user.id }
    });

    const result = await generateMarketing({
      courseTitle: body.courseTitle,
      courseTopic: body.courseTopic,
      courseDescription: body.courseDescription,
      platform: body.platform,
      targetAudience: body.targetAudience,
      campaignGoal: body.campaignGoal,
      toneOfVoice: body.toneOfVoice,
      callToActionStyle: body.callToActionStyle,
      contentType: body.contentType,
      trainerProfile: profile
    });

    const prompt = JSON.stringify({
      courseTitle: body.courseTitle,
      courseTopic: body.courseTopic,
      platform: body.platform,
      targetAudience: body.targetAudience,
      campaignGoal: body.campaignGoal,
      toneOfVoice: body.toneOfVoice,
      callToActionStyle: body.callToActionStyle,
      contentType: body.contentType,
      source: result.source,
      campaign: result.marketing,
      hashtags: result.marketing.hashtags,
      callToAction: result.marketing.callToAction
    });

    const content = await prisma.marketingContent.create({
      data: {
        trainerId: user.id,
        courseId: course?.id ?? null,
        type: marketingTypeFor(body.contentType),
        prompt,
        generatedText: result.marketing.generatedText,
        platform: body.platform,
        status: "DRAFT"
      }
    });

    return NextResponse.json({
      id: content.id,
      source: result.source,
      message: result.message,
      generatedText: result.marketing.generatedText,
      campaignTitle: result.marketing.campaignTitle,
      courseDescription: result.marketing.courseDescription,
      adCaption: result.marketing.adCaption,
      emailSubject: result.marketing.emailSubject,
      emailBody: result.marketing.emailBody,
      promoMessage: result.marketing.promoMessage,
      hashtags: result.marketing.hashtags,
      seoKeywords: result.marketing.seoKeywords,
      targetAudience: result.marketing.targetAudience,
      performanceTips: result.marketing.performanceTips,
      callToAction: result.marketing.callToAction
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
