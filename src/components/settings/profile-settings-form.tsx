"use client";

import { useEffect, useState } from "react";
import { Avatar, profileEventName, profileStorageKey } from "@/components/layout/header-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDisplayLogo, getInitials, type ProfileBrandingOverride } from "@/lib/profile-branding";

export function ProfileSettingsForm({
  user,
  roleLabel
}: {
  user: { fullName: string; email: string; role?: string };
  roleLabel: string;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [activeLogoUrl, setActiveLogoUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    function loadProfile() {
      try {
        const stored = JSON.parse(window.localStorage.getItem(profileStorageKey) ?? "{}") as Record<string, ProfileBrandingOverride>;
        const profile = stored[user.email] ?? {};
        setAvatarUrl(profile.avatarUrl ?? "");
        setActiveLogoUrl(getDisplayLogo(profile));
        setBrandName(profile.brandName ?? "");
        setTagline(profile.tagline ?? "");
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
  }, [user.email]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to save profile." });
      return;
    }

    try {
      const stored = JSON.parse(window.localStorage.getItem(profileStorageKey) ?? "{}") as Record<string, ProfileBrandingOverride>;
      const existing = stored[user.email] ?? {};
      delete stored[user.email];
      stored[email] = { ...existing, fullName, email, avatarUrl, activeLogoUrl: existing.activeLogoUrl || avatarUrl };
      window.localStorage.setItem(profileStorageKey, JSON.stringify(stored));
      window.dispatchEvent(new Event(profileEventName));
    } catch {
      window.localStorage.removeItem(profileStorageKey);
    }

    setMessage({ type: "success", text: "Profile saved. Header identity updated." });
  }

  const initials = getInitials(brandName || fullName);

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar initials={initials} avatarUrl={activeLogoUrl || avatarUrl} />
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">{roleLabel} profile</p>
          <h2 className="mt-1 text-2xl font-black text-ink">{brandName || fullName}</h2>
          <p className="text-sm text-ink/55">{tagline || email}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-ink/10 bg-cloud p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">Current active logo</p>
        <div className="mt-3 flex items-center gap-3">
          <Avatar initials={initials} avatarUrl={activeLogoUrl || avatarUrl} />
          <p className="text-sm leading-6 text-ink/65">
            {activeLogoUrl ? "Generated/profile logo is active across dashboard, previews, posts, and receipts." : "No generated logo applied yet. Generate one below to activate it."}
          </p>
        </div>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={save}>
        <Input label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input label="Profile picture / avatar URL" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." />
        {message ? (
          <p className={message.type === "success" ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700" : "rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"} aria-live="polite">
            {message.text}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </section>
  );
}
