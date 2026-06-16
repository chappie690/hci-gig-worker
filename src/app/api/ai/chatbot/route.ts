import { NextResponse } from "next/server";
import { z } from "zod";
import { generateChatbotReply } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

const chatbotSchema = z.object({
  message: z.string({ required_error: "Message is required." }).trim().min(2, "Ask a course question first."),
  courseId: z.string().optional().nullable(),
  teachingStyle: z.enum(["Direct", "Encouraging", "Humorous"]).optional()
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const body = chatbotSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Message is required.");
    }));

    if (user.role !== "LEARNER") {
      throw new ForbiddenError();
    }

    assertRateLimit(`chatbot:${user.id}`, 12);

    const enrollment = body.courseId
      ? await prisma.enrollment.findFirst({
          where: { learnerId: user.id, courseId: body.courseId },
          include: {
            course: true
          }
        })
      : null;

    if (body.courseId && !enrollment) {
      return NextResponse.json({ message: "Course not found for this learner." }, { status: 404 });
    }

    const [sessions, payments] = await Promise.all([
      prisma.trainingSession.findMany({
        where: {
          status: "SCHEDULED",
          startTime: { gte: new Date() },
          ...(body.courseId
            ? { courseId: body.courseId }
            : {
                course: {
                  enrollments: {
                    some: { learnerId: user.id }
                  }
                }
              })
        },
        orderBy: { startTime: "asc" },
        take: 3
      }),
      prisma.payment.findMany({
        where: {
          learnerId: user.id,
          ...(body.courseId ? { courseId: body.courseId } : {})
        },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);

    const learnerMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        courseId: body.courseId || null,
        sender: "USER",
        message: body.message
      },
      include: { course: true }
    });

    const reply = await generateChatbotReply({
      learnerName: user.fullName,
      question: body.message,
      teachingStyle: body.teachingStyle,
      course: enrollment?.course
        ? {
            title: enrollment.course.title,
            description: enrollment.course.description,
            category: enrollment.course.category,
            level: enrollment.course.level,
            duration: enrollment.course.duration
          }
        : null,
      context: {
        progress: enrollment?.progress,
        upcomingSessions: sessions.map((session) => ({ title: session.title, startTime: session.startTime })),
        payments: payments.map((payment) => ({
          amount: payment.amount,
          status: payment.status,
          receiptNumber: payment.receiptNumber,
          paymentMethod: payment.paymentMethod
        }))
      }
    });

    const [aiMessage] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          userId: user.id,
          courseId: body.courseId || null,
          sender: "AI_BOT",
          message: reply.message
        },
        include: { course: true }
      }),
      ...(enrollment?.course
        ? [
            prisma.automationTask.create({
              data: {
                trainerId: enrollment.course.trainerId,
                type: "CHATBOT_REPLY",
                title: `Chatbot reply: ${enrollment.course.title}`,
                description: `AI chatbot answered ${user.fullName}'s learner question for ${enrollment.course.title}.`,
                status: "COMPLETED",
                scheduledAt: new Date()
              }
            })
          ]
        : [])
    ]);

    return NextResponse.json({
      source: reply.source,
      messages: [formatMessage(learnerMessage), formatMessage(aiMessage)]
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function formatMessage(message: { id: string; sender: string; message: string; createdAt: Date; course: { id: string; title: string } | null }) {
  return {
    id: message.id,
    sender: message.sender,
    message: message.message,
    createdAt: message.createdAt.toISOString(),
    course: message.course ? { id: message.course.id, title: message.course.title } : null
  };
}
