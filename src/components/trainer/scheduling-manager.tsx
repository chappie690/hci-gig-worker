"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CourseOption = {
  id: string;
  title: string;
};

type SessionItem = {
  id: string;
  courseId: string;
  title: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  sessionVideoUrl?: string | null;
  status: string;
  course: {
    title: string;
    enrollments: Array<{ learnerId: string }>;
  };
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

const emptyForm = (courseId: string): SessionForm => ({
  courseId,
  title: "Live implementation workshop",
  startTime: defaultStartTime(),
  endTime: defaultEndTime(),
  meetingLink: "https://meet.skillpilot.ai/live-workshop",
  sessionVideoUrl: ""
});

export function SchedulingManager({
  courses,
  initialSessions
}: {
  courses: CourseOption[];
  initialSessions: SessionItem[];
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [createForm, setCreateForm] = useState<SessionForm>(emptyForm(courses[0]?.id ?? ""));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SessionForm>(emptyForm(courses[0]?.id ?? ""));
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [recommendation, setRecommendation] = useState<SmartRecommendation | null>(null);

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitJson("/api/trainer/sessions", "POST", createForm, (data) => {
      setSessions((current) => [...current, data.session].sort(sortSessions));
      setCreateForm(emptyForm(courses[0]?.id ?? ""));
      setRecommendation(null);
      setMessage({ type: "success", text: data.message ?? "Training session created." });
      router.refresh();
    });
  }

  async function recommendBestTime() {
    if (!createForm.courseId) {
      setMessage({ type: "error", text: "Select a course before asking SkillPilot to recommend a time." });
      return;
    }

    setLoading("/api/ai/scheduling");
    setMessage(null);
    const response = await fetch("/api/ai/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: createForm.courseId, preferredDurationMinutes: 90 })
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot could not recommend a time yet." });
      return;
    }

    const next = data.recommendation as SmartRecommendation;
    setRecommendation(next);
    setCreateForm((current) => ({
      ...current,
      startTime: toDatetimeLocal(next.startTime),
      endTime: toDatetimeLocal(next.endTime)
    }));
    setMessage({ type: "success", text: "AI recommended a conflict-aware session time. Review it, then create the session." });
  }

  async function updateSession(event: React.FormEvent<HTMLFormElement>, sessionId: string) {
    event.preventDefault();
    await submitJson(`/api/trainer/sessions/${sessionId}`, "PATCH", editForm, (data) => {
      setSessions((current) => current.map((session) => (session.id === sessionId ? data.session : session)).sort(sortSessions));
      setEditingId(null);
      setMessage({ type: "success", text: data.message ?? "Training session updated." });
      router.refresh();
    });
  }

  async function setStatus(session: SessionItem, status: "COMPLETED" | "CANCELLED") {
    await submitJson(`/api/trainer/sessions/${session.id}`, "PATCH", { status }, (data) => {
      setSessions((current) => current.map((item) => (item.id === session.id ? data.session : item)));
      setMessage({ type: "success", text: status === "COMPLETED" ? "Session marked completed." : "Session cancelled." });
      router.refresh();
    });
  }

  async function submitJson(url: string, method: string, body: unknown, onSuccess: (data: { session: SessionItem; message?: string }) => void) {
    setLoading(url);
    setMessage(null);
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to save training session." });
      return;
    }

    onSuccess(data);
  }

  function startEdit(session: SessionItem) {
    setEditingId(session.id);
    setEditForm({
      courseId: session.courseId,
      title: session.title,
      startTime: toDatetimeLocal(session.startTime),
      endTime: toDatetimeLocal(session.endTime),
      meetingLink: session.meetingLink,
      sessionVideoUrl: session.sessionVideoUrl ?? ""
    });
  }

  return (
    <div className="grid gap-6">
      {message ? (
        <div className={message.type === "success" ? "rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" : "rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"}>
          {message.text}
        </div>
      ) : null}

      <section className="rounded-lg border border-ink/10 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Smart Scheduling</p>
        <h2 className="mt-2 text-2xl font-bold text-ink dark:text-slate-100">Create training session</h2>
        <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-slate-300">
          New sessions are saved to the calendar, notify enrolled learners, and create a SESSION_REMINDER automation task.
        </p>
        <SessionFormView
          courses={courses}
          form={createForm}
          setForm={setCreateForm}
          onSubmit={createSession}
          submitLabel="Create session"
          loading={loading === "/api/trainer/sessions"}
          onRecommend={recommendBestTime}
          recommending={loading === "/api/ai/scheduling"}
          recommendation={recommendation}
        />
      </section>

      <section className="grid gap-4">
        {sessions.map((session) => (
          <article key={session.id} className="rounded-lg border border-ink/10 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
            <div className="grid gap-5 lg:grid-cols-[0.28fr_1fr_0.45fr] lg:items-start">
              <div className="rounded-lg bg-cloud p-4 text-center dark:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-moss">{formatMonth(session.startTime)}</p>
                <p className="mt-2 text-4xl font-bold text-ink dark:text-slate-100">{formatDay(session.startTime)}</p>
                <p className="mt-1 text-sm text-ink/55 dark:text-slate-300">{formatTimeRange(session.startTime, session.endTime)}</p>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-ink dark:text-slate-100">{session.title}</h3>
                  <Badge className={statusClass(session.status)}>{session.status.toLowerCase()}</Badge>
                </div>
                <p className="mt-2 text-sm font-semibold text-moss">{session.course.title}</p>
                <p className="mt-2 text-sm text-ink/65 dark:text-slate-300">{session.course.enrollments.length} enrolled learners will see this session.</p>
                <p className="mt-3 break-all rounded-lg border border-ink/10 bg-cloud px-3 py-2 text-sm font-semibold text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{session.meetingLink}</p>
                <p className="mt-2 rounded-lg border border-ink/10 bg-cloud px-3 py-2 text-xs font-semibold text-ink/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  Session video: {session.sessionVideoUrl ? "YouTube video added" : "No YouTube session video yet"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button type="button" variant="secondary" onClick={() => startEdit(session)} disabled={loading !== null}>
                  Edit
                </Button>
                <Button asChild variant="secondary">
                  <Link href={`/mock-meet/${session.id}`}>Open meeting</Link>
                </Button>
                <Button type="button" variant="secondary" onClick={() => setStatus(session, "COMPLETED")} disabled={loading !== null || session.status === "COMPLETED"}>
                  Complete
                </Button>
                <Button type="button" variant="secondary" onClick={() => setStatus(session, "CANCELLED")} disabled={loading !== null || session.status === "CANCELLED"}>
                  Cancel
                </Button>
              </div>
            </div>

            {editingId === session.id ? (
              <div className="mt-5 rounded-lg border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink dark:text-slate-100">Edit training session</p>
                  <button className="text-sm font-semibold text-ink/60 hover:text-ink dark:text-slate-300 dark:hover:text-white" type="button" onClick={() => setEditingId(null)}>
                    Close
                  </button>
                </div>
                <SessionFormView
                  courses={courses}
                  form={editForm}
                  setForm={setEditForm}
                  onSubmit={(event) => updateSession(event, session.id)}
                  submitLabel="Save changes"
                  loading={loading === `/api/trainer/sessions/${session.id}`}
                />
              </div>
            ) : null}
          </article>
        ))}

        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink/20 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm font-semibold text-ink dark:text-slate-100">No training sessions yet.</p>
            <p className="mt-2 text-sm text-ink/60 dark:text-slate-300">Create your first live session to notify enrolled learners.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SessionFormView({
  courses,
  form,
  setForm,
  onSubmit,
  submitLabel,
  loading,
  onRecommend,
  recommending = false,
  recommendation
}: {
  courses: CourseOption[];
  form: SessionForm;
  setForm: (form: SessionForm) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  loading: boolean;
  onRecommend?: () => void;
  recommending?: boolean;
  recommendation?: SmartRecommendation | null;
}) {
  function update(field: keyof SessionForm, value: string) {
    setForm({ ...form, [field]: value });
  }

  return (
    <form className="mt-5 grid gap-4 lg:grid-cols-5" onSubmit={onSubmit}>
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
        <TextField label="Session YouTube Link" type="url" value={form.sessionVideoUrl} onChange={(value) => update("sessionVideoUrl", value)} required={false} placeholder="https://youtu.be/..." />
      </div>
      <div className="flex items-end">
        <div className="grid w-full gap-2">
          {onRecommend ? (
            <Button type="button" variant="secondary" onClick={onRecommend} disabled={loading || recommending || courses.length === 0}>
              {recommending ? "Checking calendar..." : "AI Recommend Best Time"}
            </Button>
          ) : null}
          <Button type="submit" disabled={loading || courses.length === 0}>
            {loading ? "Saving..." : submitLabel}
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

function statusClass(status: string) {
  if (status === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "CANCELLED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
}

function sortSessions(a: SessionItem, b: SessionItem) {
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(value));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit" }).format(new Date(value));
}

function formatTimeRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
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

function toDatetimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return defaultStartTime();
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function defaultStartTime() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  date.setHours(10, 0, 0, 0);

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function defaultEndTime() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  date.setHours(11, 30, 0, 0);

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
