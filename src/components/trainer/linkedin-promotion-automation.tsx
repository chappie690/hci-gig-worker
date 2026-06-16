"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileLogo, useProfileBranding } from "@/components/profile/profile-logo";
import { getPromoImageSessionKey } from "@/components/trainer/promotional-visual-preview";
import { cn } from "@/lib/cn";
import { getDisplayLogo } from "@/lib/profile-branding";
import { saveStoredSocialPost, type SocialPlatform, type StoredSocialPost } from "@/lib/social-post-storage";

type CourseOption = {
  id: string;
  title: string;
  description: string;
  category: string;
};

type Promotion = {
  postTitle: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
  shortAdCopy: string;
  longAdCopy: string;
  engagementQuestion: string;
  audienceTargetingReason: string;
  targetAudience: string;
  trainerName: string;
  courseTitle: string;
  platform: Platform;
  createdAt: string;
};

type PromoVisual = {
  promoImageUrl: string;
  visualPromptUsed: string;
  visualSource: "huggingface" | "fallback";
  modelUsed: string;
  safeErrorCode?: string;
  safeErrorMessage?: string;
};

type GeneratedPromotion = {
  source: { groq: "groq" | "fallback"; huggingFace: "huggingface" | "fallback" };
  groqMessage?: string | null;
  trainerTagline: string;
  promotion: Promotion;
  visual: PromoVisual;
};

const platforms = ["LinkedIn", "Facebook", "TikTok", "Instagram"] as const;
type Platform = SocialPlatform;
const tones = ["Professional", "Friendly", "Motivational", "Bold"] as const;
const goals = ["Get enrollments", "Build awareness", "Promote discount", "Announce new course"] as const;
const processingSteps = ["Preparing content", "Finalizing AI image", "Connecting to mock platform", "Publishing post", "Updating dashboard"];

export function LinkedInPromotionAutomation({
  courses,
  trainerName,
  trainerTagline,
  trainerEmail
}: {
  courses: CourseOption[];
  trainerName: string;
  trainerTagline: string;
  trainerEmail: string;
}) {
  const router = useRouter();
  const trainerUser = useMemo(() => ({ fullName: trainerName, email: trainerEmail }), [trainerEmail, trainerName]);
  const branding = useProfileBranding(trainerUser);
  const activeLogoUrl = getDisplayLogo(branding);
  const displayTrainerName = branding.brandName || trainerName;
  const displayTrainerTagline = branding.tagline || trainerTagline;
  const [courseTitle, setCourseTitle] = useState(courses[0]?.title ?? "Beginner AI Freelance Launchpad");
  const [prompt, setPrompt] = useState("Promote my beginner AI course to students who want freelance income.");
  const [targetAudience, setTargetAudience] = useState("students who want freelance income");
  const [tone, setTone] = useState<(typeof tones)[number]>("Professional");
  const [goal, setGoal] = useState<(typeof goals)[number]>("Get enrollments");
  const [platform, setPlatform] = useState<Platform>("LinkedIn");
  const [result, setResult] = useState<GeneratedPromotion | null>(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedCourse = useMemo(() => courses.find((course) => course.title === courseTitle) ?? null, [courses, courseTitle]);

  function selectCourse(value: string) {
    const course = courses.find((item) => item.title === value);
    setCourseTitle(value);

    if (course) {
      setPrompt(`Promote ${course.title} to learners who want practical ${course.category.toLowerCase()} skills.`);
    }
  }

  async function generate() {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/ai/linkedin-promotion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        courseTitle,
        targetAudience,
        tone,
        goal,
        platform
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot could not generate this promotional post." });
      return;
    }

    setResult(data);
    setMessage({ type: "success", text: `${platform} post generated with Groq copy and Hugging Face visual support.` });
  }

  async function copyCaption() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(`${result.promotion.caption}\n\n${result.promotion.hashtags.join(" ")}\n\n${result.promotion.callToAction}`);
    setMessage({ type: "success", text: "Caption copied." });
  }

  function saveDraft() {
    if (!result) {
      return;
    }

    try {
      const drafts = readStored("skillpilot_trainer_social_drafts");
      const draft = {
        id: `social-draft-${Date.now()}`,
        promotion: result.promotion,
        trainerTagline: result.trainerTagline,
        visual: {
          visualPromptUsed: result.visual.visualPromptUsed,
          visualSource: result.visual.visualSource,
          modelUsed: result.visual.modelUsed,
          safeErrorCode: result.visual.safeErrorCode,
          safeErrorMessage: result.visual.safeErrorMessage,
          fallbackVisualId: `draft-${result.promotion.platform}-${Date.now()}`
        }
      };
      window.localStorage.setItem("skillpilot_trainer_social_drafts", JSON.stringify([draft, ...drafts].slice(0, 10)));
      setMessage({ type: "success", text: `${result.promotion.platform} draft saved locally.` });
    } catch {
      setMessage({ type: "error", text: "Browser storage is full, so SkillPilot could not save this draft." });
    }
  }

  async function postNow() {
    if (!result) {
      return;
    }

    setPosting(true);
    setMessage(null);

    for (let index = 0; index < processingSteps.length; index += 1) {
      setActiveStep(index);
      await delay(460);
    }

    const post: StoredSocialPost = {
      id: `social-post-${Date.now()}`,
      source: result.source,
      trainerTagline: result.trainerTagline,
      promotion: result.promotion,
      visual: {
        ...result.visual,
        fallbackVisualId: `${result.promotion.platform}-${Date.now()}`
      },
      trainerLogoUrl: activeLogoUrl,
      trainerBrandName: displayTrainerName,
      trainerEmail,
      status: "Published",
      publishedAt: new Date().toISOString(),
      analytics: {
        views: randomInt(920, 4200),
        likes: randomInt(68, 430),
        comments: randomInt(8, 64),
        shares: randomInt(5, 42)
      }
    };
    try {
      if (result.visual.promoImageUrl) {
        window.sessionStorage.setItem(getPromoImageSessionKey(post.id), result.visual.promoImageUrl);
      }
    } catch {
      // Large generated images are intentionally session-only; posting should continue if the browser refuses storage.
    }
    const saveResult = saveStoredSocialPost(post);
    if (!saveResult.ok || saveResult.pruned) {
      setMessage({ type: saveResult.ok ? "success" : "error", text: saveResult.message ?? "SkillPilot saved a lightweight post history." });
    }
    router.push(`/mock-social/${post.promotion.platform.toLowerCase()}?postId=${post.id}`);
  }

  return (
    <section className="mb-6 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Groq + Hugging Face automation</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Create and publish promotional posts</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
            Generate platform-ready copy and a promotional visual, preview it, then publish to a mock social workspace.
          </p>
        </div>
        <Badge>{platform}</Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <label className="grid gap-2 text-sm font-semibold text-ink lg:col-span-4">
          Prompt
          <textarea
            className="min-h-24 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Promote my beginner AI course to students who want freelance income."
          />
        </label>
        <Select label="Platform" value={platform} options={platforms} onChange={(value) => setPlatform(value as Platform)} />
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Course title
          {courses.length ? (
            <select className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={courseTitle} onChange={(event) => selectCourse(event.target.value)}>
              {courses.map((course) => <option key={course.id} value={course.title}>{course.title}</option>)}
            </select>
          ) : (
            <input className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} />
          )}
        </label>
        <TextField label="Target audience" value={targetAudience} onChange={setTargetAudience} />
        <Select label="Tone" value={tone} options={tones} onChange={(value) => setTone(value as typeof tone)} />
        <Select label="Goal" value={goal} options={goals} onChange={(value) => setGoal(value as typeof goal)} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={generate} disabled={loading || posting}>
          {loading ? "Generating Post..." : "Generate Post"}
        </Button>
        <Button type="button" variant="secondary" onClick={generate} disabled={!result || loading || posting}>Regenerate</Button>
        <Button type="button" variant="secondary" onClick={copyCaption} disabled={!result || posting}>Copy Caption</Button>
        <Button type="button" variant="secondary" onClick={saveDraft} disabled={!result || posting}>Save Draft</Button>
        <Button type="button" onClick={postNow} disabled={!result || posting}>Post Now</Button>
      </div>

      {message ? (
        <p className={cn("mt-5 rounded-xl px-3 py-2 text-sm font-semibold", message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")} aria-live="polite">
          {message.text}
        </p>
      ) : null}

      {posting ? (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5" aria-live="polite">
          <p className="text-sm font-black text-blue-700">Publishing to mock {result?.promotion.platform ?? platform}...</p>
          <div className="mt-4 grid gap-2">
            {processingSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm font-semibold">
                <span className={cn("grid h-6 w-6 place-items-center rounded-full text-xs", index <= activeStep ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}>{index + 1}</span>
                <span className={index <= activeStep ? "text-ink" : "text-ink/45"}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.55fr]">
          <article className={cn("overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-xl", result.promotion.platform === "TikTok" && "mx-auto max-w-sm", result.promotion.platform === "Instagram" && "max-w-xl")}>
            <div className="flex items-start gap-3 border-b border-ink/10 p-5">
              <ProfileLogo user={trainerUser} className="h-12 w-12" label={`${displayTrainerName} ${result.promotion.platform} preview logo`} />
              <div className="min-w-0">
                <p className="font-black text-ink">{displayTrainerName}</p>
                <p className="text-xs text-ink/55">{displayTrainerTagline}</p>
                <p className="mt-1 text-xs text-ink/45">Now - {result.promotion.platform}</p>
              </div>
            </div>
            <div className="p-5">
              <p className="text-lg font-black text-ink">{result.promotion.postTitle}</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink/75">{result.promotion.caption}</p>
              <p className="mt-4 text-sm font-bold text-blue-700">{result.promotion.hashtags.join(" ")}</p>
              <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">{result.promotion.callToAction}</p>
            </div>
            <div className="bg-cloud p-5">
              <div className={cn("rounded-2xl bg-cover bg-center shadow-sm", visualAspectClass(result.promotion.platform))} style={{ backgroundImage: `url(${result.visual.promoImageUrl})` }} role="img" aria-label={`Generated ${result.promotion.platform} promotional visual`} />
              {result.visual.visualSource === "fallback" ? (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                  Hugging Face visual fallback: {result.visual.safeErrorCode ?? "unknown_error"} - {result.visual.safeErrorMessage ?? "No safe reason provided."}
                </p>
              ) : null}
            </div>
          </article>

          <aside className="grid gap-4">
            <PreviewCard label="Course promo card" value={`${result.promotion.courseTitle}\n${selectedCourse?.description ?? result.promotion.shortAdCopy}`} />
            <PreviewCard label="Short ad copy" value={result.promotion.shortAdCopy} />
            <PreviewCard label="Long ad copy" value={result.promotion.longAdCopy} />
            <PreviewCard label="Engagement question" value={result.promotion.engagementQuestion} />
            <PreviewCard label="Audience targeting reason" value={result.promotion.audienceTargetingReason} />
          </aside>
        </div>
      ) : null}
    </section>
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

function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <select className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-ink/10 bg-cloud p-4 transition hover:-translate-y-0.5 hover:shadow-soft motion-reduce:hover:translate-y-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/70">{value}</p>
    </article>
  );
}

function readStored(key: string): unknown[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function visualAspectClass(platform: Platform) {
  if (platform === "TikTok") {
    return "aspect-[9/16]";
  }

  if (platform === "Instagram") {
    return "aspect-square";
  }

  return "aspect-video";
}
