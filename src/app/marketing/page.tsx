import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MarketingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, content, tasks] = await Promise.all([
    prisma.trainerProfile.findUnique({ where: { userId: user.id } }),
    prisma.marketingContent.findMany({
      where: { trainerId: user.id },
      include: { course: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.automationTask.findMany({
      where: { trainerId: user.id },
      orderBy: { scheduledAt: "asc" },
      take: 4
    })
  ]);

  return (
    <AppShell user={user} title="Marketing" subtitle="AI brand and campaigns" activeHref="/trainer/marketing">
      <PageSection
        eyebrow="Growth desk"
        title="Plan content, brand assets, and automated campaigns"
        description="Review AI-generated content drafts, scheduled posts, and brand positioning in one place before publishing."
      />

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Trainer brand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-[linear-gradient(135deg,#17211d,#54745d)] p-5 text-white">
              <p className="text-sm uppercase tracking-[0.18em] text-white/70">{profile?.brandName ?? "SkillPilot Trainer"}</p>
              <h2 className="mt-3 text-2xl font-bold">{profile?.tagline ?? "AI trainer brand system"}</h2>
              <p className="mt-4 text-sm leading-6 text-white/75">{profile?.portfolioSummary}</p>
            </div>
            <div className="mt-4 rounded-lg border border-ink/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">Logo prompt</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">{profile?.logoPrompt}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content pipeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {content.map((item) => (
              <div key={item.id} className="rounded-lg border border-ink/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{item.platform.toLowerCase()}</Badge>
                    <Badge className="bg-cloud text-ink/70">{item.type.toLowerCase()}</Badge>
                  </div>
                  <Badge>{item.status.toLowerCase()}</Badge>
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{item.course?.title ?? "Brand content"}</p>
                <p className="mt-2 text-sm leading-6 text-ink/70">{item.generatedText}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Automation calendar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-lg border border-ink/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{task.title}</p>
                <Badge>{task.status.toLowerCase()}</Badge>
              </div>
              <p className="mt-2 text-sm text-ink/65">{task.description}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-moss">{formatDate(task.scheduledAt)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
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
