"use client";

import { ProfileLogo, useProfileBranding } from "@/components/profile/profile-logo";

export function ProfileBrandPreview({
  user,
  fallbackBrandName,
  fallbackTagline,
  bio,
  skills,
  logoPrompt,
  roleLabel = "Profile"
}: {
  user: { fullName: string; email: string };
  fallbackBrandName: string;
  fallbackTagline: string;
  bio: string;
  skills?: string;
  logoPrompt?: string;
  roleLabel?: string;
}) {
  const branding = useProfileBranding(user);
  const brandName = branding.brandName || fallbackBrandName;
  const tagline = branding.tagline || fallbackTagline;

  return (
    <>
      <div className="rounded-lg bg-[linear-gradient(135deg,#17211d,#1d4ed8_48%,#7c3aed)] p-5 text-white">
        <div className="flex items-start gap-4">
          <ProfileLogo user={user} className="h-16 w-16 border-white/20" label={`${roleLabel} active logo`} />
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-white/70">{brandName}</p>
            <h2 className="mt-3 text-2xl font-bold">{tagline}</h2>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-white/75">{bio}</p>
      </div>
      {skills ? (
        <div className="mt-4 rounded-lg border border-ink/10 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">Skills</p>
          <p className="mt-2 text-sm leading-6 text-ink/70">{skills}</p>
        </div>
      ) : null}
      {logoPrompt ? (
        <div className="mt-4 rounded-lg border border-ink/10 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">Logo prompt</p>
          <p className="mt-2 text-sm leading-6 text-ink/70">{logoPrompt}</p>
        </div>
      ) : null}
    </>
  );
}
