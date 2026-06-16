import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAutomationAssistant } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  taskType: z.enum(["COURSE_PUBLISHING", "SOCIAL_POST", "EMAIL_REMINDER", "CHATBOT_REPLY", "SESSION_REMINDER"]).optional(),
  goal: z.string({ required_error: "Automation goal is required." }).trim().min(8, "Automation goal is required."),
  audience: z.string().trim().optional(),
  trigger: z.enum(["learner joins course", "inactive learner", "course completed", "payment pending", "session soon", "review missing"]).optional(),
  action: z.enum(["welcome message", "reminder", "payment reminder", "session reminder", "feedback request", "certificate ready", "notify trainer"]).optional()
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

    assertRateLimit(`automation-ai:${user.id}`);

    const body = schema.parse(await request.json().catch(() => {
      throw new ValidationError("Automation context is required.");
    }));
    const profile = await prisma.trainerProfile.findUnique({
      where: { userId: user.id }
    });
    const result = await generateAutomationAssistant({ ...body, trainerProfile: profile });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
