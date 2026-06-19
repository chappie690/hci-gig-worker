import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { generateJSON } from "@/lib/groq";
import { assertRateLimit } from "@/lib/rate-limit";

const courseBuilderSchema = z.object({
  prompt: z.string({ required_error: "Course prompt is required." }).trim().min(10, "Describe the course you want to create."),
  answers: z.array(z.object({ question: z.string(), answer: z.string() })).optional().default([]),
  variant: z.coerce.number().int().min(0).max(20).optional().default(0)
});

const courseDraftSchema = z.object({
  needsFollowUp: z.boolean(),
  followUpQuestions: z.array(z.string()),
  draft: z.object({
    courseTitle: z.string(),
    description: z.string(),
    category: z.string(),
    level: z.string(),
    targetAudience: z.string(),
    duration: z.string(),
    price: z.number(),
    discountSuggestion: z.string(),
    learningOutcomes: z.array(z.string()),
    syllabusModules: z.array(z.string()),
    quizTopic: z.string(),
    courseThumbnailIdea: z.string(),
    trainerNotes: z.string(),
    youtubeVideoLinkPlaceholder: z.string(),
    certificateIncluded: z.boolean(),
    recommendedSessionPlan: z.string()
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
    const fallback = buildFallbackDraft(body.prompt, body.variant);
    const groq = await generateJSON({
      system:
        "You are SkillPilot AI's course creation assistant for AI trainers. Turn one trainer prompt into a complete, practical, publishable course draft. Infer sensible details for level, duration, price, audience, certificate, and live session plan instead of asking follow-up questions. Always set needsFollowUp to false and followUpQuestions to an empty array. Create a short professional courseTitle related to the prompt; never copy the user's full prompt as the title. Use realistic course pricing and professional wording. Return only JSON matching the schema.",
      user: {
        trainerName: user.fullName,
        prompt: body.prompt,
        variant: body.variant,
        instruction: "Generate a publish-ready course draft from this single prompt. Treat the prompt topic as the main source of truth. If the prompt is 'Game development', create a game development course. If it is 'Food photography', create a food photography course. Do not default to AI Productivity unless the prompt is specifically about AI productivity. Use smart defaults if details are missing. For different variants, change the title angle, modules, outcomes, and trainer notes while staying relevant.",
        expectedDraftKeys: [
          "courseTitle",
          "description",
          "category",
          "level",
          "targetAudience",
          "duration",
          "price",
          "discountSuggestion",
          "learningOutcomes",
          "syllabusModules",
          "quizTopic",
          "courseThumbnailIdea",
          "trainerNotes",
          "certificateIncluded",
          "recommendedSessionPlan"
        ]
      },
      schema: courseDraftSchema,
      temperature: 0.45,
      maxTokens: 1500
    });

    const result = groq.ok ? groq.value : fallback;
    const normalized = normalizeDraftResult(result, body.prompt, body.variant);
    return NextResponse.json({
      source: groq.ok ? "groq" : "local-fallback",
      message: groq.ok ? undefined : groq.message,
      ...normalized
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function buildFallbackDraft(prompt: string, variant = 0) {
  const normalized = prompt.toLowerCase();
  const topic = analyzePromptTopic(prompt);
  const level = inferLevel(normalized);
  const modules = buildSyllabus(topic, level, variant);

  return {
    needsFollowUp: false,
    followUpQuestions: [],
    draft: {
      courseTitle: inferTitle(prompt, variant),
      description: buildDescription(topic, prompt, variant),
      category: topic.category,
      level,
      targetAudience: inferAudience(normalized, topic),
      duration: inferDuration(normalized),
      price: inferPrice(normalized, topic),
      discountSuggestion: buildDiscount(topic, variant),
      learningOutcomes: buildOutcomes(topic, level, variant),
      syllabusModules: modules,
      quizTopic: `${topic.label} fundamentals and applied project decisions`,
      courseThumbnailIdea: buildThumbnailIdea(topic),
      trainerNotes: `Use the learner's final ${topic.projectNoun} as the portfolio artifact. Include critique, examples, and a short checklist for evaluating quality.`,
      youtubeVideoLinkPlaceholder: "",
      certificateIncluded: !/\b(no certificate|without certificate)\b/i.test(normalized),
      recommendedSessionPlan: inferSessionPlan(normalized, topic)
    }
  };
}

function normalizeDraftResult(
  result: z.infer<typeof courseDraftSchema>,
  prompt: string,
  variant = 0
) {
  const fallback = buildFallbackDraft(prompt, variant);
  const draft = result.draft ?? fallback.draft;
  const topic = analyzePromptTopic(prompt);
  return {
    needsFollowUp: false,
    followUpQuestions: [],
    draft: {
      ...fallback.draft,
      ...draft,
      courseTitle: sanitizeCourseTitle(draft.courseTitle, prompt, fallback.draft.courseTitle),
      description: draft.description?.trim() || fallback.draft.description,
      category: isGenericAICategory(draft.category, topic) ? topic.category : draft.category?.trim() || fallback.draft.category,
      level: ["Beginner", "Intermediate", "Advanced"].includes(draft.level) ? draft.level : fallback.draft.level,
      targetAudience: draft.targetAudience?.trim() || fallback.draft.targetAudience,
      duration: draft.duration?.trim() || fallback.draft.duration,
      price: Math.max(0, Number(draft.price) || fallback.draft.price),
      discountSuggestion: draft.discountSuggestion || fallback.draft.discountSuggestion,
      learningOutcomes: draft.learningOutcomes?.length ? draft.learningOutcomes.slice(0, 6) : fallback.draft.learningOutcomes,
      syllabusModules: draft.syllabusModules?.length ? draft.syllabusModules.slice(0, 8) : fallback.draft.syllabusModules,
      quizTopic: draft.quizTopic?.trim() || fallback.draft.quizTopic,
      courseThumbnailIdea: draft.courseThumbnailIdea?.trim() || fallback.draft.courseThumbnailIdea,
      trainerNotes: draft.trainerNotes?.trim() || fallback.draft.trainerNotes,
      certificateIncluded: Boolean(draft.certificateIncluded),
      recommendedSessionPlan: draft.recommendedSessionPlan || fallback.draft.recommendedSessionPlan
    }
  };
}

type TopicProfile = {
  label: string;
  category: string;
  projectNoun: string;
  skills: string[];
  audience: string;
};

const topicProfiles: Array<{ pattern: RegExp; profile: TopicProfile }> = [
  { pattern: /\b(game development|game dev|unity|unreal|godot|2d game|3d game)\b/i, profile: { label: "Game Development", category: "Game Development", projectNoun: "playable game prototype", skills: ["game loops", "level design", "player controls", "build testing"], audience: "aspiring game creators and beginner developers" } },
  { pattern: /\b(cybersecurity|cyber security|security basics|ethical hacking|network security)\b/i, profile: { label: "Cybersecurity Basics", category: "Cybersecurity", projectNoun: "security checklist and threat report", skills: ["threat modeling", "password safety", "network hygiene", "incident response basics"], audience: "beginners who want practical digital safety skills" } },
  { pattern: /\b(python|python programming|python for beginners)\b/i, profile: { label: "Python Programming", category: "Programming", projectNoun: "Python automation script", skills: ["syntax", "control flow", "functions", "small automation projects"], audience: "new programmers and career-switching learners" } },
  { pattern: /\b(food photography|food photo|restaurant photography|product photography)\b/i, profile: { label: "Food Photography", category: "Photography", projectNoun: "styled food photo portfolio", skills: ["lighting", "composition", "styling", "editing workflow"], audience: "creators, cafe owners, and beginner photographers" } },
  { pattern: /\b(tiktok shop|tiktok selling|social commerce|live selling)\b/i, profile: { label: "TikTok Shop Selling", category: "E-Commerce", projectNoun: "TikTok Shop launch plan", skills: ["product positioning", "short-form selling", "shop setup", "conversion tracking"], audience: "small sellers, creators, and beginner e-commerce operators" } },
  { pattern: /\b(ui ux|ui\/ux|ux portfolio|ui portfolio|product design portfolio)\b/i, profile: { label: "UI/UX Portfolio", category: "Design", projectNoun: "portfolio case study", skills: ["case study structure", "wireframes", "user research", "visual presentation"], audience: "design students and junior product designers" } },
  { pattern: /\b(marketing|digital marketing|ai marketing)\b/i, profile: { label: "AI Marketing", category: "AI Marketing", projectNoun: "campaign portfolio asset", skills: ["audience research", "campaign copy", "content planning", "performance review"], audience: "students, freelancers, and marketers building practical campaign skills" } },
  { pattern: /\b(chatbot|bot building|conversation design)\b/i, profile: { label: "Chatbot Building", category: "Chatbot Building", projectNoun: "working chatbot flow", skills: ["conversation flows", "intent mapping", "response design", "testing"], audience: "builders and support teams creating guided bot experiences" } },
  { pattern: /\b(automation|workflow automation|zapier|make\.com|no-code automation)\b/i, profile: { label: "Workflow Automation", category: "Automation", projectNoun: "automated workflow", skills: ["process mapping", "trigger/action logic", "tool selection", "testing"], audience: "freelancers and teams who want to reduce repetitive work" } },
  { pattern: /\b(prompt engineering|prompting|prompt design)\b/i, profile: { label: "Prompt Engineering", category: "Prompt Engineering", projectNoun: "prompt playbook", skills: ["prompt patterns", "evaluation", "iteration", "workflow reuse"], audience: "professionals and learners using generative AI tools" } }
];

function analyzePromptTopic(prompt: string): TopicProfile {
  const matched = topicProfiles.find((item) => item.pattern.test(prompt));

  if (matched) {
    return matched.profile;
  }

  const label = extractTopicLabel(prompt);
  return {
    label,
    category: label,
    projectNoun: `${label.toLowerCase()} portfolio project`,
    skills: [`${label} fundamentals`, "practical workflow", "project planning", "quality review"],
    audience: `beginners and motivated learners interested in ${label.toLowerCase()}`
  };
}

function inferTitle(prompt: string, variant = 0) {
  const lower = prompt.toLowerCase();
  const topic = analyzePromptTopic(prompt);
  const level = inferLevel(lower);
  const audience = lower.includes("student") && lower.includes("freelance")
    ? "Student Freelancers"
    : lower.includes("student")
      ? "Students"
      : lower.includes("freelance")
        ? "Freelancers"
        : lower.includes("business")
          ? "Small Business"
          : "";

  if (topic.category === "AI Marketing" && audience === "Student Freelancers") {
    return "AI Marketing Freelance Starter Course";
  }

  const variants = [
    `${topic.label} Starter Course`,
    `${level} ${topic.label} Project Bootcamp`,
    `${topic.label} Portfolio Sprint`,
    `Practical ${topic.label} Foundations`
  ];

  return variants[Math.abs(variant) % variants.length];
}

function inferCategory(prompt: string) {
  return analyzePromptTopic(prompt).category;
}

function inferLevel(normalized: string) {
  if (normalized.includes("advanced")) return "Advanced";
  if (normalized.includes("intermediate")) return "Intermediate";
  return "Beginner";
}

function extractTopicLabel(prompt: string) {
  const cleaned = prompt
    .replace(/^create\s+(a|an)?\s*/i, "")
    .replace(/\b(course|class|training|workshop|bootcamp|about|for beginners|beginner|advanced|intermediate)\b/gi, " ")
    .replace(/[^\w\s/+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return titleCase(cleaned.slice(0, 54) || "Practical Skills");
}

function isGenericAICategory(category: string | undefined, topic: TopicProfile) {
  if (!category) return false;
  const normalized = category.toLowerCase();
  return topic.category !== "AI Productivity" && (normalized === "ai productivity" || normalized === "productivity" || normalized === "general");
}

function buildDescription(topic: TopicProfile, prompt: string, variant: number) {
  const angle = variant % 2 === 0
    ? `Learners move from core concepts to a guided ${topic.projectNoun}, with practical checkpoints and feedback moments.`
    : `Learners practice the essential workflow, avoid common beginner mistakes, and package a finished ${topic.projectNoun}.`;

  return `A practical SkillPilot course on ${topic.label.toLowerCase()} inspired by: "${prompt}". ${angle} The course is designed for hands-on learning, not passive theory.`;
}

function buildOutcomes(topic: TopicProfile, level: string, variant: number) {
  const core = [
    `Explain the essential ${topic.label.toLowerCase()} concepts at a ${level.toLowerCase()} level.`,
    `Apply ${topic.skills[0]} and ${topic.skills[1]} in a guided exercise.`,
    `Create a polished ${topic.projectNoun} for portfolio or client discussion.`,
    `Use a checklist to evaluate quality and decide what to improve next.`
  ];

  if (variant % 2 === 1) {
    return [
      `Plan a realistic ${topic.label.toLowerCase()} project from a learner or client brief.`,
      `Practice ${topic.skills[2] ?? topic.skills[0]} with examples and critique.`,
      `Build and present a finished ${topic.projectNoun}.`,
      `Identify next steps for improving speed, quality, and confidence.`
    ];
  }

  return core;
}

function buildSyllabus(topic: TopicProfile, level: string, variant: number) {
  const base = [
    `${topic.label} foundations and learner goals`,
    `${titleCase(topic.skills[0])}: guided practice`,
    `${titleCase(topic.skills[1])}: examples and common mistakes`,
    `Build the ${topic.projectNoun}`,
    "Review, quiz, and portfolio packaging"
  ];

  if (variant % 3 === 1) {
    return [
      `${level} orientation and project brief`,
      `${titleCase(topic.skills[2] ?? topic.skills[0])} workshop`,
      "Hands-on critique and improvement loop",
      `Publish-ready ${topic.projectNoun}`,
      "Final quiz and action plan"
    ];
  }

  if (variant % 3 === 2) {
    return [
      `What good ${topic.label.toLowerCase()} looks like`,
      "Tools, setup, and workflow checklist",
      `${titleCase(topic.skills[0])} practice lab`,
      `${titleCase(topic.skills[1])} project sprint`,
      "Final review and next-step roadmap"
    ];
  }

  return base;
}

function buildThumbnailIdea(topic: TopicProfile) {
  return `A clean ${topic.label.toLowerCase()} course thumbnail showing a finished ${topic.projectNoun}, bold title area, and modern blue-purple SkillPilot accents.`;
}

function buildDiscount(topic: TopicProfile, variant: number) {
  return variant % 2 === 0
    ? `Launch Offer: 20% off for the first ${topic.label} cohort`
    : `Portfolio Sprint Deal: 15% off for early ${topic.label} learners`;
}

function inferAudience(normalized: string, topic: TopicProfile) {
  if (normalized.includes("student")) return "University students building practical AI and freelance skills";
  if (normalized.includes("freelance")) return "Early-career freelancers and gig workers";
  if (normalized.includes("business")) return "Small business owners and operational teams";
  if (normalized.includes("creator")) return "Content creators building AI-assisted workflows";
  return topic.audience;
}

function inferDuration(normalized: string) {
  const match = normalized.match(/\b(\d+\s*(week|weeks|day|days|hour|hours|module|modules|month|months))\b/i);
  return match?.[1] ? titleCase(match[1]) : "4 weeks";
}

function inferPrice(normalized: string, topic: TopicProfile) {
  const currencyMatch = normalized.match(/(?:\$|rm|usd)?\s*(\d{2,4})(?:\s*(usd|rm|dollars?))?/i);
  if (currencyMatch?.[1]) return Number(currencyMatch[1]);
  if (normalized.includes("free")) return 0;
  if (topic.category === "Programming" || topic.category === "Cybersecurity") return 79;
  if (topic.category === "Photography" || topic.category === "Design") return 69;
  if (topic.category === "E-Commerce") return 89;
  if (topic.category === "Game Development") return 99;
  return 59;
}

function inferSessionPlan(normalized: string, topic: TopicProfile) {
  if (normalized.includes("self-paced") || normalized.includes("recorded")) {
    return "Self-paced lessons with one optional live Q&A clinic before the final quiz.";
  }
  if (normalized.includes("session") || normalized.includes("workshop")) {
    return "Two live training sessions: one kickoff workshop and one portfolio review clinic.";
  }
  return `One 60-minute live kickoff session plus a ${topic.projectNoun} review clinic before the final quiz.`;
}

function titleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

function sanitizeCourseTitle(title: string, prompt: string, fallback: string) {
  const trimmed = title.trim();
  const promptText = prompt.trim().replace(/[.!?]+$/, "");
  const titleLooksLikePrompt = trimmed.toLowerCase() === promptText.toLowerCase() || trimmed.length > 90 || /^create\s+(a|an)?\s+/i.test(trimmed);

  if (!trimmed || titleLooksLikePrompt) {
    return fallback;
  }

  return titleCase(trimmed).slice(0, 90);
}
