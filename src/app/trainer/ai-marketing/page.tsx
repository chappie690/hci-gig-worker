import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { HFMarketingAssetsPanel } from "@/components/trainer/hf-marketing-assets-panel";
import { MarketingGenerator } from "@/components/trainer/marketing-generator";
import { TrainerFeatureGate } from "@/components/settings/subscription-access";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { isGroqConfigured } from "@/lib/groq";
import { prisma } from "@/lib/prisma";

export default async function AIMarketingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [courses, recentContent, profile] = await Promise.all([
    prisma.course.findMany({
      where: { trainerId: user.id },
      orderBy: [{ status: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        level: true,
        status: true
      }
    }),
    prisma.marketingContent.findMany({
      where: { trainerId: user.id },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.trainerProfile.findUnique({
      where: { userId: user.id }
    })
  ]);

  return (
    <AppShell user={user} title="AI Marketing" subtitle="Campaign generator" activeHref="/trainer/ai-marketing">
      <PageSection
        eyebrow="AI Marketing Generator"
        title="Generate full AI-powered campaigns for every channel"
        description="Use Groq through SkillPilot's server-side API route to generate marketing copy, course descriptions, email campaigns, promo messages, ads, hashtags, SEO keywords, audience suggestions, and performance tips."
      />

      <TrainerFeatureGate user={user} feature="AI Marketing" minimumPlan="Trainer Pro">
        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <Metric label="Courses available" value={String(courses.length)} />
          <Metric label="AI mode" value={isGroqConfigured() ? "Groq" : "Local mock"} />
          <Metric label="Recent drafts" value={String(recentContent.filter((item) => item.status === "DRAFT").length)} />
        </section>

        <MarketingGenerator courses={courses} trainer={{ fullName: profile?.brandName ?? user.fullName, email: user.email, tagline: profile?.tagline ?? undefined }} />

        <HFMarketingAssetsPanel courses={courses} trainerName={profile?.brandName ?? user.fullName} />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent marketing content</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentContent.map((item) => (
              <div key={item.id} className="rounded-lg border border-ink/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{item.platform.toLowerCase()}</Badge>
                    <Badge className="bg-cloud text-ink/70">{item.type.toLowerCase()}</Badge>
                  </div>
                  <Badge>{item.status.toLowerCase()}</Badge>
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{item.course?.title ?? "Brand content"}</p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{item.generatedText}</p>
                {item.scheduledAt ? (
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-moss">Scheduled for {formatDate(item.scheduledAt)}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </TrainerFeatureGate>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-ink/55">{label}</p>
        <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
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
