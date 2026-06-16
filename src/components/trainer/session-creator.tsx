"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type CourseOption = {
  id: string;
  title: string;
};

type SessionForm = {
  courseId: string;
  title: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  sessionVideoUrl: string;
};

type SmartRecommendation = {
  startTime: string;
  endTime: string;
  reason: string;
  conflicts: string[];
  learnerFit: string;
};

export function SessionCreator({ courses }: { courses: CourseOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState<SessionForm>({
    courseId: courses[0]?.id ?? "",
    title: "Live implementation workshop",
    startTime: defaultStartTime(),
    endTime: defaultEndTime(),
    meetingLink: "https://meet.skillpilot.ai/live-workshop",
    sessionVideoUrl: ""
  });
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [recommendation, setRecommendation] = useState<SmartRecommendation | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/trainer/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to create training session." });
      return;
    }

    setMessage({ type: "success", text: data?.message ?? "Training session created." });
    setRecommendation(null);
    router.refresh();
  }

  async function recommendBestTime() {
    if (!form.courseId) {
      setMessage({ type: "error", text: "Select a course before asking SkillPilot to recommend a time." });
      return;
    }

    setRecommending(true);
    setMessage(null);
    const response = await fetch("/api/ai/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: form.courseId, preferredDurationMinutes: 90 })
    });
    const data = await response.json().catch(() => null);
    setRecommending(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot could not recommend a time yet." });
      return;
    }

    const next = data.recommendation as SmartRecommendation;
    setRecommendation(next);
    setForm((current) => ({
      ...current,
      startTime: toDatetimeLocal(new Date(next.startTime)),
      endTime: toDatetimeLocal(new Date(next.endTime))
    }));
    setMessage({ type: "success", text: "AI recommended a conflict-aware session time. Review it, then create the session." });
  }

  function update(field: keyof SessionForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="mb-6 rounded-lg border border-ink/10 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Session automation</p>
      <h2 className="mt-2 text-2xl font-bold text-ink dark:text-slate-100">Create training session</h2>
      <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-slate-300">
        New sessions automatically create a SESSION_REMINDER workflow task for the trainer automation board.
      </p>

      <form className="mt-5 grid gap-4 lg:grid-cols-5" onSubmit={createSession}>
        <label className="grid gap-2 text-sm font-medium text-ink dark:text-slate-100 lg:col-span-2">
          <span>Course</span>
          <select className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink outline-none focus:border-moss focus:ring-4 focus:ring-limewash dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-950" value={form.courseId} onChange={(event) => update("courseId", event.target.value)} required>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <TextField label="Title" value={form.title} onChange={(value) => update("title", value)} />
        <TextField label="Start time" type="datetime-local" value={form.startTime} onChange={(value) => update("startTime", value)} />
        <TextField label="End time" type="datetime-local" value={form.endTime} onChange={(value) => update("endTime", value)} />
        <div className="lg:col-span-4">
          <TextField label="Meeting link" type="url" value={form.meetingLink} onChange={(value) => update("meetingLink", value)} />
        </div>
        <div className="lg:col-span-4">
          <TextField label="Session YouTube Link" type="url" value={form.sessionVideoUrl} onChange={(value) => update("sessionVideoUrl", value)} required={false} placeholder="https://www.youtube.com/watch?v=..." />
        </div>
        <div className="flex items-end">
          <div className="grid w-full gap-2">
            <Button type="button" variant="secondary" onClick={recommendBestTime} disabled={loading || recommending || courses.length === 0}>
              {recommending ? "Checking calendar..." : "AI Recommend Best Time"}
            </Button>
            <Button type="submit" disabled={loading || courses.length === 0}>
              {loading ? "Creating..." : "Create session"}
            </Button>
          </div>
        </div>
        {recommendation ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100 lg:col-span-5">
            <p className="font-black">Recommended: {formatDateTime(recommendation.startTime)} - {formatTimeOnly(recommendation.endTime)}</p>
            <p className="mt-2 leading-6">{recommendation.reason}</p>
            <p className="mt-1 font-semibold">{recommendation.learnerFit}</p>
            {recommendation.conflicts.length ? (
              <p className="mt-2 text-amber-700 dark:text-amber-200">Potential conflicts: {recommendation.conflicts.join(", ")}</p>
            ) : (
              <p className="mt-2 text-emerald-700 dark:text-emerald-200">No simple session conflicts detected.</p>
            )}
          </div>
        ) : null}
      </form>

      {message ? (
        <div className={message.type === "success" ? "mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" : "mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"}>
          {message.text}
        </div>
      ) : null}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink dark:text-slate-100">
      <span>{label}</span>
      <input
        className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink outline-none focus:border-moss focus:ring-4 focus:ring-limewash placeholder:text-ink/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-950"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function defaultStartTime() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  date.setHours(10, 0, 0, 0);

  return toDatetimeLocal(date);
}

function defaultEndTime() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  date.setHours(11, 30, 0, 0);

  return toDatetimeLocal(date);
}

function toDatetimeLocal(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatTimeOnly(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
