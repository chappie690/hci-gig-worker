import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DemoReviewsPanel } from "@/components/trainer/demo-reviews-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TrainerReviewsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const courses = await prisma.course.findMany({
    where: { trainerId: user.id },
    include: { enrollments: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <AppShell user={user} title="Reviews" subtitle="Learner feedback" activeHref="/trainer/reviews">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course, index) => {
          const completed = course.enrollments.filter((enrollment) => enrollment.status === "COMPLETED").length;

          return (
            <Card key={course.id} className="transition hover:-translate-y-1 hover:shadow-soft motion-reduce:hover:translate-y-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-bold text-ink dark:text-slate-100">{course.title}</h2>
                  <Badge>{completed > 0 ? "review ready" : "collecting"}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/65 dark:text-slate-300">
                  {completed} completed learners. Suggested demo rating: {(4.6 + (index % 3) * 0.1).toFixed(1)} / 5.
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <DemoReviewsPanel />
    </AppShell>
  );
}
