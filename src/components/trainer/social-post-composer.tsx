"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CourseOption = {
  id: string;
  title: string;
  description: string;
  category: string;
};

type SocialResult = {
  caption: string;
  hashtags: string[];
  cta: string;
  bestTimeSuggestions: string[];
  postVariations: string[];
  contentCalendarIdeas: string[];
  engagementTips: string[];
};

type DemoPost = {
  id: string;
  platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK";
  trainerName: string;
  courseTitle: string;
  caption: string;
  hashtags: string[];
  cta: string;
  status: "SCHEDULED" | "POSTED";
  scheduledAt: string | null;
  createdAt: string;
};

const postKey = "skillpilot-demo-social-posts";

export function SocialPostComposer({ courses, trainerName }: { courses: CourseOption[]; trainerName: string }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<DemoPost["platform"]>("INSTAGRAM");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [contentGoal, setContentGoal] = useState("Promote the course with a practical learner outcome and clear enrollment CTA.");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleTime());
  const [result, setResult] = useState<SocialResult | null>(null);
  const [loading, setLoading] = useState<"generate" | "post" | "schedule" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId) ?? courses[0] ?? null, [courseId, courses]);

  async function generate() {
    if (!selectedCourse) {
      setMessage({ type: "error", text: "Create or select a course before generating a social post." });
      return;
    }

    setLoading("generate");
    setMessage(null);
    const response = await fetch("/api/ai/social-automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        courseTitle: selectedCourse.title,
        content: `${contentGoal} Course: ${selectedCourse.title}. Topic: ${selectedCourse.category}. Description: ${selectedCourse.description}`
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot hit some turbulence while generating your social post." });
      return;
    }

    setResult(data.social ?? data);
    setMessage({ type: "success", text: "Social post generated. You can schedule it or simulate posting now." });
  }

  function schedulePost() {
    if (!result || !selectedCourse) {
      return;
    }

    setLoading("schedule");
    const post = buildPost("SCHEDULED", scheduledAt);
    const posts = readPosts();
    window.localStorage.setItem(postKey, JSON.stringify([post, ...posts]));
    setLoading(null);
    setMessage({ type: "success", text: "Post scheduled in demo state. No real social API was called." });
  }

  function postNow() {
    if (!result || !selectedCourse) {
      return;
    }

    setLoading("post");
    const post = buildPost("POSTED", null);
    const posts = readPosts();
    window.localStorage.setItem(postKey, JSON.stringify([post, ...posts]));
    router.push(`/trainer/social-automation/mock-post/${post.id}`);
  }

  function buildPost(status: DemoPost["status"], scheduleValue: string | null): DemoPost {
    return {
      id: `demo-social-${Date.now()}`,
      platform,
      trainerName,
      courseTitle: selectedCourse?.title ?? "SkillPilot course",
      caption: result?.caption ?? "",
      hashtags: result?.hashtags ?? [],
      cta: result?.cta ?? "Preview the course.",
      status,
      scheduledAt: scheduleValue,
      createdAt: new Date().toISOString()
    };
  }

  async function copyPost() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(`${result.caption}\n\n${result.hashtags.join(" ")}\n\n${result.cta}`);
    setMessage({ type: "success", text: "Social post copied." });
  }

  return (
    <section className="mb-6 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Social AI composer</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Generate and simulate platform posts</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
            Pick Instagram, Facebook, or TikTok. Groq suggests content; SkillPilot handles scheduling and mock posting safely inside the demo.
          </p>
        </div>
        <Badge>{platform.toLowerCase()}</Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Platform
          <select className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={platform} onChange={(event) => setPlatform(event.target.value as DemoPost["platform"])}>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="TIKTOK">TikTok</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Course
          <select className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink lg:col-span-2">
          Schedule time
          <input className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink lg:col-span-4">
          Content goal
          <textarea className="min-h-24 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={contentGoal} onChange={(event) => setContentGoal(event.target.value)} />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={generate} disabled={loading !== null}>
          {loading === "generate" ? "Generating..." : "Generate social post"}
        </Button>
        <Button type="button" variant="secondary" onClick={copyPost} disabled={!result || loading !== null}>
          Copy
        </Button>
        <Button type="button" variant="secondary" onClick={schedulePost} disabled={!result || loading !== null}>
          {loading === "schedule" ? "Scheduling..." : "Schedule"}
        </Button>
        <Button type="button" onClick={postNow} disabled={!result || loading !== null}>
          {loading === "post" ? "Posting..." : "Post Now"}
        </Button>
      </div>

      {message ? (
        <p className={message.type === "success" ? "mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700" : "mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"} aria-live="polite">
          {message.text}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Result label="Caption" value={result.caption} />
          <Result label="Hashtags" value={result.hashtags.join(" ")} />
          <Result label="CTA" value={result.cta} />
          <Result label="Best time suggestions" value={result.bestTimeSuggestions.map((item) => `- ${item}`).join("\n")} />
          <Result label="Post variations" value={result.postVariations.map((item) => `- ${item}`).join("\n")} />
          <Result label="Engagement tips" value={result.engagementTips.map((item) => `- ${item}`).join("\n")} />
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

function readPosts(): DemoPost[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(postKey) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function defaultScheduleTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
