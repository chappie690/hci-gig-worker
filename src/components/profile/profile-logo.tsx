"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  getDisplayLogo,
  getInitials,
  findStoredProfileBranding,
  getStoredProfileBranding,
  profileEventName,
  type ProfileBrandingOverride
} from "@/lib/profile-branding";

export function useProfileBranding(user?: { fullName?: string; email?: string } | null) {
  const [branding, setBranding] = useState<ProfileBrandingOverride>({});

  useEffect(() => {
    function loadBranding() {
      setBranding(user?.email ? getStoredProfileBranding(user.email) : findStoredProfileBranding(user?.fullName));
    }

    const timer = window.setTimeout(loadBranding, 0);
    window.addEventListener(profileEventName, loadBranding);
    window.addEventListener("storage", loadBranding);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(profileEventName, loadBranding);
      window.removeEventListener("storage", loadBranding);
    };
  }, [user?.email, user?.fullName]);

  return branding;
}

export function ProfileLogo({
  user,
  logoUrl,
  className,
  label = "Profile logo"
}: {
  user?: { fullName?: string; email?: string } | null;
  logoUrl?: string;
  className?: string;
  label?: string;
}) {
  const branding = useProfileBranding(user);
  const displayName = branding.brandName || branding.fullName || user?.fullName || "SkillPilot Profile";
  const activeLogoUrl = logoUrl || getDisplayLogo(branding);
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  return (
    <span
      aria-label={label}
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-ink/10 bg-blue-600 bg-cover bg-center text-xs font-black text-white",
        className
      )}
      role="img"
      style={activeLogoUrl ? { backgroundImage: `url(${activeLogoUrl})` } : undefined}
    >
      {!activeLogoUrl ? initials || "SP" : null}
    </span>
  );
}

export function ProfileIdentity({
  user,
  fallbackName,
  fallbackEmail,
  logoClassName
}: {
  user?: { fullName?: string; email?: string } | null;
  fallbackName?: string;
  fallbackEmail?: string;
  logoClassName?: string;
}) {
  const branding = useProfileBranding(user);
  const name = branding.brandName || branding.fullName || fallbackName || user?.fullName || "SkillPilot Profile";
  const email = branding.email || fallbackEmail || user?.email || "";
  const tagline = branding.tagline;

  return (
    <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden">
      <ProfileLogo user={user} className={logoClassName} label={`${name} active logo`} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-sm font-bold text-ink dark:text-slate-100">{name}</p>
        {tagline ? <p className="truncate text-xs text-ink/55 dark:text-slate-300">{tagline}</p> : <p className="truncate text-xs text-ink/55 dark:text-slate-300">{email}</p>}
      </div>
    </div>
  );
}
