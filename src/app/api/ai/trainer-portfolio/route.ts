import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { generateJSON, isGroqConfigured } from "@/lib/groq";

const resultSchema = z.object({
  tagline: z.string(),
  shortBio: z.string(),
  portfolioSummary: z.string(),
  skillsSummary: z.string(),
  teachingStyle: z.string(),
  targetLearnerAudience: z.string()
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

    const formData = await request.formData();
    const prompt = String(formData.get("prompt") ?? "").trim();
    const file = formData.get("file");

    if (!prompt && !(file instanceof File)) {
      throw new ValidationError("Add a trainer prompt or upload a PDF, DOC, or DOCX file.");
    }

    const fileContext = file instanceof File ? await describeFile(file) : "No file uploaded.";
    const input = {
      trainerName: user.fullName,
      prompt,
      fileContext
    };

    if (isGroqConfigured()) {
      const groq = await generateJSON({
        system: "Create a polished trainer tagline and portfolio profile for SkillPilot AI. Use uploaded document context when it is readable. Keep it professional, specific, and suitable for an AI trainer/course creator profile.",
        user: input,
        schema: resultSchema,
        temperature: 0.55,
        maxTokens: 900
      });

      if (groq.ok) {
        return NextResponse.json({ source: "groq", result: groq.value });
      }
    }

    return NextResponse.json({ source: "fallback", result: fallbackPortfolio(user.fullName, prompt, fileContext) });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function describeFile(file: File) {
  const meta = `Uploaded file: ${file.name} (${file.type || "unknown type"}, ${Math.round(file.size / 1024)} KB).`;
  const lowerName = file.name.toLowerCase();

  if (file.type.startsWith("text/") || lowerName.endsWith(".txt") || lowerName.endsWith(".md")) {
    return `${meta}\nReadable text:\n${(await file.text()).replace(/\s+/g, " ").trim().slice(0, 5000)}`;
  }

  if (lowerName.endsWith(".pdf") || lowerName.endsWith(".doc") || lowerName.endsWith(".docx")) {
    return `${meta}\nThe prototype received this document. Full PDF/Word extraction is not enabled in this local build, so use the file name/type plus trainer prompt as supporting context.`;
  }

  return `${meta}\nUnsupported document type for extraction; use trainer prompt as the primary source.`;
}

function fallbackPortfolio(trainerName: string, prompt: string, fileContext: string): z.infer<typeof resultSchema> {
  const specialty = inferSpecialty(`${prompt} ${fileContext}`);

  return {
    tagline: `Practical ${specialty} training for learners ready to build real AI workflows.`,
    shortBio: `${trainerName} helps learners turn AI concepts into portfolio-ready projects through clear demonstrations, guided practice, and feedback-focused coaching.`,
    portfolioSummary: `A trainer profile centered on ${specialty}, applied course design, learner support, and repeatable templates for freelancers, teams, and emerging AI practitioners.`,
    skillsSummary: `${specialty}, prompt design, workflow automation, learner coaching, course facilitation, portfolio project review`,
    teachingStyle: "Structured, encouraging, example-led, and focused on practical outcomes learners can reuse after class.",
    targetLearnerAudience: "Beginner to intermediate learners, freelancers, and professionals who want marketable AI skills without needing a technical background."
  };
}

function inferSpecialty(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("marketing")) return "AI marketing";
  if (lower.includes("automation")) return "AI automation";
  if (lower.includes("prompt")) return "prompt engineering";
  if (lower.includes("chatbot")) return "chatbot building";
  if (lower.includes("data")) return "data and analytics";
  if (lower.includes("brand")) return "AI personal branding";
  return "AI productivity";
}
