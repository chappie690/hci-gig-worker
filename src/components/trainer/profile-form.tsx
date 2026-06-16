"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ProfileFormState = {
  brandName: string;
  tagline: string;
  bio: string;
  skills: string;
  portfolioSummary: string;
  logoPrompt: string;
  socialLinks: string;
};

export function ProfileForm({ initialProfile }: { initialProfile: ProfileFormState }) {
  const router = useRouter();
  const [form, setForm] = useState(initialProfile);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/trainer/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to save profile." });
      return;
    }

    setMessage({ type: "success", text: "Trainer profile saved." });
    router.refresh();
  }

  function update(field: keyof ProfileFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      {message ? (
        <div className={message.type === "success" ? "rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" : "rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"}>
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <TextField label="Brand name" value={form.brandName} onChange={(value) => update("brandName", value)} />
        <TextField label="Tagline" value={form.tagline} onChange={(value) => update("tagline", value)} />
      </div>
      <TextArea label="Bio" value={form.bio} onChange={(value) => update("bio", value)} rows={5} />
      <TextArea label="Skills" value={form.skills} onChange={(value) => update("skills", value)} rows={3} />
      <TextArea label="Portfolio summary" value={form.portfolioSummary} onChange={(value) => update("portfolioSummary", value)} rows={5} />
      <TextArea label="Logo prompt" value={form.logoPrompt} onChange={(value) => update("logoPrompt", value)} rows={4} />
      <TextArea label="Social links" value={form.socialLinks} onChange={(value) => update("socialLinks", value)} rows={4} />
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <input
        className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <textarea
        className="resize-y rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        required
      />
    </label>
  );
}
