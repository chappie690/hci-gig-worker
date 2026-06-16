import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { automationTaskSchema } from "@/lib/automation-validation";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    const body = automationTaskSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Automation task fields are required.");
    }));
    const scheduledAt = new Date(body.scheduledAt);

    if (Number.isNaN(scheduledAt.getTime())) {
      throw new ValidationError("Choose a valid scheduled date.");
    }

    const task = await prisma.automationTask.create({
      data: {
        trainerId: user.id,
        type: body.type,
        title: body.title,
        description: body.description,
        status: body.status,
        scheduledAt
      }
    });

    return NextResponse.json({ task: serializeTask(task), message: "Automation task created." }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

function serializeTask(task: { id: string; type: string; title: string; description: string; status: string; scheduledAt: Date; createdAt: Date }) {
  return {
    ...task,
    scheduledAt: task.scheduledAt.toISOString(),
    createdAt: task.createdAt.toISOString()
  };
}
