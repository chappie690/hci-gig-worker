"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getDisplayLogo, getStoredProfileBranding, saveProfileBranding } from "@/lib/profile-branding";

type BrandingKit = {
  brandName: string;
  tagline: string;
  shortBio: string;
  portfolioSummary: string;
  logoConcept: string;
  logoPrompt: string;
  colorPalette: string[];
  fontStyle: string;
  socialMediaBio: string;
  profileHeadline: string;
  skillsSummary: string;
};

type LogoResult = {
  imageUrl: string;
  imageDataUrl?: string;
  source: "huggingface" | "fallback";
  modelUsed: string;
  promptUsed: string;
  prompt?: string;
  concept: string;
  safeErrorCode?: string;
  safeErrorMessage?: string;
  errorMessage?: string;
  message?: string;
};

const brandingStorageKey = "skillpilot-mock-branding-kits";

export function MockBrandingGenerator({
  user,
  roleLabel
}: {
  user: { fullName: string; email: string; role?: string };
  roleLabel: "Learner" | "Trainer";
}) {
  const [kit, setKit] = useState<BrandingKit | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoStyle, setLogoStyle] = useState("minimalist geometric app icon");
  const [logoNiche, setLogoNiche] = useState(roleLabel === "Trainer" ? "AI trainer and course creator" : "AI learner building a skills portfolio");
  const [logoTone, setLogoTone] = useState(roleLabel === "Trainer" ? "professional and confident" : "friendly and aspirational");
  const [logoAudience, setLogoAudience] = useState(roleLabel === "Trainer" ? "learners, founders, and AI gig workers" : "future employers, trainers, and peers");
  const [logoPalette, setLogoPalette] = useState("premium blue, electric purple, dark slate, clean white");
  const [logo, setLogo] = useState<LogoResult | null>(null);
  const [activeLogoUrl, setActiveLogoUrl] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    function loadBranding() {
      const stored = readStoredKits();
      setKit(stored[user.email] ?? null);
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

  const initials = useMemo(() => {
    const source = kit?.brandName || user.fullName;
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [kit?.brandName, user.fullName]);

  async function generateBranding() {
    setLoading(true);
    setMessage(null);

    const [response] = await Promise.all([
      fetch("/api/mock-branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleLabel.toUpperCase() })
      }),
      delay(1200)
    ]);
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot could not craft a mock brand kit. Please try again." });
      return;
    }

    setKit(data.branding);
    setMessage({ type: "success", text: "AI Generated Branding is ready to review." });
  }

  function saveBranding() {
    if (!kit) {
      return;
    }

    const stored = readStoredKits();
    window.localStorage.setItem(brandingStorageKey, JSON.stringify({ ...stored, [user.email]: kit }));
    setMessage({ type: "success", text: "Brand kit saved locally for this demo profile." });
  }

  async function applyBranding() {
    if (!kit) {
      return;
    }

    saveBranding();
    storeProfilePreview(kit);

    if (roleLabel === "Trainer") {
      const response = await fetch("/api/trainer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: kit.brandName,
          tagline: kit.tagline,
          bio: kit.shortBio,
          skills: kit.skillsSummary,
          portfolioSummary: kit.portfolioSummary,
          logoPrompt: kit.logoPrompt,
          socialLinks: JSON.stringify({ bio: kit.socialMediaBio, headline: kit.profileHeadline })
        })
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage({ type: "error", text: data?.message ?? "Branding saved locally, but trainer profile could not be updated." });
        return;
      }
    }

    setMessage({ type: "success", text: roleLabel === "Trainer" ? "Branding applied to TrainerProfile and local preview." : "Branding applied to your learner profile preview." });
  }

  async function copyBrandKit() {
    if (!kit) {
      return;
    }

    await navigator.clipboard.writeText(formatKit(kit));
    setMessage({ type: "success", text: "Brand kit copied to clipboard." });
  }

  async function generateLogo() {
    const brandName = kit?.brandName || user.fullName;
    const tagline = kit?.tagline || "SkillPilot AI profile brand";
    setLogoLoading(true);
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
    setLogoLoading(false);

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

  function saveLogo() {
    if (!logo) {
      return;
    }

    const stored = readStoredLogos();
    window.localStorage.setItem("skillpilot-hf-logo-previews", JSON.stringify({ ...stored, [user.email]: logo }));
    storeProfilePreview(kit, logo.imageUrl);
    setActiveLogoUrl(logo.imageUrl);
    setMessage({ type: "success", text: "Logo preview saved and set as your active profile logo." });
  }

  function applyLogo() {
    if (!logo) {
      return;
    }

    saveLogo();
    storeProfilePreview(kit, logo.imageUrl);
    setActiveLogoUrl(logo.imageUrl);
    setMessage({ type: "success", text: "Logo preview applied as your active profile logo." });
  }

  function storeProfilePreview(nextKit: BrandingKit | null, logoPreviewUrl?: string) {
    try {
      const activeKit = nextKit ?? kit;
      const nextLogo = logoPreviewUrl || activeLogoUrl;
      saveProfileBranding(user.email, {
        fullName: user.fullName,
        email: user.email,
        brandingPreview: activeKit ?? undefined,
        brandName: activeKit?.brandName,
        tagline: activeKit?.tagline,
        activeLogoUrl: nextLogo || undefined,
        avatarUrl: nextLogo || undefined,
        logoSource: logoPreviewUrl ? logo?.source : undefined
      });
    } catch {
      setMessage({ type: "error", text: "Could not apply branding locally. Please try again." });
    }
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">AI Generated Branding</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Mock brand identity generator</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">
            Generate a prebuilt SkillPilot brand kit for your {roleLabel.toLowerCase()} profile. This mock feature uses a local backend route only.
          </p>
        </div>
        <Button type="button" onClick={generateBranding} disabled={loading}>
          {loading ? "Generating..." : kit ? "Generate Again" : "Generate Branding"}
        </Button>
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-ping rounded-full bg-blue-600" aria-hidden="true" />
            <p className="text-sm font-bold text-blue-700">SkillPilot AI is crafting your brand identity...</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
          </div>
        </div>
      ) : null}

      {message ? (
        <p className={cn("mt-5 rounded-xl px-3 py-2 text-sm font-semibold", message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")} aria-live="polite">
          {message.text}
        </p>
      ) : null}

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
          <p className="text-sm text-ink/60">{activeLogoUrl ? "This logo is applied across your SkillPilot identity surfaces." : "Generate and apply a logo to activate it."}</p>
        </div>
      </div>

      {kit ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[0.42fr_1fr]">
          <article className="rounded-3xl border border-ink/10 bg-cloud p-5">
            <div
              className="grid aspect-square place-items-center rounded-[2rem] bg-gradient-to-br from-blue-600 via-purple-600 to-slate-950 text-5xl font-black text-white shadow-xl"
              aria-label={`Mock generated logo preview for ${kit.brandName}`}
              role="img"
            >
              {initials}
            </div>
            <h3 className="mt-5 text-2xl font-black text-ink">{kit.brandName}</h3>
            <p className="mt-2 text-sm font-semibold text-moss">{kit.tagline}</p>
            <p className="mt-4 text-sm leading-6 text-ink/65">{kit.profileHeadline}</p>
          </article>

          <div className="grid gap-4 md:grid-cols-2">
            <BrandCard label="Bio" value={kit.shortBio} />
            <BrandCard label="Portfolio summary" value={kit.portfolioSummary} />
            <BrandCard label="Skills summary" value={kit.skillsSummary} />
            <BrandCard label="Logo concept" value={kit.logoConcept} />
            <BrandCard label="Logo prompt" value={kit.logoPrompt} />
            <BrandCard label="Font style" value={kit.fontStyle} />
            <BrandCard label="Social media bio" value={kit.socialMediaBio} />
            <article className="rounded-2xl border border-ink/10 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-soft motion-reduce:hover:translate-y-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">Color palette</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {kit.colorPalette.map((color) => (
                  <div key={color} className="grid gap-2">
                    <span className="h-12 w-12 rounded-2xl border border-ink/10 shadow-sm" style={{ backgroundColor: color }} aria-label={`Color swatch ${color}`} role="img" />
                    <span className="text-xs font-bold text-ink/65">{color}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="flex flex-wrap gap-2 xl:col-span-2">
            <Button type="button" variant="secondary" onClick={generateBranding} disabled={loading}>
              Generate Again
            </Button>
            <Button type="button" variant="secondary" onClick={saveBranding}>
              Save Branding
            </Button>
            <Button type="button" onClick={applyBranding}>
              Apply to Profile
            </Button>
            <Button type="button" variant="secondary" onClick={copyBrandKit}>
              Copy Brand Kit
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-ink/20 bg-cloud p-8 text-center">
          <p className="text-sm font-bold text-ink">No generated branding yet.</p>
          <p className="mt-2 text-sm text-ink/60">Click Generate Branding to preview a polished mock identity kit.</p>
        </div>
      )}

      <section className="mt-6 rounded-3xl border border-ink/10 bg-cloud p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Hugging Face logo generator</p>
            <h3 className="mt-2 text-xl font-black text-ink">Generate AI Logo</h3>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              AI generates the logo symbol only. Brand name and tagline are displayed separately for cleaner results.
            </p>
          </div>
          <Button type="button" onClick={generateLogo} disabled={logoLoading}>
            {logoLoading ? "Generating Logo..." : logo ? "Generate Again" : "Generate Logo"}
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <TextField label="Niche" value={logoNiche} onChange={setLogoNiche} />
          <TextField label="Tone" value={logoTone} onChange={setLogoTone} />
          <TextField label="Logo style" value={logoStyle} onChange={setLogoStyle} />
          <TextField label="Audience" value={logoAudience} onChange={setLogoAudience} />
          <TextField label="Color palette" value={logoPalette} onChange={setLogoPalette} />
        </div>

        {logoLoading ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(280px,512px)_1fr]" aria-live="polite">
            <div className="aspect-square w-full max-w-[512px] animate-pulse rounded-[2rem] border border-purple-100 bg-gradient-to-br from-slate-100 via-blue-100 to-purple-100 shadow-xl" />
            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 animate-ping rounded-full bg-purple-600" aria-hidden="true" />
                <p className="text-sm font-bold text-purple-700">Hugging Face is generating a clean logo symbol...</p>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-purple-200" />
                <div className="h-4 w-1/2 animate-pulse rounded-full bg-purple-200" />
                <div className="h-4 w-5/6 animate-pulse rounded-full bg-purple-200" />
              </div>
            </div>
          </div>
        ) : null}

        {logo ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(280px,512px)_1fr]">
            <span
              className="block aspect-square w-full max-w-[512px] rounded-[2rem] border border-ink/10 bg-cover bg-center shadow-xl"
              style={{ backgroundImage: `url(${logo.imageUrl})` }}
              aria-label={`Generated logo preview for ${kit?.brandName ?? user.fullName}`}
              role="img"
            />
            <div className="grid gap-3">
              {logo.source === "fallback" ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
                  Demo fallback shown because Hugging Face image generation failed. Safe code: {logo.safeErrorCode ?? "unknown_error"}.
                </p>
              ) : null}
              <BrandCard label="Logo source" value={logo.source === "huggingface" ? "Hugging Face image model" : "Improved SkillPilot fallback"} />
              <BrandCard label="Model used" value={logo.modelUsed} />
              <BrandCard label="Logo concept" value={logo.concept} />
              <BrandCard label="Image prompt" value={logo.promptUsed} />
              {logo.safeErrorCode ? <BrandCard label="Safe error code" value={logo.safeErrorCode} /> : null}
              {logo.safeErrorMessage || logo.errorMessage ? <BrandCard label="Safe error reason" value={logo.safeErrorMessage ?? logo.errorMessage ?? ""} /> : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={saveLogo}>Save Logo</Button>
                <Button type="button" onClick={applyLogo}>Apply Logo to Profile</Button>
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition duration-200 hover:bg-limewash active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                  href={logo.imageUrl}
                  download={`${(kit?.brandName ?? user.fullName).replace(/\s+/g, "-").toLowerCase()}-logo-preview.png`}
                >
                  Download Logo
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function BrandCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-soft motion-reduce:hover:translate-y-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/70">{value}</p>
    </article>
  );
}

function readStoredKits(): Record<string, BrandingKit> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(brandingStorageKey) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readStoredLogos(): Record<string, LogoResult> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem("skillpilot-hf-logo-previews") ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
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

function formatKit(kit: BrandingKit) {
  return [
    ["Brand name", kit.brandName],
    ["Tagline", kit.tagline],
    ["Bio", kit.shortBio],
    ["Portfolio summary", kit.portfolioSummary],
    ["Skills summary", kit.skillsSummary],
    ["Logo concept", kit.logoConcept],
    ["Logo prompt", kit.logoPrompt],
    ["Color palette", kit.colorPalette.join(", ")],
    ["Font style", kit.fontStyle],
    ["Social media bio", kit.socialMediaBio],
    ["Profile headline", kit.profileHeadline]
  ].map(([label, value]) => `${label}\n${value}`).join("\n\n");
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
