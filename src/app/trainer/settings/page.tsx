import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { HFLogoGenerator } from "@/components/settings/hf-logo-generator";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { TrainerPortfolioBuilder } from "@/components/trainer/trainer-portfolio-builder";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TrainerSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: user.id }
  });
  const initialProfile = {
    brandName: profile?.brandName ?? `${user.fullName} AI Training`,
    tagline: profile?.tagline ?? "Practical AI training for modern teams",
    bio: profile?.bio ?? "I help teams learn practical AI workflows through short, applied training programs.",
    skills: profile?.skills ?? "AI training, prompt systems, workflow automation",
    portfolioSummary: profile?.portfolioSummary ?? "New trainer profile ready for portfolio examples and client outcomes.",
    logoPrompt: profile?.logoPrompt ?? "Modern AI trainer logo with blue and purple SaaS styling.",
    socialLinks: profile?.socialLinks ?? "{}"
  };

  return (
    <AppShell user={user} title="Settings" subtitle="Workspace preferences" activeHref="/trainer/settings">
      <PageSection
        eyebrow="Settings"
        title="Trainer workspace preferences"
        description="Update your account identity, avatar, and prototype preferences. Name and email are saved to the database; avatar is stored locally for the HCI prototype."
      />
      <section className="grid gap-4 md:grid-cols-2">
        <ProfileSettingsForm user={user} roleLabel="Trainer" />
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-ink/55">Prototype mode</p>
            <p className="mt-2 text-xl font-bold text-ink">Local SQLite + mock AI fallback</p>
            <p className="mt-1 text-sm text-ink/60">No paid services are required to run the app locally.</p>
          </CardContent>
        </Card>
      </section>
      <div className="mt-5 grid gap-5">
        <TrainerPortfolioBuilder user={user} initialProfile={initialProfile} />
        <HFLogoGenerator user={user} roleLabel="Trainer" />
      </div>
    </AppShell>
  );
}
