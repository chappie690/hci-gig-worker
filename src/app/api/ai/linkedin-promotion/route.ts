import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { generateJSON } from "@/lib/groq";
import { generatePromotionalVisual } from "@/lib/huggingface";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

const requestSchema = z.object({
  prompt: z.string({ required_error: "Promotional prompt is required." }).trim().min(8, "Promotional prompt is required."),
  courseTitle: z.string({ required_error: "Course title is required." }).trim().min(2, "Course title is required."),
  targetAudience: z.string({ required_error: "Target audience is required." }).trim().min(2, "Target audience is required."),
  tone: z.enum(["Professional", "Friendly", "Motivational", "Bold"]),
  goal: z.enum(["Get enrollments", "Build awareness", "Promote discount", "Announce new course"]),
  platform: z.enum(["LinkedIn", "Facebook", "TikTok", "Instagram"]).default("LinkedIn")
});

const promotionSchema = z.object({
  postTitle: z.string().min(4),
  caption: z.string().min(20),
  hashtags: z.array(z.string()).min(3),
  callToAction: z.string().min(3),
  shortAdCopy: z.string().min(10),
  longAdCopy: z.string().min(20),
  engagementQuestion: z.string().min(8),
  audienceTargetingReason: z.string().min(10),
  targetAudience: z.string().min(2),
  trainerName: z.string().min(2),
  courseTitle: z.string().min(2),
  platform: z.enum(["LinkedIn", "Facebook", "TikTok", "Instagram"]),
  createdAt: z.string().min(8)
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

    assertRateLimit(`social-promo:${user.id}`);

    const body = requestSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Promotional post inputs are required.");
    }));
    const profile = await prisma.trainerProfile.findUnique({
      where: { userId: user.id }
    });
    const trainerName = profile?.brandName ?? user.fullName;
    const trainerTagline = profile?.tagline ?? "AI trainer on SkillPilot AI";
    const createdAt = new Date().toISOString();
    const fallback = localPromotion({
      ...body,
      trainerName,
      createdAt
    });

    const groq = await generateJSON({
      system: `You are SkillPilot AI's promotional content strategist. Generate one professional ${body.platform} post as structured JSON. Make the caption native to the selected platform, keep claims realistic and course-focused, and never claim real posting has happened.`,
      user: {
        trainerName,
        trainerTagline,
        trainerBio: profile?.bio,
        skills: profile?.skills,
        prompt: body.prompt,
        courseTitle: body.courseTitle,
        targetAudience: body.targetAudience,
        tone: body.tone,
        goal: body.goal,
        platform: body.platform,
        createdAt
      },
      schema: promotionSchema,
      temperature: 0.62,
      maxTokens: 900
    });
    const promotion = groq.ok ? { ...groq.value, createdAt, trainerName, platform: body.platform } : fallback;
    const visual = await generatePromotionalVisual({
      courseTitle: promotion.courseTitle,
      trainerName,
      targetAudience: promotion.targetAudience,
      tone: body.tone,
      campaignGoal: body.goal,
      prompt: `${body.platform} promotional asset. ${body.prompt}. ${promotion.postTitle}. ${promotion.shortAdCopy}`
    });

    return NextResponse.json({
      source: {
        groq: groq.ok ? "groq" : "fallback",
        huggingFace: visual.visualSource
      },
      groqMessage: groq.ok ? null : groq.message,
      trainerTagline,
      promotion,
      visual
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function localPromotion(input: z.infer<typeof requestSchema> & { trainerName: string; createdAt: string }) {
  const platformTags = {
    LinkedIn: ["#SkillPilotAI", "#AITraining", "#LinkedInLearning", "#PromptEngineering", "#FutureSkills"],
    Facebook: ["#SkillPilotAI", "#LearnAI", "#FreelanceSkills", "#OnlineLearning", "#AIForWork"],
    TikTok: ["#SkillPilotAI", "#AITips", "#FreelanceTok", "#LearnOnTikTok", "#PromptEngineering"],
    Instagram: ["#SkillPilotAI", "#AICreator", "#FreelanceJourney", "#LearnAI", "#CourseLaunch"]
  } satisfies Record<z.infer<typeof requestSchema>["platform"], string[]>;
  const platformStyle = {
    LinkedIn: "professional, credibility-led, and easy to scan",
    Facebook: "community-focused, clear, and conversational",
    TikTok: "hook-led, energetic, and short-video friendly",
    Instagram: "visual, benefit-led, and creator-friendly"
  } satisfies Record<z.infer<typeof requestSchema>["platform"], string>;

  return {
    postTitle: `${input.courseTitle}: ${input.platform} launch promotion`,
    caption: `${input.prompt}\n\n${input.courseTitle} is designed for ${input.targetAudience.toLowerCase()} who want practical AI skills they can use immediately. This ${platformStyle[input.platform]} post highlights clear examples, trainer guidance, and portfolio-ready outcomes.`,
    hashtags: platformTags[input.platform],
    callToAction: input.goal === "Promote discount" ? "Claim the demo discount and reserve your seat." : "Preview the course and enroll today.",
    shortAdCopy: `${input.courseTitle} helps ${input.targetAudience.toLowerCase()} build practical AI confidence.`,
    longAdCopy: `Join ${input.trainerName} for ${input.courseTitle}, a focused SkillPilot AI course built to help ${input.targetAudience.toLowerCase()} move from AI curiosity to repeatable skills. Expect practical lessons, clear workflows, and support for your next learning milestone.`,
    engagementQuestion: "What is one AI skill you want to turn into freelance income this month?",
    audienceTargetingReason: `${input.targetAudience} is a strong fit because the course promise connects directly to practical skills, portfolio proof, and beginner-friendly trainer support.`,
    targetAudience: input.targetAudience,
    trainerName: input.trainerName,
    courseTitle: input.courseTitle,
    platform: input.platform,
    createdAt: input.createdAt
  };
}
