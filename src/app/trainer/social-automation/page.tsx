import { redirect } from "next/navigation";
import { AISuggestionPanel } from "@/components/trainer/ai-suggestion-panel";
import { AppShell } from "@/components/layout/app-shell";
import { LinkedInPromotionAutomation } from "@/components/trainer/linkedin-promotion-automation";
import { TrainerFeatureGate } from "@/components/settings/subscription-access";
import { SocialAutomationManager } from "@/components/trainer/social-automation-manager";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SocialAutomationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [content, courses, profile] = await Promise.all([
    prisma.marketingContent.findMany({
      where: { trainerId: user.id },
      include: { course: { select: { title: true } } },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }]
    }),
    prisma.course.findMany({
      where: { trainerId: user.id },
      select: { id: true, title: true, description: true, category: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.trainerProfile.findUnique({
      where: { userId: user.id }
    })
  ]);

  const serializedContent = content.map((item) => ({
    id: item.id,
    platform: item.platform,
    generatedText: item.generatedText,
    scheduledAt: item.scheduledAt?.toISOString() ?? null,
    status: item.status,
    type: item.type,
    createdAt: item.createdAt.toISOString(),
    course: item.course
  }));

  return (
    <AppShell user={user} title="Social Automation" subtitle="Scheduled campaign operations" activeHref="/trainer/social-automation">
      <PageSection
        eyebrow="Social Media Automation"
        title="Schedule, post, and manage AI-generated campaigns"
        description="Use your saved marketing content as a simulated social posting queue. Scheduling creates automation tasks, and posting is simulated by moving records to posted status."
      />

      <TrainerFeatureGate user={user} feature="Social Automation" minimumPlan="Trainer Pro">
        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric label="Total content" value={String(content.length)} />
          <Metric label="Drafts" value={String(content.filter((item) => item.status === "DRAFT").length)} />
          <Metric label="Scheduled" value={String(content.filter((item) => item.status === "SCHEDULED").length)} />
          <Metric label="Posted" value={String(content.filter((item) => item.status === "POSTED").length)} />
        </section>

        <LinkedInPromotionAutomation
          courses={courses}
          trainerName={profile?.brandName ?? user.fullName}
          trainerTagline={profile?.tagline ?? "AI trainer on SkillPilot AI"}
          trainerEmail={user.email}
        />

        <AISuggestionPanel
          title="Plan safer social automation"
          description="Generate platform-specific caption ideas, hashtags, best time suggestions, post variations, and content calendar ideas. SkillPilot still requires you to schedule or mark posts manually."
          endpoint="/api/ai/social-automation"
          payload={{
            platform: serializedContent[0]?.platform ?? "LINKEDIN",
            content: serializedContent[0]?.generatedText ?? "Create a practical course launch post for AI trainers.",
            courseTitle: serializedContent[0]?.course?.title ?? "SkillPilot AI course"
          }}
          storageKey="skillpilot-social-ai-suggestions"
        />

        <SocialAutomationManager initialContent={serializedContent} />
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
