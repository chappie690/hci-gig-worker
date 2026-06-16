import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { generateJSON } from "@/lib/groq";

const requestSchema = z.object({
  learnerName: z.string().trim().min(2),
  courseTitle: z.string().trim().min(2),
  trainerName: z.string().trim().min(2),
  score: z.number().min(8).max(10)
});

const certificateSchema = z.object({
  achievementStatement: z.string(),
  themeName: z.string(),
  sealText: z.string()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "LEARNER") {
    return NextResponse.json({ message: "Sign in as a learner to generate certificate wording." }, { status: 401 });
  }

  const body = requestSchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json(fallbackCertificate("this SkillPilot course"), { status: 200 });
  }

  const result = await generateJSON({
    system: "Create concise certificate wording for a professional AI learning platform. Return a short achievementStatement, a tasteful themeName, and a 2-4 word sealText. Do not include the learner name or course title because the app renders those separately.",
    user: body.data,
    schema: certificateSchema,
    temperature: 0.55,
    maxTokens: 260
  });

  if (!result.ok) {
    return NextResponse.json(fallbackCertificate(body.data.courseTitle));
  }

  return NextResponse.json(result.value);
}

function fallbackCertificate(courseTitle: string) {
  return {
    achievementStatement: `For successfully demonstrating practical understanding, applied problem solving, and learner readiness in ${courseTitle}.`,
    themeName: "Professional AI Skills Credential",
    sealText: "AI Certified"
  };
}
