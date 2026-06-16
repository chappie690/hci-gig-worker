"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GlobalSearch } from "@/components/layout/global-search";
import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getDisplayLogo, getInitials, profileEventName, profileStorageKey, type ProfileBrandingOverride } from "@/lib/profile-branding";

export { profileEventName, profileStorageKey };

type User = {
  fullName: string;
  email: string;
  role?: string;
};

export function HeaderActions({
  user,
  dashboardHref,
  showSearch = true,
  showLogout = true
}: {
  user?: User | null;
  dashboardHref?: string;
  showSearch?: boolean;
  showLogout?: boolean;
}) {
  const [override, setOverride] = useState<ProfileBrandingOverride>({});

  useEffect(() => {
    function loadProfile() {
      if (!user?.email) {
        return;
      }

      try {
        const stored = JSON.parse(window.localStorage.getItem(profileStorageKey) ?? "{}") as Record<string, ProfileBrandingOverride>;
        setOverride(stored[user.email] ?? {});
      } catch {
        window.localStorage.removeItem(profileStorageKey);
      }
    }

    const timer = window.setTimeout(loadProfile, 0);
    window.addEventListener(profileEventName, loadProfile);
    window.addEventListener("storage", loadProfile);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(profileEventName, loadProfile);
      window.removeEventListener("storage", loadProfile);
    };
  }, [user?.email]);

  const display = useMemo(() => ({
    fullName: override.brandName || override.fullName || user?.fullName || "",
    email: override.email || user?.email || "",
    avatarUrl: getDisplayLogo(override),
    tagline: override.tagline || ""
  }), [override, user]);
  const initials = getInitials(display.fullName);

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
      {showSearch ? <GlobalSearch role={user?.role} /> : null}
      <ThemeToggle />
      {user ? (
        <>
          <NotificationBell role={user.role} />
          <div className="hidden min-w-0 items-center gap-3 rounded-2xl border border-ink/10 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex">
            <Avatar initials={initials} avatarUrl={display.avatarUrl} />
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-ink dark:text-slate-100">{display.fullName}</p>
              <p className="truncate text-xs text-ink/55 dark:text-slate-300">{display.tagline || display.email}</p>
            </div>
          </div>
          {dashboardHref ? (
            <Link className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-950 transition hover:scale-[1.02] hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 motion-reduce:hover:scale-100" href={dashboardHref}>
              Go to Dashboard
            </Link>
          ) : null}
          {showLogout ? <LogoutButton /> : null}
        </>
      ) : null}
    </div>
  );
}

export function Avatar({ initials, avatarUrl }: { initials: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return <span aria-hidden="true" className="h-10 w-10 rounded-2xl border border-ink/10 bg-cover bg-center" style={{ backgroundImage: `url(${avatarUrl})` }} />;
  }

  return (
    <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600 text-xs font-black text-white">
      {initials || "SP"}
    </span>
  );
}
