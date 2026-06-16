import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { generateJSON, isGroqConfigured } from "@/lib/groq";

const courseSchema = z.object({
  id: z.string(),
  title: z.string(),
  trainerName: z.string(),
  category: z.string(),
  level: z.string(),
  duration: z.string(),
  price: z.number(),
  description: z.string(),
  topic: z.string().optional()
});

const requestSchema = z.object({
  prompt: z.string({ required_error: "Tell SkillPilot what you want to learn." }).trim().min(8, "Tell SkillPilot what you want to learn."),
  courses: z.array(courseSchema).min(1, "No courses are available to recommend.")
});

const responseSchema = z.object({
  recommendations: z.array(z.object({
    courseId: z.string(),
    reason: z.string().min(10),
    skillsGained: z.array(z.string()).min(2).max(5)
  })).min(3).max(5)
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError("Sign in to get course recommendations.");
    }

    const body = requestSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Recommendation inputs are required.");
    }));

    if (isGroqConfigured()) {
      const groq = await generateJSON({
        system: "Recommend 3 to 5 SkillPilot courses for a learner. Only use course IDs from the provided list. Explain why each course matches the learner's goal and list practical skills gained.",
        user: {
          learnerGoal: body.prompt,
          courses: body.courses.slice(0, 80)
        },
        schema: responseSchema,
        temperature: 0.45,
        maxTokens: 900
      });

      if (groq.ok) {
        return NextResponse.json(normalizeRecommendations(groq.value, body.courses, body.prompt, "groq"));
      }
    }

    return NextResponse.json(normalizeRecommendations({ recommendations: fallbackRecommendations(body.prompt, body.courses) }, body.courses, body.prompt, "fallback"));
  } catch (error) {
    return handleRouteError(error);
  }
}

function normalizeRecommendations(value: z.infer<typeof responseSchema>, courses: z.infer<typeof courseSchema>[], prompt: string, source: "groq" | "fallback") {
  const courseIds = new Set(courses.map((course) => course.id));
  const seen = new Set<string>();
  const recommendations = value.recommendations.filter((item) => {
    if (!courseIds.has(item.courseId) || seen.has(item.courseId)) {
      return false;
    }

    seen.add(item.courseId);
    return true;
  });

  if (recommendations.length < 3) {
    for (const item of fallbackRecommendations(prompt, courses)) {
      if (!seen.has(item.courseId)) {
        recommendations.push(item);
        seen.add(item.courseId);
      }

      if (recommendations.length >= 5) {
        break;
      }
    }
  }

  return { source, recommendations: recommendations.slice(0, 5) };
}

function fallbackRecommendations(prompt: string, courses: z.infer<typeof courseSchema>[]) {
  const terms = prompt.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const scored = courses.map((course) => {
    const haystack = `${course.title} ${course.category} ${course.topic ?? ""} ${course.description}`.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 2 : 0), 0)
      + (haystack.includes("freelance") && prompt.toLowerCase().includes("freelance") ? 4 : 0)
      + (haystack.includes("marketing") && prompt.toLowerCase().includes("marketing") ? 4 : 0)
      + (haystack.includes("prompt") && prompt.toLowerCase().includes("prompt") ? 4 : 0)
      + (haystack.includes("automation") && prompt.toLowerCase().includes("automation") ? 4 : 0);
    return { course, score };
  }).sort((a, b) => b.score - a.score || a.course.price - b.course.price);

  return scored.slice(0, 5).map(({ course }) => ({
    courseId: course.id,
    reason: `${course.title} matches your goal because it focuses on ${course.topic ?? course.category} with practical exercises for real learner outcomes.`,
    skillsGained: [
      course.topic ?? course.category,
      "Reusable AI workflows",
      "Portfolio-ready project practice",
      "Clear next steps for applying the skill"
    ]
  }));
}
