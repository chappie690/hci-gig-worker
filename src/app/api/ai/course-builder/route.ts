import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { generateJSON } from "@/lib/groq";
import { assertRateLimit } from "@/lib/rate-limit";

const courseBuilderSchema = z.object({
  prompt: z.string({ required_error: "Course prompt is required." }).trim().min(10, "Describe the course you want to create."),
  answers: z.array(z.object({ question: z.string(), answer: z.string() })).optional().default([])
});

const courseDraftSchema = z.object({
  needsFollowUp: z.boolean(),
  followUpQuestions: z.array(z.string()),
  draft: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    level: z.string(),
    targetAudience: z.string(),
    duration: z.string(),
    priceSuggestion: z.number(),
    discountSuggestion: z.object({
      active: z.boolean(),
      percent: z.number(),
      label: z.string()
    }),
    learningOutcomes: z.array(z.string()),
    syllabusModules: z.array(z.string()),
    quizTopic: z.string(),
    thumbnailIdea: z.string(),
    trainerNotes: z.string(),
    youtubeVideoPlaceholder: z.string()
  })
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

    assertRateLimit(`course-builder:${user.id}`, 8);

    const body = courseBuilderSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Course prompt is required.");
    }));
    const fallback = buildFallbackDraft(body.prompt, body.answers);
    const groq = await generateJSON({
      system:
        "You are SkillPilot AI's course creation assistant for AI trainers. Turn trainer prompts into course drafts. If essential details are missing, set needsFollowUp true and ask concise follow-up questions. Still provide a best-effort editable draft. Return only JSON matching the schema.",
      user: {
        trainerName: user.fullName,
        prompt: body.prompt,
        answers: body.answers,
        requiredDetails: ["level", "duration", "price", "target audience", "course goal", "certificate preference", "live session availability"]
      },
      schema: courseDraftSchema,
      temperature: 0.45,
      maxTokens: 1100
    });

    const result = groq.ok ? groq.value : fallback;
    return NextResponse.json({
      source: groq.ok ? "groq" : "local-fallback",
      message: groq.ok ? undefined : groq.message,
      ...normalizeDraftResult(result, body.prompt, body.answers)
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function buildFallbackDraft(prompt: string, answers: Array<{ question: string; answer: string }>) {
  const normalized = `${prompt} ${answers.map((item) => item.answer).join(" ")}`.toLowerCase();
  const level = normalized.includes("advanced") ? "Advanced" : normalized.includes("intermediate") ? "Intermediate" : normalized.includes("beginner") ? "Beginner" : "";
  const hasAudience = /(student|freelancer|marketer|teacher|trainer|business|creator|professional|beginner|team)/i.test(prompt);
  const hasDuration = /\b(\d+\s*(week|day|hour|module)|short|bootcamp|sprint)\b/i.test(prompt);
  const hasPrice = /\$|\b(price|free|paid|usd|rm|dollar)\b/i.test(prompt);
  const questions = [
    !level ? "What course level should this be: Beginner, Intermediate, or Advanced?" : "",
    !hasDuration ? "How long should the course be?" : "",
    !hasPrice ? "What price do you want to set?" : "",
    !hasAudience ? "Who is the exact target audience?" : ""
  ].filter(Boolean);

  return {
    needsFollowUp: questions.length > 0 && answers.length < questions.length,
    followUpQuestions: questions.slice(0, 3),
    draft: {
      title: inferTitle(prompt),
      description: `A practical SkillPilot course based on: ${prompt}. Learners build a repeatable workflow, practice with guided examples, and leave with portfolio-ready outputs.`,
      category: inferCategory(prompt),
      level: level || "Beginner",
      targetAudience: hasAudience ? "Learners described in the trainer prompt" : "University students and early-career freelancers",
      duration: hasDuration ? "4 weeks" : "3 weeks",
      priceSuggestion: hasPrice ? 59 : 49,
      discountSuggestion: { active: true, percent: 20, label: "Launch Offer" },
      learningOutcomes: [
        "Understand the core workflow and where AI adds value.",
        "Build reusable prompts and evaluate outputs.",
        "Create a portfolio-ready project from course practice."
      ],
      syllabusModules: ["Foundation and use cases", "Prompt patterns and workflow design", "Hands-on project build", "Review, quiz, and portfolio packaging"],
      quizTopic: inferCategory(prompt),
      thumbnailIdea: "Modern blue and purple AI workspace with learner dashboard cards and clean geometric shapes.",
      trainerNotes: "Add one live session and a simple portfolio assignment for stronger learner engagement.",
      youtubeVideoPlaceholder: ""
    }
  };
}

function normalizeDraftResult(result: z.infer<typeof courseDraftSchema>, prompt: string, answers: Array<{ question: string; answer: string }>) {
  const fallback = buildFallbackDraft(prompt, answers);
  return {
    needsFollowUp: result.needsFollowUp,
    followUpQuestions: result.followUpQuestions.length ? result.followUpQuestions : fallback.followUpQuestions,
    draft: {
      ...fallback.draft,
      ...result.draft,
      level: ["Beginner", "Intermediate", "Advanced"].includes(result.draft.level) ? result.draft.level : fallback.draft.level,
      priceSuggestion: Math.max(0, Number(result.draft.priceSuggestion) || fallback.draft.priceSuggestion),
      discountSuggestion: {
        active: Boolean(result.draft.discountSuggestion.active),
        percent: Math.min(100, Math.max(0, Number(result.draft.discountSuggestion.percent) || 0)),
        label: result.draft.discountSuggestion.label || "Launch Offer"
      }
    }
  };
}

function inferTitle(prompt: string) {
  const cleaned = prompt.replace(/^create\s+(a|an)?\s*/i, "").replace(/\.$/, "").trim();
  return cleaned ? titleCase(cleaned.slice(0, 70)) : "AI Skills Launch Sprint";
}

function inferCategory(prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes("marketing")) return "AI Marketing";
  if (lower.includes("chatbot")) return "Chatbot Building";
  if (lower.includes("automation")) return "Automation";
  if (lower.includes("freelance")) return "Freelancing";
  if (lower.includes("prompt")) return "Prompt Engineering";
  return "AI Productivity";
}

function titleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}
