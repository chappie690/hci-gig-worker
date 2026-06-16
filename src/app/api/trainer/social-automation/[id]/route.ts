import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const automationActionSchema = z.object({
  action: z.enum(["SCHEDULE", "POST", "CANCEL"]),
  scheduledAt: z.string().trim().optional().nullable()
});

function serializeContent(content: {
  id: string;
  platform: string;
  generatedText: string;
  scheduledAt: Date | null;
  status: string;
  type: string;
  createdAt: Date;
  course: { title: string } | null;
}) {
  return {
    ...content,
    scheduledAt: content.scheduledAt?.toISOString() ?? null,
    createdAt: content.createdAt.toISOString()
  };
}

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
    const body = automationActionSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Automation action is required.");
    }));

    const existing = await prisma.marketingContent.findFirst({
      where: { id, trainerId: user.id },
      include: { course: { select: { title: true } } }
    });

    if (!existing) {
      return NextResponse.json({ message: "Marketing content not found." }, { status: 404 });
    }

    if (body.action === "SCHEDULE") {
      if (!body.scheduledAt) {
        throw new ValidationError("Choose a schedule date and time.");
      }

      const scheduledAt = new Date(body.scheduledAt);

      if (Number.isNaN(scheduledAt.getTime())) {
        throw new ValidationError("Choose a valid schedule date.");
      }

      const [content] = await prisma.$transaction([
        prisma.marketingContent.update({
          where: { id },
          data: {
            status: "SCHEDULED",
            scheduledAt
          },
          include: { course: { select: { title: true } } }
        }),
        prisma.automationTask.create({
          data: {
            trainerId: user.id,
            type: "SOCIAL_POST",
            title: `${existing.platform.toLowerCase()} post: ${existing.course?.title ?? "Brand content"}`,
            description: `Simulated social post scheduled from SkillPilot AI: ${existing.generatedText.slice(0, 140)}`,
            status: "PENDING",
            scheduledAt
          }
        })
      ]);

      return NextResponse.json({ content: serializeContent(content), message: "Post scheduled and automation task created." });
    }

    if (body.action === "POST") {
      const content = await prisma.marketingContent.update({
        where: { id },
        data: {
          status: "POSTED"
        },
        include: { course: { select: { title: true } } }
      });

      return NextResponse.json({ content: serializeContent(content), message: "Post marked as posted." });
    }

    const content = await prisma.marketingContent.update({
      where: { id },
      data: {
        status: "DRAFT",
        scheduledAt: null
      },
      include: { course: { select: { title: true } } }
    });

    return NextResponse.json({ content: serializeContent(content), message: "Scheduled post cancelled." });
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
    const existing = await prisma.marketingContent.findFirst({
      where: { id, trainerId: user.id },
      select: { id: true }
    });

    if (!existing) {
      return NextResponse.json({ message: "Marketing content not found." }, { status: 404 });
    }

    await prisma.marketingContent.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Marketing content deleted." });
  } catch (error) {
    return handleRouteError(error);
  }
}
