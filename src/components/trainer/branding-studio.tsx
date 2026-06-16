"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type BrandingInput = {
  niche: string;
  targetAudience: string;
  tone: string;
  skills: string;
};

type BrandingResult = {
  brandNameSuggestions?: string[];
  brandName: string;
  tagline: string;
  bio: string;
  toneOfVoice?: string;
  portfolioSummary: string;
  colorPaletteIdeas?: string[];
  fontSuggestions?: string[];
  logoPrompt: string;
  logoConcept?: string;
  thumbnailConcept?: string;
  socialTemplateIdea?: string;
  brandRules?: string[];
  samplePost?: string;
  brandKitPreview?: string;
};

type BrandCheck = {
  score: number;
  strengths: string[];
  issues: string[];
  improvedVersion: string;
};

export function BrandingStudio({
  initialSkills,
  socialLinks
}: {
  initialSkills: string;
  socialLinks: string;
}) {
  const [form, setForm] = useState<BrandingInput>({
    niche: "AI workflow training",
    targetAudience: "small business operations teams",
    tone: "confident and practical",
    skills: initialSkills || "prompt systems, workflow automation, learner coaching"
  });
  const [result, setResult] = useState<BrandingResult | null>(null);
  const [loading, setLoading] = useState<"generate" | "save" | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkText, setCheckText] = useState("Join my AI workflow course to build practical automation skills for your next client project.");
  const [check, setCheck] = useState<BrandCheck | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("generate");
    setMessage(null);

    const response = await fetch("/api/ai/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to generate branding." });
      return;
    }

    setResult(data);
    setMessage({ type: "success", text: "Branding generated. Review it before saving." });
  }

  async function saveResult() {
    if (!result) {
      return;
    }

    setLoading("save");
    setMessage(null);
    const response = await fetch("/api/trainer/branding/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...result,
        skills: form.skills,
        socialLinks: socialLinks || "{}",
        sourcePrompt: JSON.stringify(form)
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to save generated branding." });
      return;
    }

    setMessage({ type: "success", text: "Saved to trainer profile and marketing drafts." });
  }

  function update(field: keyof BrandingInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function copyBrandKit() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(
      [
        result.brandName,
        result.brandNameSuggestions?.join(", "),
        result.tagline,
        result.bio,
        result.toneOfVoice,
        result.portfolioSummary,
        result.colorPaletteIdeas?.join(", "),
        result.fontSuggestions?.join(", "),
        result.logoConcept,
        result.thumbnailConcept,
        result.socialTemplateIdea,
        result.brandRules?.join("\n"),
        result.samplePost,
        result.logoPrompt,
        result.brandKitPreview
      ]
        .filter(Boolean)
        .join("\n\n")
    );
    setMessage({ type: "success", text: "Copied brand kit preview to clipboard." });
  }

  async function checkConsistency() {
    setCheckLoading(true);
    setMessage(null);
    const response = await fetch("/api/ai/branding/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: checkText,
        brandKit: result ?? form
      })
    });
    const data = await response.json().catch(() => null);
    setCheckLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot hit some turbulence while checking brand consistency." });
      return;
    }

    setCheck({
      score: Number(data.score ?? 0),
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      issues: Array.isArray(data.issues) ? data.issues : [],
      improvedVersion: data.improvedVersion ?? ""
    });
    setMessage({ type: "success", text: "Brand consistency check complete." });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">AI Branding Studio</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Generate a trainer brand system</h2>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          Describe your niche, audience, tone, and skills. SkillPilot AI will generate profile-ready brand copy and a logo prompt.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={generate}>
          <TextField label="Trainer niche" value={form.niche} onChange={(value) => update("niche", value)} />
          <TextField label="Target audience" value={form.targetAudience} onChange={(value) => update("targetAudience", value)} />
          <TextField label="Tone" value={form.tone} onChange={(value) => update("tone", value)} />
          <TextArea label="Skills" value={form.skills} onChange={(value) => update("skills", value)} rows={4} />
          {message ? (
            <div className={message.type === "success" ? "rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" : "rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"}>
              {message.text}
            </div>
          ) : null}
          <Button type="submit" disabled={loading !== null}>
            {loading === "generate" ? "Generating..." : "Generate branding"}
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Generated results</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">{result?.brandName ?? "Your AI-generated brand will appear here"}</h2>
          </div>
          <Button type="button" variant="secondary" onClick={saveResult} disabled={!result || loading !== null}>
            {loading === "save" ? "Saving..." : "Save results"}
          </Button>
          <Button type="button" variant="secondary" onClick={copyBrandKit} disabled={!result || loading !== null}>
            Copy kit
          </Button>
        </div>

          {result ? (
          <div className="mt-5 grid gap-4">
            {result.brandNameSuggestions?.length ? <ResultBlock label="Brand name suggestions" value={result.brandNameSuggestions.join(", ")} /> : null}
            <ResultBlock label="Brand name" value={result.brandName} />
            <ResultBlock label="Tagline" value={result.tagline} />
            <ResultBlock label="Bio" value={result.bio} />
            {result.toneOfVoice ? <ResultBlock label="Tone of voice" value={result.toneOfVoice} /> : null}
            <ResultBlock label="Portfolio summary" value={result.portfolioSummary} />
            {result.colorPaletteIdeas?.length ? <ResultBlock label="Color palette ideas" value={result.colorPaletteIdeas.join(", ")} /> : null}
            {result.fontSuggestions?.length ? <ResultBlock label="Font suggestions" value={result.fontSuggestions.join(", ")} /> : null}
            {result.logoConcept ? <ResultBlock label="Logo concept" value={result.logoConcept} /> : null}
            {result.thumbnailConcept ? <ResultBlock label="Thumbnail concept" value={result.thumbnailConcept} /> : null}
            {result.socialTemplateIdea ? <ResultBlock label="Social template idea" value={result.socialTemplateIdea} /> : null}
            {result.brandRules?.length ? <ResultBlock label="Brand rules" value={result.brandRules.map((rule) => `- ${rule}`).join("\n")} /> : null}
            {result.samplePost ? <ResultBlock label="Sample post" value={result.samplePost} /> : null}
            <ResultBlock label="Logo prompt" value={result.logoPrompt} />
            {result.brandKitPreview ? <ResultBlock label="Brand kit preview" value={result.brandKitPreview} /> : null}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-ink/20 bg-cloud p-6 text-sm leading-6 text-ink/60">
            Generated branding can be saved into `TrainerProfile` and as draft `MarketingContent` records for reuse in your marketing workspace.
          </div>
        )}
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Brand consistency checker</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Check if a post matches your trainer brand</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">
              Paste draft copy and SkillPilot will score fit, identify issues, and suggest a stronger version. It does not post or send anything.
            </p>
          </div>
          <Button type="button" onClick={checkConsistency} disabled={checkLoading || checkText.trim().length < 10}>
            {checkLoading ? "Checking..." : "Check consistency"}
          </Button>
        </div>
        <textarea
          className="mt-5 min-h-28 w-full resize-y rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
          value={checkText}
          onChange={(event) => setCheckText(event.target.value)}
          aria-label="Brand copy to check"
        />
        {check ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <ResultBlock label="Score" value={`${check.score}/100`} />
            <ResultBlock label="Strengths" value={check.strengths.map((item) => `- ${item}`).join("\n")} />
            <ResultBlock label="Issues" value={check.issues.map((item) => `- ${item}`).join("\n")} />
            <ResultBlock label="Improved version" value={check.improvedVersion} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ResultBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-cloud p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{label}</p>
      <p className="mt-2 text-sm leading-6 text-ink/75">{value}</p>
    </div>
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
