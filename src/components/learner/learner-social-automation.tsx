"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getLearnerPostImageSessionKey,
  saveStoredLearnerSocialPost,
  type LearnerSocialPlatform,
  type StoredLearnerSocialPost
} from "@/lib/learner-social-post-storage";
import { cn } from "@/lib/cn";

type CourseOption = {
  id: string;
  title: string;
};

type GeneratedLearnerPost = {
  source?: string;
  message?: string;
  caption: string;
  hashtags: string[];
  achievementMessage: string;
  callToAction: string;
  shortPortfolioDescription: string;
  courseTitle?: string | null;
  visual: {
    promoImageUrl: string;
    visualPromptUsed: string;
    visualSource: "huggingface" | "fallback";
    modelUsed?: string;
    safeErrorCode?: string;
    safeErrorMessage?: string;
  };
};

const platforms: LearnerSocialPlatform[] = ["LinkedIn", "Facebook", "Instagram", "TikTok"];

export function LearnerSocialAutomation({
  learner,
  courses
}: {
  learner: { fullName: string; email: string };
  courses: CourseOption[];
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("Create a LinkedIn post about completing my AI Marketing course.");
  const [platform, setPlatform] = useState<LearnerSocialPlatform>("LinkedIn");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [tone, setTone] = useState("Professional");
  const [result, setResult] = useState<GeneratedLearnerPost | null>(null);
  const [loading, setLoading] = useState<"generate" | "post" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId) ?? null, [courseId, courses]);

  async function generatePost() {
    if (!prompt.trim()) {
      setMessage({ type: "error", text: "Describe the progress, achievement, or portfolio update first." });
      return;
    }

    setLoading("generate");
    setMessage(null);
    const response = await fetch("/api/ai/learner-social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, platform, courseId: courseId || null, tone })
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot could not generate your learner post yet." });
      return;
    }

    setResult(data);
    setMessage({ type: "success", text: data.message ?? "Learner portfolio post generated. Review it before posting." });
  }

  function postNow() {
    if (!result) {
      return;
    }

    setLoading("post");
    const postId = `learner-social-${Date.now()}`;
    const post: StoredLearnerSocialPost = {
      id: postId,
      learnerName: learner.fullName,
      learnerEmail: learner.email,
      platform,
      caption: result.caption,
      hashtags: result.hashtags,
      achievementMessage: result.achievementMessage,
      callToAction: result.callToAction,
      shortPortfolioDescription: result.shortPortfolioDescription,
      courseTitle: result.courseTitle ?? selectedCourse?.title,
      status: "Published",
      publishedAt: new Date().toISOString(),
      visual: {
        promoImageUrl: result.visual.promoImageUrl?.startsWith("data:") ? undefined : result.visual.promoImageUrl,
        visualPromptUsed: result.visual.visualPromptUsed,
        visualSource: result.visual.visualSource,
        modelUsed: result.visual.modelUsed,
        safeErrorCode: result.visual.safeErrorCode,
        safeErrorMessage: result.visual.safeErrorMessage,
        fallbackVisualId: `${platform}-${postId}`
      },
      analytics: fakeAnalytics(platform)
    };

    try {
      if (result.visual.promoImageUrl?.startsWith("data:")) {
        window.sessionStorage.setItem(getLearnerPostImageSessionKey(postId), result.visual.promoImageUrl);
      }
    } catch {
      // Session preview image is optional.
    }

    const saved = saveStoredLearnerSocialPost(post);
    setMessage({ type: saved.ok ? "success" : "error", text: saved.message });
    window.setTimeout(() => router.push(`/mock-social/${platform.toLowerCase()}?postId=${postId}`), 900);
  }

  async function copyPost() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(`${result.caption}\n\n${result.hashtags.join(" ")}\n\n${result.callToAction}`);
    setMessage({ type: "success", text: "Learner post copied." });
  }

  return (
    <section className="isolate grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <div className="overflow-visible rounded-3xl border border-ink/10 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Learner Social Automation</p>
        <h2 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">Share progress and portfolio wins</h2>
        <p className="mt-3 text-sm leading-6 text-ink/65 dark:text-slate-300">
          Generate achievement, progress, and portfolio posts for your own learning journey. This does not create trainer promotions.
        </p>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-ink dark:text-slate-100">
            Prompt
            <textarea
              className="min-h-28 rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink/40 focus:border-moss focus:ring-4 focus:ring-limewash dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-950"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
          <div className="relative z-20 grid min-w-0 gap-4 lg:grid-cols-[0.7fr_1.6fr_0.8fr]">
            <Select label="Platform" value={platform} options={platforms} onChange={(value) => setPlatform(value as LearnerSocialPlatform)} />
            <Select label="Course context" value={courseId} options={[{ label: "General portfolio update", value: "" }, ...courses.map((course) => ({ label: course.title, value: course.id }))]} onChange={setCourseId} />
            <Select label="Tone" value={tone} options={["Professional", "Friendly", "Motivational", "Confident"]} onChange={setTone} />
          </div>

          {message ? (
            <p className={cn("rounded-xl px-4 py-3 text-sm font-semibold", message.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200")} aria-live="polite">
              {message.text}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={generatePost} disabled={loading !== null}>
              {loading === "generate" ? "Creating learner post..." : "Generate Post"}
            </Button>
            <Button type="button" variant="secondary" onClick={copyPost} disabled={!result || loading !== null}>
              Copy
            </Button>
            <Button type="button" onClick={postNow} disabled={!result || loading !== null}>
              {loading === "post" ? "Publishing..." : "Post Now"}
            </Button>
          </div>
        </div>
      </div>

      <div className="relative z-0 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">{platform} preview</p>
            <h2 className="mt-2 text-xl font-black text-ink dark:text-slate-100">Platform-style learner post</h2>
          </div>
          <Badge>{platform}</Badge>
        </div>

        {result ? (
          <article className={cn("mt-5 overflow-hidden rounded-3xl border border-ink/10 bg-cloud dark:border-slate-700 dark:bg-slate-900", platform === "TikTok" && "mx-auto max-w-sm")}>
            <div className="flex items-center gap-3 border-b border-ink/10 p-4 dark:border-slate-700">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">{initials(learner.fullName)}</div>
              <div>
                <p className="font-black text-ink dark:text-slate-100">{learner.fullName}</p>
                <p className="text-xs text-ink/55 dark:text-slate-400">SkillPilot learner portfolio</p>
              </div>
            </div>
            <LearnerVisual platform={platform} result={result} />
            <div className="p-4">
              <p className="text-sm font-black text-ink dark:text-slate-100">{result.achievementMessage}</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink/70 dark:text-slate-300">{result.caption}</p>
              <p className="mt-3 text-sm font-bold text-blue-700 dark:text-blue-300">{result.hashtags.join(" ")}</p>
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-ink dark:bg-slate-950 dark:text-slate-100">{result.callToAction}</p>
              <p className="mt-3 text-xs leading-5 text-ink/55 dark:text-slate-400">{result.shortPortfolioDescription}</p>
            </div>
          </article>
        ) : (
          <div className="mt-5 rounded-3xl border border-dashed border-ink/20 bg-cloud p-8 text-center text-sm text-ink/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Generate a post to preview your learner achievement content.
          </div>
        )}
      </div>
    </section>
  );
}

function LearnerVisual({ platform, result }: { platform: LearnerSocialPlatform; result: GeneratedLearnerPost }) {
  if (result.visual.promoImageUrl && result.visual.visualSource === "huggingface") {
    return <div className={cn("bg-cover bg-center", visualAspect(platform))} style={{ backgroundImage: `url(${result.visual.promoImageUrl})` }} role="img" aria-label={`${platform} learner generated visual`} />;
  }

  return (
    <div className={cn("grid place-items-center bg-[linear-gradient(135deg,#2563eb,#7c3aed_55%,#0f172a)] p-8 text-center text-white", visualAspect(platform))}>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">SkillPilot portfolio</p>
        <h3 className="mt-3 text-3xl font-black">{result.courseTitle ?? "Learning milestone"}</h3>
        <p className="mt-3 text-sm text-white/80">{result.achievementMessage}</p>
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<string | { label: string; value: string }>; onChange: (value: string) => void }) {
  return (
    <label className="relative z-20 grid min-w-0 gap-2 text-sm font-semibold text-ink dark:text-slate-100">
      {label}
      <select
        className="relative z-20 min-h-11 w-full min-w-0 rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-limewash dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-950"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => {
          const item = typeof option === "string" ? { label: option, value: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </label>
  );
}

function visualAspect(platform: LearnerSocialPlatform) {
  if (platform === "TikTok") return "aspect-[9/16]";
  if (platform === "Instagram") return "aspect-square";
  return "aspect-video";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? "L"}${parts[1]?.[0] ?? ""}`;
}

function fakeAnalytics(platform: LearnerSocialPlatform) {
  const multiplier = platform === "TikTok" ? 3 : platform === "Instagram" ? 2 : 1;
  return {
    views: 180 * multiplier + Math.floor(Math.random() * 90),
    likes: 24 * multiplier + Math.floor(Math.random() * 18),
    comments: 4 * multiplier + Math.floor(Math.random() * 6),
    shares: 3 * multiplier + Math.floor(Math.random() * 5)
  };
}
