import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { generateJSON } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

const schedulingRequestSchema = z.object({
  courseId: z.string({ required_error: "Select a course first." }).trim().min(1, "Select a course first."),
  preferredDurationMinutes: z.number().int().min(30).max(240).optional()
});

const recommendationSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  reason: z.string(),
  conflicts: z.array(z.string()),
  learnerFit: z.string()
});

type ExistingSession = {
  title: string;
  startTime: Date;
  endTime: Date;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    assertRateLimit(`smart-scheduling:${user.id}`, 8);

    const body = schedulingRequestSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Select a course before asking SkillPilot to recommend a session time.");
    }));

    const [course, sessions] = await Promise.all([
      prisma.course.findFirst({
        where: { id: body.courseId, trainerId: user.id },
        include: { enrollments: { select: { learnerId: true } } }
      }),
      prisma.trainingSession.findMany({
        where: {
          trainerId: user.id,
          status: "SCHEDULED",
          startTime: { gte: new Date() }
        },
        orderBy: { startTime: "asc" },
        select: { title: true, startTime: true, endTime: true }
      })
    ]);

    if (!course) {
      throw new ValidationError("Select one of your courses.");
    }

    const fallback = buildRuleBasedRecommendation({
      courseTitle: course.title,
      learnerCount: course.enrollments.length,
      durationMinutes: body.preferredDurationMinutes ?? 90,
      sessions
    });

    const groq = await generateJSON({
      system:
        "You are SkillPilot AI's smart scheduling assistant. Recommend one practical training session time for a trainer. Use enrolled learner count, existing session conflicts, and demo availability assumptions. Return startTime, endTime, reason, conflicts, and learnerFit. Use ISO date strings for startTime and endTime. Do not book anything.",
      user: {
        courseTitle: course.title,
        learnerCount: course.enrollments.length,
        preferredDurationMinutes: body.preferredDurationMinutes ?? 90,
        existingSessions: sessions.map((session) => ({
          title: session.title,
          startTime: session.startTime.toISOString(),
          endTime: session.endTime.toISOString()
        })),
        fallbackSuggestion: fallback
      },
      schema: recommendationSchema,
      temperature: 0.25,
      maxTokens: 500
    });

    const recommendation = groq.ok ? normalizeRecommendation(groq.value, fallback, sessions) : fallback;

    return NextResponse.json({
      source: groq.ok ? "groq" : "local-fallback",
      recommendation
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function buildRuleBasedRecommendation({
  courseTitle,
  learnerCount,
  durationMinutes,
  sessions
}: {
  courseTitle: string;
  learnerCount: number;
  durationMinutes: number;
  sessions: ExistingSession[];
}) {
  const candidateHours = [20, 19, 18, 10, 14];
  const now = new Date();

  for (let dayOffset = 2; dayOffset <= 14; dayOffset += 1) {
    for (const hour of candidateHours) {
      const start = new Date(now);
      start.setDate(now.getDate() + dayOffset);
      start.setHours(hour, 0, 0, 0);

      if (start <= now) {
        continue;
      }

      const end = new Date(start.getTime() + durationMinutes * 60000);
      const conflicts = findConflicts(start, end, sessions);

      if (!conflicts.length) {
        const day = new Intl.DateTimeFormat("en", { weekday: "long" }).format(start);
        const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(start);

        return {
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          reason: `${day} ${time} is recommended because it avoids existing trainer session conflicts and fits a common after-hours learning window.`,
          conflicts,
          learnerFit: learnerCount
            ? `${learnerCount} enrolled learner${learnerCount === 1 ? "" : "s"} will be notified and can find this session in their learner calendar.`
            : `No learners are enrolled in ${courseTitle} yet, so this is a good prep session slot before promotion.`
        };
      }
    }
  }

  const start = new Date(now);
  start.setDate(now.getDate() + 7);
  start.setHours(20, 0, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    reason: "Friday 8:00 PM is recommended as a demo fallback because it is a common learner-friendly evening window.",
    conflicts: findConflicts(start, end, sessions),
    learnerFit: `${learnerCount} enrolled learner${learnerCount === 1 ? "" : "s"} will receive a session notification.`
  };
}

function normalizeRecommendation(
  value: z.infer<typeof recommendationSchema>,
  fallback: z.infer<typeof recommendationSchema>,
  sessions: ExistingSession[]
) {
  const start = new Date(value.startTime);
  const end = new Date(value.endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return fallback;
  }

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    reason: value.reason || fallback.reason,
    conflicts: findConflicts(start, end, sessions),
    learnerFit: value.learnerFit || fallback.learnerFit
  };
}

function findConflicts(start: Date, end: Date, sessions: ExistingSession[]) {
  return sessions
    .filter((session) => start < session.endTime && end > session.startTime)
    .map((session) => `${session.title} (${formatDate(session.startTime)} - ${formatTime(session.endTime)})`);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}
