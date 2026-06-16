import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BrandingStudio } from "@/components/trainer/branding-studio";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { isGroqConfigured } from "@/lib/groq";
import { prisma } from "@/lib/prisma";

export default async function AIBrandingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: user.id }
  });

  return (
    <AppShell user={user} title="AI Branding" subtitle="Brand generation studio" activeHref="/trainer/ai-branding">
      <PageSection
        eyebrow="AI Branding Studio"
        title="Generate trainer positioning in seconds"
        description="Use your niche, audience, tone, and skills to create brand name ideas, a tagline, bio, portfolio summary, and logo prompt."
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Metric label="AI mode" value={isGroqConfigured() ? "Groq" : "Local mock"} />
        <Metric label="Profile" value={profile ? "Ready" : "New"} />
        <Metric label="Marketing save" value="Drafts" />
      </section>

      <BrandingStudio initialSkills={profile?.skills ?? ""} socialLinks={profile?.socialLinks ?? "{}"} />
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
