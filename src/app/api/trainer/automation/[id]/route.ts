import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { automationTaskSchema } from "@/lib/automation-validation";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    const { id } = await params;
    const existing = await prisma.automationTask.findFirst({
      where: { id, trainerId: user.id }
    });

    if (!existing) {
      return NextResponse.json({ message: "Automation task not found." }, { status: 404 });
    }

    const body = automationTaskSchema.partial().parse(await request.json().catch(() => {
      throw new ValidationError("Automation update fields are required.");
    }));
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;

    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      throw new ValidationError("Choose a valid scheduled date.");
    }

    const task = await prisma.automationTask.update({
      where: { id },
      data: {
        type: body.type,
        title: body.title,
        description: body.description,
        status: body.status,
        scheduledAt
      }
    });

    return NextResponse.json({ task: serializeTask(task), message: "Automation task updated." });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    const { id } = await params;
    const existing = await prisma.automationTask.findFirst({
      where: { id, trainerId: user.id },
      select: { id: true }
    });

    if (!existing) {
      return NextResponse.json({ message: "Automation task not found." }, { status: 404 });
    }

    await prisma.automationTask.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Automation task deleted." });
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
