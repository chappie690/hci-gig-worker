"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type CourseOption = {
  id: string;
  title: string;
  description: string;
  category: string;
  level?: string;
  status?: string;
};

type HFAssets = {
  primaryCaption: string;
  alternativeCaptions: string[];
  hashtags: string[];
  callToAction: string;
  shortAdCopy: string;
  longAdCopy: string;
  promotionalHeadline: string;
  platformTips: string[];
  engagementQuestion: string;
  contentIdeas: string[];
  campaignSummary: string;
  awarenessStageContent?: string;
  engagementStageContent?: string;
  conversionStageContent?: string;
  adCopyVariations?: string[];
  socialMediaCaptions?: string[];
  audienceTargetingSuggestions?: string[];
  postingRecommendations?: string[];
};

type DemoPost = {
  id: string;
  platform: string;
  trainerName: string;
  courseTitle: string;
  caption: string;
  adCopy: string;
  hashtags: string[];
  cta: string;
  status: "SCHEDULED" | "POSTED";
  scheduledAt: string | null;
  createdAt: string;
};

const platforms = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"] as const;
const modes = [
  { label: "Post Captions", value: "post", endpoint: "/api/ai/huggingface/post" },
  { label: "Advertisements", value: "ad", endpoint: "/api/ai/huggingface/ad" },
  { label: "Full Campaign", value: "campaign", endpoint: "/api/ai/huggingface/campaign" }
] as const;

export function HFMarketingAssetsPanel({
  courses,
  trainerName,
  compact = false
}: {
  courses: CourseOption[];
  trainerName: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [platform, setPlatform] = useState<(typeof platforms)[number]>("INSTAGRAM");
  const [mode, setMode] = useState<(typeof modes)[number]["value"]>("post");
  const [targetAudience, setTargetAudience] = useState("AI learners and gig workers");
  const [tone, setTone] = useState("professional and encouraging");
  const [campaignGoal, setCampaignGoal] = useState("drive course enrollments and social engagement");
  const [keyBenefits, setKeyBenefits] = useState("learn practical AI workflows, build portfolio proof, and gain trainer guidance");
  const [promotionalOffer, setPromotionalOffer] = useState("limited demo cohort preview");
  const [assets, setAssets] = useState<HFAssets | null>(null);
  const [source, setSource] = useState<"huggingface" | "local-mock" | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId) ?? courses[0] ?? null, [courseId, courses]);
  const selectedMode = modes.find((item) => item.value === mode) ?? modes[0];

  async function generate() {
    if (!selectedCourse) {
      setMessage({ type: "error", text: "Create or select a course before generating Hugging Face marketing assets." });
      return;
    }

    setLoading(true);
    setMessage(null);
    const response = await fetch(selectedMode.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseTitle: selectedCourse.title,
        name: trainerName,
        targetAudience,
        platform,
        tone,
        campaignGoal,
        productDescription: selectedCourse.description,
        keyBenefits,
        promotionalOffer
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot hit some Hugging Face turbulence. Please try again." });
      return;
    }

    setAssets(data.assets);
    setSource(data.source);
    setMessage({ type: "success", text: data.message ?? `${selectedMode.label} generated with ${data.source === "huggingface" ? "Hugging Face" : "demo fallback"}.` });
  }

  async function copyAssets() {
    if (!assets) {
      return;
    }

    await navigator.clipboard.writeText(formatAssets(assets));
    setMessage({ type: "success", text: "Marketing assets copied." });
  }

  function saveAssets() {
    if (!assets) {
      return;
    }

    const saved = readSavedAssets();
    window.localStorage.setItem("skillpilot-hf-marketing-assets", JSON.stringify([{ id: `hf-assets-${Date.now()}`, mode, platform, courseTitle: selectedCourse?.title, assets, createdAt: new Date().toISOString() }, ...saved]));
    setMessage({ type: "success", text: "Assets saved locally for this demo campaign." });
  }

  function postNow() {
    if (!assets || !selectedCourse) {
      return;
    }

    const post: DemoPost = {
      id: `hf-social-${Date.now()}`,
      platform,
      trainerName,
      courseTitle: selectedCourse.title,
      caption: assets.primaryCaption,
      adCopy: assets.shortAdCopy,
      hashtags: assets.hashtags,
      cta: assets.callToAction,
      status: "POSTED",
      scheduledAt: null,
      createdAt: new Date().toISOString()
    };
    const stored = JSON.parse(window.localStorage.getItem("skillpilot-demo-social-posts") ?? "[]") as unknown[];
    window.localStorage.setItem("skillpilot-demo-social-posts", JSON.stringify([post, ...stored]));
    router.push(`/trainer/social-automation/mock-post/${post.id}`);
  }

  function downloadAssets() {
    if (!assets) {
      return;
    }

    const blob = new Blob([formatAssets(assets)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedCourse?.title ?? "skillpilot"}-${mode}-assets.txt`.replace(/\s+/g, "-").toLowerCase();
    link.click();
    URL.revokeObjectURL(url);
  }

  function useInCampaign() {
    setMode("campaign");
    setCampaignGoal("launch a complete awareness, engagement, and conversion campaign");
    setMessage({ type: "success", text: "Campaign mode selected. Generate again for a full campaign package." });
  }

  return (
    <section className={cn("rounded-3xl border border-ink/10 bg-white p-6 shadow-sm", compact ? "mb-6" : "mt-6")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Hugging Face content marketing</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Create and publish promotional posts</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
            Server-side Hugging Face generation for platform-specific marketing. If the token or model is unavailable, SkillPilot returns polished fallback assets.
          </p>
        </div>
        {source ? <Badge>{source === "huggingface" ? "hugging face" : "mock fallback"}</Badge> : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <Select label="Asset type" value={mode} options={modes.map((item) => ({ label: item.label, value: item.value }))} onChange={(value) => setMode(value as typeof mode)} />
        <Select label="Course" value={courseId} options={courses.map((course) => ({ label: course.title, value: course.id }))} onChange={setCourseId} />
        <Select label="Platform" value={platform} options={platforms.map((item) => ({ label: titleCase(item), value: item }))} onChange={(value) => setPlatform(value as typeof platform)} />
        <TextField label="Tone" value={tone} onChange={setTone} />
        <TextField label="Target audience" value={targetAudience} onChange={setTargetAudience} />
        <TextField label="Campaign goal" value={campaignGoal} onChange={setCampaignGoal} />
        <TextField label="Key benefits" value={keyBenefits} onChange={setKeyBenefits} />
        <TextField label="Promotional offer" value={promotionalOffer} onChange={setPromotionalOffer} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={generate} disabled={loading || courses.length === 0}>
          {loading ? "Generating with Hugging Face..." : "Generate Assets"}
        </Button>
        <Button type="button" variant="secondary" onClick={generate} disabled={loading || !assets}>Regenerate</Button>
        <Button type="button" variant="secondary" onClick={copyAssets} disabled={!assets}>Copy</Button>
        <Button type="button" variant="secondary" onClick={saveAssets} disabled={!assets}>Save</Button>
        <Button type="button" variant="secondary" onClick={downloadAssets} disabled={!assets}>Download</Button>
        <Button type="button" variant="secondary" onClick={useInCampaign}>Use in Campaign</Button>
        <Button type="button" onClick={postNow} disabled={!assets}>Post Now</Button>
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-ping rounded-full bg-blue-600" aria-hidden="true" />
            <p className="text-sm font-bold text-blue-700">Hugging Face is shaping your marketing assets...</p>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className={message.type === "success" ? "mt-5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700" : "mt-5 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"} aria-live="polite">
          {message.text}
        </p>
      ) : null}

      {assets ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Result label="Promotional headline" value={assets.promotionalHeadline} />
          <Result label="Primary caption" value={assets.primaryCaption} />
          <Result label="Alternative captions" value={assets.alternativeCaptions.map((item) => `- ${item}`).join("\n")} />
          <Result label="Hashtags" value={assets.hashtags.join(" ")} />
          <Result label="Call to action" value={assets.callToAction} />
          <Result label="Short ad copy" value={assets.shortAdCopy} />
          <Result label="Long ad copy" value={assets.longAdCopy} />
          <Result label="Platform tips" value={assets.platformTips.map((item) => `- ${item}`).join("\n")} />
          <Result label="Engagement question" value={assets.engagementQuestion} />
          <Result label="Content ideas" value={assets.contentIdeas.map((item) => `- ${item}`).join("\n")} />
          <Result label="Campaign summary" value={assets.campaignSummary} />
          {assets.awarenessStageContent ? <Result label="Awareness stage" value={assets.awarenessStageContent} /> : null}
          {assets.engagementStageContent ? <Result label="Engagement stage" value={assets.engagementStageContent} /> : null}
          {assets.conversionStageContent ? <Result label="Conversion stage" value={assets.conversionStageContent} /> : null}
          {assets.adCopyVariations?.length ? <Result label="Ad copy variations" value={assets.adCopyVariations.map((item) => `- ${item}`).join("\n")} /> : null}
          {assets.audienceTargetingSuggestions?.length ? <Result label="Audience targeting" value={assets.audienceTargetingSuggestions.map((item) => `- ${item}`).join("\n")} /> : null}
          {assets.postingRecommendations?.length ? <Result label="Posting recommendations" value={assets.postingRecommendations.map((item) => `- ${item}`).join("\n")} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-ink/10 bg-cloud p-4 transition hover:-translate-y-0.5 hover:shadow-soft motion-reduce:hover:translate-y-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/70">{value}</p>
    </article>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<{ label: string; value: string }>; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <select className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function formatAssets(assets: HFAssets) {
  return Object.entries(assets)
    .map(([key, value]) => `${titleCase(key)}\n${Array.isArray(value) ? value.map((item) => `- ${item}`).join("\n") : value}`)
    .join("\n\n");
}

function readSavedAssets(): unknown[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem("skillpilot-hf-marketing-assets") ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
