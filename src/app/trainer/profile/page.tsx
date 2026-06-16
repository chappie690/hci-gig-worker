import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileBrandPreview } from "@/components/profile/profile-brand-preview";
import { ProfileForm } from "@/components/trainer/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TrainerProfilePage() {
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
    <AppShell user={user} title="Profile" subtitle="Trainer brand profile" activeHref="/trainer/profile">
      <PageSection
        eyebrow="Trainer profile"
        title="Edit your public trainer brand"
        description="Keep your brand name, positioning, skills, portfolio story, logo prompt, and social links ready for course pages and marketing campaigns."
      />

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm initialProfile={initialProfile} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile preview</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileBrandPreview
              user={user}
              fallbackBrandName={initialProfile.brandName}
              fallbackTagline={initialProfile.tagline}
              bio={initialProfile.bio}
              skills={initialProfile.skills}
              logoPrompt={initialProfile.logoPrompt}
              roleLabel="Trainer public profile preview"
            />
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
