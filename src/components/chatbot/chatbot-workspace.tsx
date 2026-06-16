"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type CourseOption = {
  id: string;
  title: string;
};

export type ChatItem = {
  id: string;
  sender: string;
  message: string;
  createdAt: string;
  course: CourseOption | null;
};

export type TeachingStyle = "Direct" | "Encouraging" | "Humorous";

export type NavigationTarget = {
  title: string;
  href: string;
  reason: string;
  actionLabel: string;
  keywords: string[];
};

type ChatbotWorkspaceProps = {
  user: { fullName: string; email: string };
  courses: CourseOption[];
  initialMessages: ChatItem[];
  endpoint: string;
  botName: string;
  botInitials: string;
  workspaceTitle: string;
  savedHistoryLabel: string;
  contextLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  placeholder: string;
  emptyQuestionError: string;
  loadingText: string;
  navigationTargets: NavigationTarget[];
  styleStorageKey: string;
  onStyleSaved?: (style: TeachingStyle) => string;
  requestMode?: string;
};

const styleSamples: Record<TeachingStyle, string> = {
  Direct: "Clear answer, practical step, no extra fluff.",
  Encouraging: "Supportive coaching with a confident next step.",
  Humorous: "Friendly and light, while staying useful."
};

export function ChatbotWorkspace({
  user,
  courses,
  initialMessages,
  endpoint,
  botName,
  botInitials,
  workspaceTitle,
  savedHistoryLabel,
  contextLabel,
  emptyTitle,
  emptyDescription,
  placeholder,
  emptyQuestionError,
  loadingText,
  navigationTargets,
  styleStorageKey,
  onStyleSaved,
  requestMode
}: ChatbotWorkspaceProps) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>("Encouraging");
  const [styleFeedback, setStyleFeedback] = useState("");
  const [suggestion, setSuggestion] = useState<NavigationTarget | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedCourse = courses.find((course) => course.id === courseId) ?? null;
  const visibleMessages = useMemo(() => [...messages].reverse(), [messages]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedStyle = window.localStorage.getItem(styleStorageKey);

      if (storedStyle === "Direct" || storedStyle === "Encouraging" || storedStyle === "Humorous") {
        setTeachingStyle(storedStyle);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [styleStorageKey]);

  function updateTeachingStyle(nextStyle: TeachingStyle) {
    setTeachingStyle(nextStyle);
    window.localStorage.setItem(styleStorageKey, nextStyle);
    setStyleFeedback(onStyleSaved?.(nextStyle) ?? "Teaching style saved.");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      setError(emptyQuestionError);
      composerRef.current?.focus();
      return;
    }

    const nextSuggestion = findNavigationTarget(message, navigationTargets);
    setLoading(true);
    setError("");
    setSuggestion(null);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        courseId: courseId || null,
        teachingStyle,
        mode: requestMode
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(data?.message ?? `${botName} hit some turbulence. Please try again.`);
      return;
    }

    setMessages((current) => [...data.messages, ...current]);
    setSuggestion(nextSuggestion);
    setMessage("");
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.22),transparent_30%),linear-gradient(145deg,#050b18,#08111f_48%,#020617)] px-4 py-5 shadow-2xl shadow-slate-950/20 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute right-10 top-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-5xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{savedHistoryLabel}</p>
            <h2 className="mt-2 text-xl font-black text-white">{workspaceTitle}</h2>
          </div>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {contextLabel}
            <select
              className="min-h-10 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-100 outline-none transition hover:border-blue-400 focus-visible:border-blue-300 focus-visible:ring-4 focus-visible:ring-blue-500/20"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              <option value="">General</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid max-h-[58vh] min-h-[420px] gap-4 overflow-y-auto pr-1 [scrollbar-color:#334155_transparent]">
          {visibleMessages.length ? (
            visibleMessages.map((item) => (
              <ChatBubble
                key={item.id}
                item={item}
                botName={botName}
                botInitials={botInitials}
                userName={user.fullName}
                selectedCourseTitle={selectedCourse?.title ?? null}
              />
            ))
          ) : (
            <EmptyConversation botInitials={botInitials} title={emptyTitle} description={emptyDescription} />
          )}

          {loading ? (
            <div className="flex items-start gap-3">
              <BotAvatar initials={botInitials} label={`${botName} avatar`} />
              <div className="rounded-2xl border border-slate-700 bg-slate-900/85 px-4 py-3 text-sm font-semibold text-slate-200 shadow-lg">
                {loadingText}
              </div>
            </div>
          ) : null}
        </div>

        {suggestion ? (
          <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 text-slate-100 shadow-lg">
            <p className="text-sm font-black">Do you want me to take you to {suggestion.title}?</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">That page is best when you need to {suggestion.reason}.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" onClick={() => router.push(suggestion.href)}>
                {suggestion.actionLabel}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSuggestion(null)}>
                No, stay here
              </Button>
            </div>
          </div>
        ) : null}

        <form className="grid gap-3 border-t border-slate-800 pt-4" onSubmit={onSubmit}>
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Teaching style">
            {(["Direct", "Encouraging", "Humorous"] as TeachingStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-bold text-slate-200 transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 active:scale-[0.98] motion-reduce:hover:translate-y-0",
                  teachingStyle === style ? "border-blue-400 bg-blue-500/20 text-blue-100" : "border-slate-700 bg-slate-950/70"
                )}
                role="tab"
                aria-selected={teachingStyle === style}
                onClick={() => updateTeachingStyle(style)}
              >
                {style}
              </button>
            ))}
            <span className="text-xs text-slate-500">{styleSamples[teachingStyle]}</span>
          </div>

          {styleFeedback ? <p className="text-xs font-semibold text-blue-200" aria-live="polite">{styleFeedback}</p> : null}

          <label className="sr-only" htmlFor={`${requestMode ?? "learner"}-chatbot-question`}>Ask {botName}</label>
          <textarea
            id={`${requestMode ?? "learner"}-chatbot-question`}
            ref={composerRef}
            className="min-h-28 resize-y rounded-2xl border border-slate-700 bg-slate-950/75 px-4 py-3 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-500/20"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={placeholder}
          />

          {error ? <p className="rounded-xl border border-red-500/30 bg-red-950/50 px-3 py-2 text-sm font-semibold text-red-100">{error}</p> : null}

          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Brewing some AI coffee..." : "Send question"}
          </Button>
        </form>
      </div>
    </section>
  );
}

function ChatBubble({
  item,
  botName,
  botInitials,
  userName,
  selectedCourseTitle
}: {
  item: ChatItem;
  botName: string;
  botInitials: string;
  userName: string;
  selectedCourseTitle: string | null;
}) {
  const isUser = item.sender === "USER";
  const courseLabel = item.course?.title ?? selectedCourseTitle ?? "General";
  const displayMessage = isUser ? item.message : cleanBotMessage(item.message, courseLabel);

  return (
    <article className={cn("flex items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? <BotAvatar initials={botInitials} label={`${botName} avatar`} /> : null}
      <div className={cn("max-w-[min(760px,82%)]", isUser && "order-1")}>
        <div className={cn("mb-1 flex flex-wrap items-center gap-2", isUser && "justify-end")}>
          <Badge className={isUser ? "bg-slate-700 text-slate-100" : "bg-blue-500/15 text-blue-100"}>
            {isUser ? "You" : botName}
          </Badge>
          <span className="text-xs font-semibold text-slate-500">{courseLabel}</span>
        </div>
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm leading-6 shadow-lg",
            isUser
              ? "border-blue-400/20 bg-blue-600/30 text-blue-50"
              : "border-slate-700 bg-slate-900/90 text-slate-100"
          )}
        >
          <p className="whitespace-pre-line">{displayMessage}</p>
        </div>
      </div>
      {isUser ? <UserAvatar name={userName} /> : null}
    </article>
  );
}

function EmptyConversation({ botInitials, title, description }: { botInitials: string; title: string; description: string }) {
  return (
    <div className="mx-auto grid max-w-2xl place-items-center rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-12 text-center">
      <BotAvatar initials={botInitials} label={`${title} avatar`} />
      <h3 className="mt-4 text-2xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}

function BotAvatar({ initials, label }: { initials: string; label: string }) {
  return (
    <span
      aria-label={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-200 bg-slate-100 text-xs font-black text-blue-700 shadow-lg shadow-blue-950/20"
      role="img"
    >
      {initials}
    </span>
  );
}

function UserAvatar({ name }: { name: string }) {
  return (
    <span
      aria-label={`${name} avatar`}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-600 bg-slate-200 text-xs font-black text-slate-800 shadow-lg"
      role="img"
    >
      {initials(name)}
    </span>
  );
}

function findNavigationTarget(message: string, targets: NavigationTarget[]) {
  const normalized = message.toLowerCase();
  return targets.find((target) => target.keywords.some((keyword) => normalized.includes(keyword))) ?? null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "");
}

function cleanBotMessage(message: string, courseLabel: string) {
  const normalized = message.toLowerCase();
  const blocked = ["jailbreak", "ignore previous instructions", "system prompt", "developer message", "prompt injection"];

  if (!blocked.some((term) => normalized.includes(term))) {
    return message;
  }

  return `I can help with ${courseLabel === "General" ? "your SkillPilot workspace" : courseLabel}: sessions, courses, progress, certificates, payments, revenue, and practical next steps. What would you like to do next?`;
}
