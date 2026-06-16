import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProgressUpdater } from "@/components/learner/progress-updater";
import { RoleShell } from "@/components/layout/role-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type LearnerCoursePageProps = {
  params: Promise<{ id: string }>;
};

export default async function LearnerCoursePage({ params }: LearnerCoursePageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      learnerId: user.id,
      courseId: id
    },
    include: {
      course: {
        include: {
          trainer: { include: { trainerProfile: true } },
          trainingSessions: {
            orderBy: { startTime: "asc" },
            take: 4
          },
          chatMessages: {
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 4
          }
        }
      },
      payment: true
    }
  });

  if (!enrollment) {
    notFound();
  }

  const course = enrollment.course;

  return (
    <RoleShell user={user} label="Learner workspace" title={course.title} activeHref="/learner/courses">
      <div className="mb-5">
        <Link className="text-sm font-semibold text-moss hover:text-ink" href="/learner/dashboard">
          Back to dashboard
        </Link>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{course.category}</Badge>
              <Badge className="bg-cloud text-ink/65">{course.level}</Badge>
              <Badge className="bg-cloud text-ink/65">{course.duration}</Badge>
            </div>
            <CardTitle className="mt-4 text-2xl">{course.title}</CardTitle>
            <p className="text-sm leading-6 text-ink/65">{course.description}</p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-ink/10 bg-cloud p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Course content placeholder</p>
              <h2 className="mt-3 text-xl font-bold text-ink">Module 1: Build the operating workflow</h2>
              <p className="mt-3 text-sm leading-6 text-ink/65">
                This lesson area is ready for videos, downloadable worksheets, prompts, quizzes, and trainer notes. The current build saves learner progress to the Prisma database so completed modules can drive certificates and reminders later.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <LessonCard title="Lesson video" status="Ready" />
                <LessonCard title="Prompt worksheet" status="Ready" />
                <LessonCard title="Practice task" status="Next" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <ProgressUpdater enrollmentId={enrollment.id} initialProgress={enrollment.progress} initialStatus={enrollment.status} />

          <Card>
            <CardHeader>
              <CardTitle>Trainer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{course.trainer.trainerProfile?.brandName ?? course.trainer.fullName}</p>
              <p className="mt-2 text-sm font-medium text-moss">{course.trainer.trainerProfile?.tagline}</p>
              <p className="mt-3 text-sm leading-6 text-ink/65">{course.trainer.trainerProfile?.bio}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{enrollment.payment.receiptNumber}</p>
                  <p className="text-sm text-ink/55">{enrollment.payment.paymentMethod}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(enrollment.payment.amount)}</p>
                  <Badge>{enrollment.payment.status.toLowerCase()}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Training sessions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {course.trainingSessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-ink/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{session.title}</p>
                  <Badge>{session.status.toLowerCase()}</Badge>
                </div>
                <p className="mt-2 text-sm text-ink/65">{formatDate(session.startTime)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI chatbot history</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {course.chatMessages.map((message) => (
              <div key={message.id} className="rounded-lg border border-ink/10 p-4">
                <Badge>{message.sender.toLowerCase()}</Badge>
                <p className="mt-3 text-sm leading-6 text-ink/70">{message.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </RoleShell>
  );
}

function LessonCard({ title, status }: { title: string; status: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink/55">{status}</p>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
