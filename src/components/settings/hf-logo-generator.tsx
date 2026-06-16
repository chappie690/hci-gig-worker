"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getDisplayLogo, getInitials, getStoredProfileBranding, saveProfileBranding } from "@/lib/profile-branding";

type LogoResult = {
  imageUrl: string;
  source: "huggingface" | "fallback";
  modelUsed: string;
  promptUsed: string;
  concept: string;
  safeErrorCode?: string;
  safeErrorMessage?: string;
  errorMessage?: string;
};

export function HFLogoGenerator({
  user,
  roleLabel
}: {
  user: { fullName: string; email: string; role?: string };
  roleLabel: "Learner" | "Trainer";
}) {
  const [logoStyle, setLogoStyle] = useState("minimalist geometric app icon");
  const [logoNiche, setLogoNiche] = useState(roleLabel === "Trainer" ? "AI trainer and course creator" : "AI learner building a skills portfolio");
  const [logoTone, setLogoTone] = useState(roleLabel === "Trainer" ? "professional and confident" : "friendly and aspirational");
  const [logoAudience, setLogoAudience] = useState(roleLabel === "Trainer" ? "learners, founders, and AI gig workers" : "future employers, trainers, and peers");
  const [logoPalette, setLogoPalette] = useState("premium blue, electric purple, dark slate, clean white");
  const [logo, setLogo] = useState<LogoResult | null>(null);
  const [activeLogoUrl, setActiveLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    function loadBranding() {
      setActiveLogoUrl(getDisplayLogo(getStoredProfileBranding(user.email)));
    }

    const timer = window.setTimeout(loadBranding, 0);
    window.addEventListener("skillpilot-profile-updated", loadBranding);
    window.addEventListener("storage", loadBranding);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("skillpilot-profile-updated", loadBranding);
      window.removeEventListener("storage", loadBranding);
    };
  }, [user.email]);

  const initials = useMemo(() => getInitials(user.fullName), [user.fullName]);

  async function generateLogo() {
    const branding = getStoredProfileBranding(user.email);
    const brandName = branding.brandName || user.fullName;
    const tagline = branding.tagline || "SkillPilot AI profile brand";
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/ai/huggingface/logo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName,
        tagline,
        niche: logoNiche,
        tone: logoTone,
        logoStyle,
        audience: logoAudience,
        colorPalette: logoPalette
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot could not generate a logo preview." });
      return;
    }

    setLogo(data);
    setMessage({
      type: "success",
      text: data?.source === "huggingface"
        ? "Hugging Face logo generated."
        : `Demo fallback shown because Hugging Face image generation failed. Safe code: ${data?.safeErrorCode ?? "unknown_error"}.`
    });
  }

  function applyLogo() {
    if (!logo) {
      return;
    }

    const branding = getStoredProfileBranding(user.email);
    saveProfileBranding(user.email, {
      fullName: user.fullName,
      email: user.email,
      activeLogoUrl: logo.imageUrl,
      avatarUrl: logo.imageUrl,
      logoSource: logo.source,
      brandName: branding.brandName,
      tagline: branding.tagline
    });
    window.localStorage.setItem("skillpilot-hf-logo-previews", JSON.stringify({ [user.email]: logo }));
    setActiveLogoUrl(logo.imageUrl);
    setMessage({ type: "success", text: "Logo saved and applied as your active profile logo." });
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Hugging Face logo generator</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Generate AI Logo</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
            AI generates the logo symbol only. Brand name and tagline are displayed separately for cleaner results.
          </p>
        </div>
        <Button type="button" onClick={generateLogo} disabled={loading}>
          {loading ? "Generating Logo..." : logo ? "Generate Again" : "Generate Logo"}
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-cloud p-4">
        <span
          aria-label={`${roleLabel} active profile logo`}
          className="grid h-14 w-14 place-items-center rounded-2xl border border-ink/10 bg-blue-600 bg-cover bg-center text-sm font-black text-white"
          role="img"
          style={activeLogoUrl ? { backgroundImage: `url(${activeLogoUrl})` } : undefined}
        >
          {!activeLogoUrl ? initials : null}
        </span>
        <div>
          <p className="text-sm font-bold text-ink">Current active logo</p>
          <p className="text-sm text-ink/60">{activeLogoUrl ? "This logo is applied across your identity surfaces." : "Generate and apply a logo to activate it."}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <TextField label="Niche" value={logoNiche} onChange={setLogoNiche} />
        <TextField label="Tone" value={logoTone} onChange={setLogoTone} />
        <TextField label="Logo style" value={logoStyle} onChange={setLogoStyle} />
        <TextField label="Audience" value={logoAudience} onChange={setLogoAudience} />
        <TextField label="Color palette" value={logoPalette} onChange={setLogoPalette} />
      </div>

      {loading ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(280px,512px)_1fr]" aria-live="polite">
          <div className="aspect-square w-full max-w-[512px] animate-pulse rounded-[2rem] border border-purple-100 bg-gradient-to-br from-slate-100 via-blue-100 to-purple-100 shadow-xl" />
          <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 animate-ping rounded-full bg-purple-600" aria-hidden="true" />
              <p className="text-sm font-bold text-purple-700">Hugging Face is generating a clean logo symbol...</p>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className={cn("mt-5 rounded-xl px-3 py-2 text-sm font-semibold", message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")} aria-live="polite">
          {message.text}
        </p>
      ) : null}

      {logo ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(280px,512px)_1fr]">
          <span
            className="block aspect-square w-full max-w-[512px] rounded-[2rem] border border-ink/10 bg-cover bg-center shadow-xl"
            style={{ backgroundImage: `url(${logo.imageUrl})` }}
            aria-label={`Generated logo preview for ${user.fullName}`}
            role="img"
          />
          <div className="grid gap-3">
            {logo.source === "fallback" ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
                Demo fallback shown because Hugging Face image generation failed. Safe code: {logo.safeErrorCode ?? "unknown_error"}.
              </p>
            ) : null}
            <LogoInfo label="Logo source" value={logo.source === "huggingface" ? "Hugging Face image model" : "Improved SkillPilot fallback"} />
            <LogoInfo label="Model used" value={logo.modelUsed} />
            <LogoInfo label="Logo concept" value={logo.concept} />
            <LogoInfo label="Image prompt" value={logo.promptUsed} />
            {logo.safeErrorMessage || logo.errorMessage ? <LogoInfo label="Safe error reason" value={logo.safeErrorMessage ?? logo.errorMessage ?? ""} /> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={applyLogo}>Apply Logo to Profile</Button>
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition duration-200 hover:bg-limewash active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                href={logo.imageUrl}
                download={`${user.fullName.replace(/\s+/g, "-").toLowerCase()}-logo-preview.png`}
              >
                Download Logo
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input
        className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function LogoInfo({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-ink/10 bg-cloud p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/70">{value}</p>
    </article>
  );
}
