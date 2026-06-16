import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { generateJSON } from "@/lib/groq";
import { generatePromotionalVisual } from "@/lib/huggingface";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

const learnerSocialSchema = z.object({
  prompt: z.string({ required_error: "Prompt is required." }).trim().min(10, "Describe the achievement or progress you want to share."),
  platform: z.enum(["LinkedIn", "Facebook", "Instagram", "TikTok"]),
  courseId: z.string().optional().nullable(),
  tone: z.string().trim().default("Professional")
});

const learnerSocialOutputSchema = z.object({
  caption: z.string().min(10),
  hashtags: z.array(z.string()).min(3),
  achievementMessage: z.string().min(8),
  callToAction: z.string().min(2),
  shortPortfolioDescription: z.string().min(10)
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "LEARNER") {
      throw new ForbiddenError();
    }

    assertRateLimit(`learner-social:${user.id}`, 8);

    const body = learnerSocialSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Learner social inputs are required.");
    }));

    const enrollment = body.courseId
      ? await prisma.enrollment.findFirst({
          where: { learnerId: user.id, courseId: body.courseId },
          include: { course: { include: { trainer: true } } }
        })
      : null;

    if (body.courseId && !enrollment) {
      throw new ValidationError("Select one of your enrolled courses.");
    }

    const courseTitle = enrollment?.course.title ?? inferCourseTitle(body.prompt);
    const fallback = buildFallback({
      learnerName: user.fullName,
      prompt: body.prompt,
      platform: body.platform,
      courseTitle
    });

    const groq = await generateJSON({
      system:
        "You are SkillPilot AI's learner portfolio writing assistant. Generate achievement and progress social posts for learners, not trainer promotions. Keep output professional, concise, authentic, and platform-appropriate. Return caption, hashtags, achievementMessage, callToAction, and shortPortfolioDescription.",
      user: {
        learnerName: user.fullName,
        platform: body.platform,
        tone: body.tone,
        prompt: body.prompt,
        courseTitle,
        trainerName: enrollment?.course.trainer.fullName ?? null
      },
      schema: learnerSocialOutputSchema,
      temperature: 0.55,
      maxTokens: 700
    });

    const content = groq.ok ? groq.value : fallback;
    const visual = await generatePromotionalVisual({
      courseTitle: courseTitle ?? "SkillPilot learner achievement",
      trainerName: user.fullName,
      targetAudience: "recruiters, collaborators, classmates, and professional network",
      tone: body.tone,
      campaignGoal: `Learner portfolio achievement post for ${body.platform}`,
      prompt: body.prompt
    });

    return NextResponse.json({
      source: groq.ok ? "groq" : "local-fallback",
      message: groq.ok ? undefined : groq.message,
      ...content,
      courseTitle,
      visual
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function buildFallback({
  learnerName,
  prompt,
  platform,
  courseTitle
}: {
  learnerName: string;
  prompt: string;
  platform: string;
  courseTitle: string | null;
}) {
  const course = courseTitle ?? "my SkillPilot learning journey";
  return {
    caption: `${learnerName} is building practical AI skills through ${course}. ${prompt} The biggest takeaway is turning learning into a portfolio-ready workflow that can be explained, repeated, and improved.`,
    hashtags: platform === "TikTok" ? ["#LearnAI", "#SkillPilotAI", "#StudentCreator"] : ["#SkillPilotAI", "#LearnAI", "#PortfolioBuilding", "#FutureOfWork"],
    achievementMessage: `Completed a meaningful SkillPilot milestone in ${course}.`,
    callToAction: "Connect with me if you are building AI skills too.",
    shortPortfolioDescription: `A portfolio-ready learning update showing progress in ${course}, practical AI workflows, and career-focused growth.`
  };
}

function inferCourseTitle(prompt: string) {
  const match = prompt.match(/(?:completing|finished|completed|studying|learning)\s+(?:my\s+)?(.+?)(?:\.|$)/i);
  return match?.[1]?.trim() ?? null;
}
