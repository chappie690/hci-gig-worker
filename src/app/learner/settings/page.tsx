import { redirect } from "next/navigation";
import { RoleShell } from "@/components/layout/role-shell";
import { HFLogoGenerator } from "@/components/settings/hf-logo-generator";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LearnerSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <RoleShell user={user} label="Learner workspace" title="Settings" activeHref="/learner/settings">
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <ProfileSettingsForm user={user} roleLabel="Learner" />

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Prototype preferences</p>
          <h2 className="mt-3 text-2xl font-black text-ink">Customization lives on the dashboard.</h2>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            XP-based dashboard customizations, chatbot teaching style, and purchase success state are saved locally in this browser for the HCI prototype. Account, enrollment, payment, and notification records still come from the database.
          </p>
        </div>
      </section>

      <div className="mt-5">
        <HFLogoGenerator user={user} roleLabel="Learner" />
      </div>
    </RoleShell>
  );
}
