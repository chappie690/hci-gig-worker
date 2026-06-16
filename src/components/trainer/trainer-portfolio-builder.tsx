"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveProfileBranding } from "@/lib/profile-branding";
import { cn } from "@/lib/cn";

type GeneratedPortfolio = {
  tagline: string;
  shortBio: string;
  portfolioSummary: string;
  skillsSummary: string;
  teachingStyle: string;
  targetLearnerAudience: string;
};

type InitialProfile = {
  brandName: string;
  tagline: string;
  bio: string;
  skills: string;
  portfolioSummary: string;
  logoPrompt: string;
  socialLinks: string;
};

export function TrainerPortfolioBuilder({
  user,
  initialProfile
}: {
  user: { fullName: string; email: string };
  initialProfile: InitialProfile;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<GeneratedPortfolio | null>(null);
  const [loading, setLoading] = useState<"generate" | "save" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function generate() {
    if (!prompt.trim() && !file) {
      setMessage({ type: "error", text: "Add a prompt or upload a PDF, DOC, or DOCX before generating." });
      return;
    }

    const formData = new FormData();
    formData.set("prompt", prompt);
    if (file) {
      formData.set("file", file);
    }

    setLoading("generate");
    setMessage(null);
    const response = await fetch("/api/ai/trainer-portfolio", {
      method: "POST",
      body: formData
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot could not generate portfolio content." });
      return;
    }

    setResult(data.result);
    setMessage({ type: "success", text: data.source === "groq" ? "Groq generated your trainer profile content." : "Demo fallback generated polished profile content." });
  }

  async function saveToProfile() {
    if (!result) {
      return;
    }

    setLoading("save");
    setMessage(null);
    const response = await fetch("/api/trainer/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: initialProfile.brandName,
        tagline: result.tagline,
        bio: result.shortBio,
        skills: result.skillsSummary,
        portfolioSummary: `${result.portfolioSummary}\n\nTeaching style: ${result.teachingStyle}\nTarget learners: ${result.targetLearnerAudience}`,
        logoPrompt: initialProfile.logoPrompt,
        socialLinks: initialProfile.socialLinks
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Generated content could not be saved to profile." });
      return;
    }

    saveProfileBranding(user.email, {
      fullName: user.fullName,
      email: user.email,
      brandName: initialProfile.brandName,
      tagline: result.tagline
    });
    setMessage({ type: "success", text: "Tagline and portfolio saved to your TrainerProfile." });
    router.refresh();
  }

  function handleFiles(files: FileList | null) {
    const next = files?.[0] ?? null;
    if (!next) {
      return;
    }

    const lower = next.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".doc") && !lower.endsWith(".docx")) {
      setMessage({ type: "error", text: "Upload a PDF, DOC, or DOCX file." });
      return;
    }

    setFile(next);
    setMessage(null);
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Trainer Profile / Branding</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Trainer Tagline & Portfolio Builder</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">
            Upload your trainer CV, portfolio, or course outline, or describe your expertise manually. SkillPilot generates polished trainer positioning you can save to your profile.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1fr]">
        <div className="grid gap-4">
          <button
            type="button"
            className={cn(
              "rounded-3xl border border-dashed border-ink/20 bg-cloud p-6 text-left transition hover:border-moss hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
              dragging && "border-moss bg-blue-50"
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              handleFiles(event.dataTransfer.files);
            }}
          >
            <p className="text-sm font-black text-ink">Drag and drop PDF, DOC, or DOCX</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">{file ? `${file.name} selected` : "Or click to choose a portfolio document from your device."}</p>
          </button>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => handleFiles(event.target.files)}
          />

          <label className="grid gap-2 text-sm font-semibold text-ink">
            Prompt
            <textarea
              className="min-h-40 rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe your training experience, niche, achievements, and teaching style."
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={generate} disabled={loading !== null}>
              {loading === "generate" ? "Generating..." : "Generate Tagline & Portfolio"}
            </Button>
            <Button type="button" variant="secondary" onClick={saveToProfile} disabled={!result || loading !== null}>
              {loading === "save" ? "Saving..." : "Save to Profile"}
            </Button>
          </div>

          {message ? (
            <p className={cn("rounded-xl px-3 py-2 text-sm font-semibold", message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")} aria-live="polite">
              {message.text}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4">
          {result ? (
            <>
              <ResultCard label="Professional tagline" value={result.tagline} />
              <ResultCard label="Short bio" value={result.shortBio} />
              <ResultCard label="Portfolio summary" value={result.portfolioSummary} />
              <ResultCard label="Skills summary" value={result.skillsSummary} />
              <ResultCard label="Teaching style" value={result.teachingStyle} />
              <ResultCard label="Target learner audience" value={result.targetLearnerAudience} />
            </>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-ink/20 bg-cloud p-8 text-center">
              <div>
                <p className="font-bold text-ink">Generated trainer profile content appears here.</p>
                <p className="mt-2 text-sm leading-6 text-ink/60">Use a document, prompt, or both for stronger output.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-ink/10 bg-cloud p-4 transition hover:-translate-y-0.5 hover:shadow-soft motion-reduce:hover:translate-y-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/75">{value}</p>
    </article>
  );
}
