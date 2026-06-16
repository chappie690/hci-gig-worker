import Link from "next/link";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { Button } from "@/components/ui/button";

export function TrainerProfileSummary({
  user,
  profile
}: {
  user: { fullName: string; email: string };
  profile: {
    brandName: string;
    tagline: string;
    bio: string;
    skills: string;
    portfolioSummary: string;
  };
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <ProfileLogo user={user} className="h-16 w-16" label={`${profile.brandName} trainer logo`} />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Trainer brand profile</p>
            <h2 className="mt-2 text-2xl font-black text-ink">{profile.brandName}</h2>
            <p className="mt-1 text-sm font-semibold text-moss">{profile.tagline}</p>
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link href="/trainer/settings">Edit Profile</Link>
        </Button>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-ink/10 bg-cloud p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">Portfolio summary</p>
          <p className="mt-2 line-clamp-4 text-sm leading-6 text-ink/70">{profile.portfolioSummary}</p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-cloud p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">Skills summary</p>
          <p className="mt-2 line-clamp-4 text-sm leading-6 text-ink/70">{profile.skills}</p>
        </div>
      </div>
    </section>
  );
}
