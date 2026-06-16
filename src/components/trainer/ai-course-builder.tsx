"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CourseDraft = {
  title: string;
  description: string;
  category: string;
  level: string;
  targetAudience: string;
  duration: string;
  priceSuggestion: number;
  discountSuggestion: {
    active: boolean;
    percent: number;
    label: string;
  };
  learningOutcomes: string[];
  syllabusModules: string[];
  quizTopic: string;
  thumbnailIdea: string;
  trainerNotes: string;
  youtubeVideoPlaceholder: string;
};

type ChatLine = {
  role: "trainer" | "ai";
  text: string;
};

export function AICourseBuilder() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("Create a beginner course about AI marketing for university students who want freelance income.");
  const [answers, setAnswers] = useState<Array<{ question: string; answer: string }>>([]);
  const [answerText, setAnswerText] = useState("");
  const [chat, setChat] = useState<ChatLine[]>([
    { role: "ai", text: "Describe the course you want to create. I will ask follow-up questions if key details are missing." }
  ]);
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [activeQuestion, setActiveQuestion] = useState("");
  const [loading, setLoading] = useState<"generate" | "publish" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function generateDraft(extraAnswers = answers) {
    if (!prompt.trim()) {
      setMessage({ type: "error", text: "Add a course prompt before asking SkillPilot AI." });
      return;
    }

    setLoading("generate");
    setMessage(null);
    const response = await fetch("/api/ai/course-builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, answers: extraAnswers })
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot could not build this course yet." });
      return;
    }

    setDraft(data.draft);
    setFollowUps(data.followUpQuestions ?? []);
    setActiveQuestion(data.needsFollowUp ? data.followUpQuestions?.[0] ?? "" : "");
    setChat((current) => [
      ...current,
      { role: "trainer", text: extraAnswers.length ? extraAnswers[extraAnswers.length - 1].answer : prompt },
      {
        role: "ai",
        text: data.needsFollowUp && data.followUpQuestions?.length
          ? `I drafted a starting course, but I need one more detail: ${data.followUpQuestions[0]}`
          : "I created a course draft. Review, edit, regenerate, or publish it when ready."
      }
    ]);
  }

  function answerFollowUp() {
    if (!activeQuestion || !answerText.trim()) {
      return;
    }

    const nextAnswers = [...answers, { question: activeQuestion, answer: answerText }];
    setAnswers(nextAnswers);
    setAnswerText("");
    generateDraft(nextAnswers);
  }

  async function publishCourse() {
    if (!draft) {
      return;
    }

    setLoading("publish");
    setMessage(null);
    const response = await fetch("/api/trainer/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        category: draft.category,
        level: draft.level,
        price: draft.priceSuggestion,
        duration: draft.duration,
        thumbnailUrl: "/course-thumbnails/ai-generated-course.png",
        courseVideoUrl: draft.youtubeVideoPlaceholder || "",
        discountActive: draft.discountSuggestion.active,
        discountPercent: draft.discountSuggestion.percent,
        discountLabel: draft.discountSuggestion.label,
        status: "PUBLISHED"
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to publish AI course." });
      return;
    }

    setMessage({ type: "success", text: "AI course published. It now appears in trainer courses and learner catalog." });
    router.refresh();
  }

  function updateDraft<K extends keyof CourseDraft>(field: K, value: CourseDraft[K]) {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Create with AI</p>
          <h2 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">Prompt-based course publishing</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-slate-300">
            Describe a course idea. SkillPilot drafts the structure, asks follow-up questions when needed, and publishes to the learner catalog when you approve.
          </p>
        </div>
        <Badge>AI Course Builder</Badge>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid max-h-72 gap-3 overflow-y-auto pr-1">
            {chat.map((line, index) => (
              <div key={`${line.role}-${index}`} className={line.role === "trainer" ? "ml-8 rounded-2xl bg-blue-600 px-4 py-3 text-sm text-white" : "mr-8 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"}>
                <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">{line.role === "trainer" ? "Trainer" : "SkillPilot AI"}</p>
                <p className="mt-2 leading-6">{line.text}</p>
              </div>
            ))}
          </div>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-ink dark:text-slate-100">
            Course prompt
            <textarea
              className="min-h-28 rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-limewash dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-950"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>

          {activeQuestion ? (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
              <p className="text-sm font-black text-blue-900 dark:text-blue-100">{activeQuestion}</p>
              <textarea
                className="mt-3 min-h-20 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-4 focus:ring-blue-100 dark:border-blue-900 dark:bg-slate-950 dark:text-slate-100"
                value={answerText}
                onChange={(event) => setAnswerText(event.target.value)}
                placeholder="Answer the follow-up question..."
              />
              <Button type="button" className="mt-3" onClick={answerFollowUp} disabled={loading !== null}>
                Accept Suggestion
              </Button>
            </div>
          ) : null}

          {message ? <p className={message.type === "success" ? "mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" : "mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200"}>{message.text}</p> : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => generateDraft()} disabled={loading !== null}>
              {loading === "generate" ? "Drafting..." : "Generate Draft"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => generateDraft()} disabled={loading !== null || !draft}>
              Regenerate
            </Button>
            <Button type="button" onClick={publishCourse} disabled={loading !== null || !draft}>
              {loading === "publish" ? "Publishing..." : "Publish Course"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-900">
          {draft ? (
            <div className="grid gap-4">
              <DraftField label="Title" value={draft.title} onChange={(value) => updateDraft("title", value)} />
              <DraftArea label="Description" value={draft.description} onChange={(value) => updateDraft("description", value)} />
              <div className="grid gap-3 md:grid-cols-3">
                <DraftField label="Category" value={draft.category} onChange={(value) => updateDraft("category", value)} />
                <DraftField label="Level" value={draft.level} onChange={(value) => updateDraft("level", value)} />
                <DraftField label="Duration" value={draft.duration} onChange={(value) => updateDraft("duration", value)} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <DraftField label="Price" value={String(draft.priceSuggestion)} onChange={(value) => updateDraft("priceSuggestion", Number(value) || 0)} />
                <DraftField label="Discount %" value={String(draft.discountSuggestion.percent)} onChange={(value) => updateDraft("discountSuggestion", { ...draft.discountSuggestion, percent: Number(value) || 0 })} />
                <DraftField label="Discount label" value={draft.discountSuggestion.label} onChange={(value) => updateDraft("discountSuggestion", { ...draft.discountSuggestion, label: value })} />
              </div>
              <PreviewList title="Learning outcomes" items={draft.learningOutcomes} />
              <PreviewList title="Syllabus modules" items={draft.syllabusModules} />
              <p className="rounded-xl bg-white p-3 text-sm text-ink/70 dark:bg-slate-950 dark:text-slate-300"><strong>Quiz topic:</strong> {draft.quizTopic}</p>
              <p className="rounded-xl bg-white p-3 text-sm text-ink/70 dark:bg-slate-950 dark:text-slate-300"><strong>Thumbnail idea:</strong> {draft.thumbnailIdea}</p>
              <p className="rounded-xl bg-white p-3 text-sm text-ink/70 dark:bg-slate-950 dark:text-slate-300"><strong>Trainer notes:</strong> {draft.trainerNotes}</p>
            </div>
          ) : (
            <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-ink/20 p-8 text-center text-sm text-ink/60 dark:border-slate-700 dark:text-slate-300">
              Your editable AI course draft will appear here.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DraftField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink dark:text-slate-100">
      {label}
      <input className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink outline-none focus:ring-4 focus:ring-limewash dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DraftArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink dark:text-slate-100">
      {label}
      <textarea className="min-h-28 rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink outline-none focus:ring-4 focus:ring-limewash dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-slate-950">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-moss">{title}</p>
      <ul className="mt-2 grid gap-1 text-sm text-ink/70 dark:text-slate-300">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </div>
  );
}
