"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveLocalAICourse } from "@/lib/local-ai-course-storage";

type CourseDraft = {
  courseTitle: string;
  description: string;
  category: string;
  level: string;
  targetAudience: string;
  duration: string;
  price: number;
  discountSuggestion: string;
  learningOutcomes: string[];
  syllabusModules: string[];
  quizTopic: string;
  courseThumbnailIdea: string;
  trainerNotes: string;
  youtubeVideoLinkPlaceholder: string;
  certificateIncluded: boolean;
  recommendedSessionPlan: string;
};

const loadingSteps = [
  "SkillPilot AI is analyzing your idea...",
  "Designing course structure...",
  "Creating syllabus and quiz plan...",
  "Preparing publish-ready course..."
];

export function AICourseBuilder({ trainer }: { trainer: { fullName: string; email: string } }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("Create a beginner course about AI marketing for university students who want freelance income.");
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState<"generate" | "publish" | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [variant, setVariant] = useState(0);

  useEffect(() => {
    if (loading !== "generate") {
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingStep((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 700);

    return () => window.clearInterval(timer);
  }, [loading]);

  async function generateDraft(nextVariant = draft ? variant + 1 : variant) {
    if (!prompt.trim()) {
      setMessage({ type: "error", text: "Describe your course idea before asking SkillPilot AI." });
      return;
    }

    setLoading("generate");
    setLoadingStep(0);
    setMessage(null);
    setDraft(null);
    setEditMode(false);

    let response: Response;
    let data: {
      source?: string;
      message?: string;
      draft?: CourseDraft;
    } | null = null;

    try {
      response = await fetch("/api/ai/course-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, variant: nextVariant })
      });
      data = await response.json().catch(() => null);
    } catch {
      setLoading(null);
      setMessage({ type: "error", text: "SkillPilot hit some turbulence while building this draft. Try again." });
      return;
    }

    setLoading(null);

    if (!response.ok || !data?.draft) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot could not build this course yet." });
      return;
    }

    setVariant(nextVariant);
    const completed = completeDraft(data.draft, prompt, nextVariant);
    setDraft(completed);
    setMessage({
      type: "success",
      text: `${data.source === "groq" ? "Groq created" : "SkillPilot prepared"} a publish-ready draft. Do you want to publish this course?`
    });
  }

  async function publishCourse() {
    if (!draft) {
      return;
    }

    const completedDraft = completeDraft(draft, prompt, variant);
    const validationMessage = validateDraft(completedDraft);

    if (validationMessage) {
      setDraft(completedDraft);
      setMessage({ type: "error", text: validationMessage });
      return;
    }

    const discount = parseDiscountSuggestion(completedDraft.discountSuggestion);
    const payload = {
      title: completedDraft.courseTitle,
      description: completedDraft.description,
      category: completedDraft.category,
      level: completedDraft.level,
      price: completedDraft.price,
      duration: completedDraft.duration,
      thumbnailUrl: "/course-thumbnails/ai-generated-course.png",
      courseVideoUrl: completedDraft.youtubeVideoLinkPlaceholder || "",
      discountActive: discount.active,
      discountPercent: discount.percent,
      discountLabel: discount.label,
      status: "PUBLISHED"
    };

    setLoading("publish");
    setMessage(null);

    try {
      const response = await fetch("/api/trainer/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => null);
      setLoading(null);

      if (!response.ok) {
        saveFallbackCourse({ ...payload, trainerName: trainer.fullName, trainerEmail: trainer.email, prompt, reason: data?.message ?? "Database publish failed." });
        setMessage({
          type: "error",
          text: `${data?.message ?? "Database publish failed."} I saved a lightweight local demo copy and added it to this browser's trainer/learner course lists.`
        });
        return;
      }

      setMessage({ type: "success", text: "AI course published. It now appears in trainer courses and learner catalog." });
      setEditMode(false);
      router.refresh();
    } catch {
      setLoading(null);
      saveFallbackCourse({ ...payload, trainerName: trainer.fullName, trainerEmail: trainer.email, prompt, reason: "Network or database publish failed." });
      setMessage({ type: "error", text: "Database publish could not complete. I saved a lightweight local demo copy and added it to this browser's trainer/learner course lists." });
    }
  }

  function updateDraft<K extends keyof CourseDraft>(field: K, value: CourseDraft[K]) {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
  }

  function cancelDraft() {
    setDraft(null);
    setEditMode(false);
    setMessage(null);
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Create with AI</p>
          <h2 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">One-prompt course publishing</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-slate-300">
            Write one course idea. SkillPilot infers sensible details, creates a publish-ready draft, and asks for your confirmation before anything goes live.
          </p>
        </div>
        <Badge>AI Course Builder</Badge>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-2xl border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-900">
          <label className="grid gap-2 text-sm font-semibold text-ink dark:text-slate-100">
            Course prompt
            <textarea
              className="min-h-36 rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink/45 focus:border-moss focus:ring-4 focus:ring-limewash dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-950"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Example: Create a beginner course about AI marketing for university students who want freelance income."
              disabled={loading !== null}
            />
          </label>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
            <p className="text-sm font-black text-blue-900 dark:text-blue-100">How this works</p>
            <ol className="mt-3 grid gap-2 text-sm leading-6 text-blue-900/75 dark:text-blue-100/80">
              <li>1. SkillPilot creates a complete title, syllabus, quiz plan, price, discount, and session plan.</li>
              <li>2. You review the draft and edit anything you want.</li>
              <li>3. You publish only after clicking Agree &amp; Publish.</li>
            </ol>
          </div>

          {loading === "generate" ? (
            <div className="mt-4 rounded-2xl border border-moss/20 bg-white p-4 shadow-sm dark:border-blue-500/30 dark:bg-slate-950">
              <p className="text-sm font-black text-ink dark:text-slate-100">{loadingSteps[loadingStep]}</p>
              <div className="mt-4 grid gap-2">
                {loadingSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className={index <= loadingStep ? "h-2.5 w-2.5 rounded-full bg-moss dark:bg-blue-300" : "h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700"} />
                    <span className={index <= loadingStep ? "text-sm font-semibold text-ink dark:text-slate-100" : "text-sm text-ink/45 dark:text-slate-500"}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {message ? (
            <p className={message.type === "success" ? "mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" : "mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200"}>
              {message.text}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => generateDraft()} disabled={loading !== null}>
              {loading === "generate" ? "Building draft..." : draft ? "Regenerate" : "Generate Course Draft"}
            </Button>
            {draft ? (
              <>
                <Button type="button" onClick={publishCourse} disabled={loading !== null}>
                  {loading === "publish" ? "Publishing..." : "Agree & Publish"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditMode((current) => !current)} disabled={loading !== null}>
                  {editMode ? "Lock Draft" : "Edit Draft"}
                </Button>
                <Button type="button" variant="secondary" onClick={cancelDraft} disabled={loading !== null}>
                  Cancel
                </Button>
              </>
            ) : null}
          </div>

          {draft ? (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
              <p className="text-sm font-black text-emerald-800 dark:text-emerald-100">Do you want to publish this course?</p>
              <p className="mt-2 text-sm leading-6 text-emerald-800/75 dark:text-emerald-100/75">
                Nothing is published until you choose Agree &amp; Publish. Use Edit Draft first if you want to fine-tune details.
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-900">
          {draft ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-moss">Course draft preview</p>
                  <p className="mt-1 text-sm text-ink/60 dark:text-slate-300">{editMode ? "Editing is enabled." : "Ready for confirmation."}</p>
                </div>
                <Badge>Publish ready</Badge>
              </div>
              <DraftField disabled={!editMode} label="Course title" value={draft.courseTitle} onChange={(value) => updateDraft("courseTitle", value)} />
              <DraftArea disabled={!editMode} label="Description" value={draft.description} onChange={(value) => updateDraft("description", value)} />
              <div className="grid gap-3 md:grid-cols-3">
                <DraftField disabled={!editMode} label="Category" value={draft.category} onChange={(value) => updateDraft("category", value)} />
                <DraftField disabled={!editMode} label="Level" value={draft.level} onChange={(value) => updateDraft("level", value)} />
                <DraftField disabled={!editMode} label="Duration" value={draft.duration} onChange={(value) => updateDraft("duration", value)} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <DraftField disabled={!editMode} label="Target audience" value={draft.targetAudience} onChange={(value) => updateDraft("targetAudience", value)} />
                <DraftField disabled={!editMode} label="Price" value={String(draft.price)} onChange={(value) => updateDraft("price", Number(value) || 0)} />
              </div>
              <DraftField disabled={!editMode} label="Discount suggestion" value={draft.discountSuggestion} onChange={(value) => updateDraft("discountSuggestion", value)} />
              <DraftField disabled={!editMode} label="YouTube video link placeholder" value={draft.youtubeVideoLinkPlaceholder} onChange={(value) => updateDraft("youtubeVideoLinkPlaceholder", value)} />
              <PreviewList title="Learning outcomes" items={draft.learningOutcomes} />
              <PreviewList title="Syllabus modules" items={draft.syllabusModules} />
              <PreviewNote label="Quiz topic" value={draft.quizTopic} />
              <PreviewNote label="Thumbnail idea" value={draft.courseThumbnailIdea} />
              <PreviewNote label="Trainer notes" value={draft.trainerNotes} />
              <PreviewNote label="Certificate included" value={draft.certificateIncluded ? "Yes" : "No"} />
              <PreviewNote label="Recommended session plan" value={draft.recommendedSessionPlan} />
            </div>
          ) : (
            <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-ink/20 p-8 text-center text-sm text-ink/60 dark:border-slate-700 dark:text-slate-300">
              Your publish-ready AI course draft will appear here after one prompt.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DraftField({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink dark:text-slate-100">
      {label}
      <input disabled={disabled} className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink outline-none transition focus:ring-4 focus:ring-limewash disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-ink/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-400" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DraftArea({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink dark:text-slate-100">
      {label}
      <textarea disabled={disabled} className="min-h-28 rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink outline-none transition focus:ring-4 focus:ring-limewash disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-ink/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-400" value={value} onChange={(event) => onChange(event.target.value)} />
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

function PreviewNote({ label, value }: { label: string; value: string }) {
  return (
    <p className="rounded-xl bg-white p-3 text-sm text-ink/70 dark:bg-slate-950 dark:text-slate-300">
      <strong>{label}:</strong> {value}
    </p>
  );
}

function validateDraft(draft: CourseDraft) {
  if (!draft.courseTitle.trim()) return "Course title is required before publishing.";
  if (!draft.description.trim()) return "Course description is required before publishing.";
  if (!draft.category.trim()) return "Course category is required before publishing.";
  if (!draft.level.trim()) return "Course level is required before publishing.";
  if (!Number.isFinite(draft.price) || draft.price < 0) return "Course price must be zero or higher.";
  return "";
}

function completeDraft(draft: CourseDraft, prompt: string, variant = 0): CourseDraft {
  const topic = analyzePromptTopic(prompt);
  const category = isGenericAICategory(draft.category, topic) ? topic.category : draft.category?.trim() || topic.category;
  return {
    ...draft,
    courseTitle: sanitizeTitle(draft.courseTitle, prompt, topic, variant),
    description: draft.description?.trim() || `A practical SkillPilot course that turns "${prompt}" into guided lessons, portfolio work, and a completion quiz.`,
    category,
    level: draft.level?.trim() || inferLevel(prompt),
    targetAudience: draft.targetAudience?.trim() || inferAudience(prompt, topic),
    duration: draft.duration?.trim() || "4 weeks",
    price: Number.isFinite(Number(draft.price)) && Number(draft.price) >= 0 ? Number(draft.price) : inferPrice(prompt, topic),
    discountSuggestion: draft.discountSuggestion?.trim() || `Launch Offer: 20% off for the first ${topic.label} cohort`,
    learningOutcomes: draft.learningOutcomes?.length ? draft.learningOutcomes : buildOutcomes(topic, inferLevel(prompt), variant),
    syllabusModules: draft.syllabusModules?.length ? draft.syllabusModules : buildSyllabus(topic, inferLevel(prompt), variant),
    quizTopic: draft.quizTopic?.trim() || category,
    courseThumbnailIdea: draft.courseThumbnailIdea?.trim() || `Modern ${topic.label.toLowerCase()} thumbnail showing a finished ${topic.projectNoun} with SkillPilot blue-purple accents.`,
    trainerNotes: draft.trainerNotes?.trim() || `Use the learner's final ${topic.projectNoun} as the portfolio artifact and include a quality checklist.`,
    youtubeVideoLinkPlaceholder: draft.youtubeVideoLinkPlaceholder?.trim() || "",
    certificateIncluded: Boolean(draft.certificateIncluded),
    recommendedSessionPlan: draft.recommendedSessionPlan?.trim() || `One 60-minute live kickoff plus a ${topic.projectNoun} review clinic.`
  };
}

function parseDiscountSuggestion(value: string) {
  const percent = Math.min(100, Math.max(0, Number(value.match(/(\d{1,3})\s*%/)?.[1] ?? 0)));
  return {
    active: percent > 0,
    percent: percent || null,
    label: value.trim().slice(0, 40) || null
  };
}

function saveFallbackCourse(course: {
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  duration: string;
  thumbnailUrl: string;
  discountActive: boolean;
  discountPercent: number | null;
  discountLabel: string | null;
  trainerName: string;
  trainerEmail: string;
  prompt: string;
  reason?: string;
}) {
  try {
    saveLocalAICourse(course);
  } catch {
    // The UI already explains the database failure; avoid crashing if browser storage is unavailable.
  }
}

function sanitizeTitle(title: string, prompt: string, topic: TopicProfile, variant: number) {
  const trimmed = title.trim();
  const promptText = prompt.trim().replace(/[.!?]+$/, "");

  if (!trimmed || trimmed.toLowerCase() === promptText.toLowerCase() || /^create\s+(a|an)?\s+/i.test(trimmed) || trimmed.length > 90) {
    return inferTitle(prompt, topic, variant);
  }

  return titleCase(trimmed).slice(0, 90);
}

type TopicProfile = {
  label: string;
  category: string;
  projectNoun: string;
  skills: string[];
  audience: string;
};

const topicProfiles: Array<{ pattern: RegExp; profile: TopicProfile }> = [
  { pattern: /\b(game development|game dev|unity|unreal|godot|2d game|3d game)\b/i, profile: { label: "Game Development", category: "Game Development", projectNoun: "playable game prototype", skills: ["game loops", "level design", "player controls", "build testing"], audience: "aspiring game creators and beginner developers" } },
  { pattern: /\b(cybersecurity|cyber security|security basics|ethical hacking|network security)\b/i, profile: { label: "Cybersecurity Basics", category: "Cybersecurity", projectNoun: "security checklist and threat report", skills: ["threat modeling", "password safety", "network hygiene", "incident response basics"], audience: "beginners who want practical digital safety skills" } },
  { pattern: /\b(python|python programming|python for beginners)\b/i, profile: { label: "Python Programming", category: "Programming", projectNoun: "Python automation script", skills: ["syntax", "control flow", "functions", "small automation projects"], audience: "new programmers and career-switching learners" } },
  { pattern: /\b(food photography|food photo|restaurant photography|product photography)\b/i, profile: { label: "Food Photography", category: "Photography", projectNoun: "styled food photo portfolio", skills: ["lighting", "composition", "styling", "editing workflow"], audience: "creators, cafe owners, and beginner photographers" } },
  { pattern: /\b(tiktok shop|tiktok selling|social commerce|live selling)\b/i, profile: { label: "TikTok Shop Selling", category: "E-Commerce", projectNoun: "TikTok Shop launch plan", skills: ["product positioning", "short-form selling", "shop setup", "conversion tracking"], audience: "small sellers, creators, and beginner e-commerce operators" } },
  { pattern: /\b(ui ux|ui\/ux|ux portfolio|ui portfolio|product design portfolio)\b/i, profile: { label: "UI/UX Portfolio", category: "Design", projectNoun: "portfolio case study", skills: ["case study structure", "wireframes", "user research", "visual presentation"], audience: "design students and junior product designers" } },
  { pattern: /\b(marketing|digital marketing|ai marketing)\b/i, profile: { label: "AI Marketing", category: "AI Marketing", projectNoun: "campaign portfolio asset", skills: ["audience research", "campaign copy", "content planning", "performance review"], audience: "students, freelancers, and marketers building practical campaign skills" } },
  { pattern: /\b(chatbot|bot building|conversation design)\b/i, profile: { label: "Chatbot Building", category: "Chatbot Building", projectNoun: "working chatbot flow", skills: ["conversation flows", "intent mapping", "response design", "testing"], audience: "builders and support teams creating guided bot experiences" } },
  { pattern: /\b(automation|workflow automation|zapier|make\.com|no-code automation)\b/i, profile: { label: "Workflow Automation", category: "Automation", projectNoun: "automated workflow", skills: ["process mapping", "trigger/action logic", "tool selection", "testing"], audience: "freelancers and teams who want to reduce repetitive work" } },
  { pattern: /\b(prompt engineering|prompting|prompt design)\b/i, profile: { label: "Prompt Engineering", category: "Prompt Engineering", projectNoun: "prompt playbook", skills: ["prompt patterns", "evaluation", "iteration", "workflow reuse"], audience: "professionals and learners using generative AI tools" } }
];

function analyzePromptTopic(prompt: string): TopicProfile {
  const matched = topicProfiles.find((item) => item.pattern.test(prompt));

  if (matched) return matched.profile;

  const label = extractTopicLabel(prompt);
  return {
    label,
    category: label,
    projectNoun: `${label.toLowerCase()} portfolio project`,
    skills: [`${label} fundamentals`, "practical workflow", "project planning", "quality review"],
    audience: `beginners and motivated learners interested in ${label.toLowerCase()}`
  };
}

function inferTitle(prompt: string, topic: TopicProfile, variant: number) {
  const lower = prompt.toLowerCase();
  const level = inferLevel(prompt);
  const audience = lower.includes("student") && lower.includes("freelance")
    ? "Student Freelancers"
    : lower.includes("student")
      ? "Students"
      : lower.includes("freelance")
        ? "Freelancers"
        : "";

  if (topic.category === "AI Marketing" && audience === "Student Freelancers") {
    return "AI Marketing Freelance Starter Course";
  }

  const variants = [
    `${topic.label} Starter Course`,
    `${level} ${topic.label} Project Bootcamp`,
    `${topic.label} Portfolio Sprint`,
    `Practical ${topic.label} Foundations`
  ];

  return variants[Math.abs(variant) % variants.length];
}

function inferLevel(prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes("advanced")) return "Advanced";
  if (lower.includes("intermediate")) return "Intermediate";
  return "Beginner";
}

function inferAudience(prompt: string, topic: TopicProfile) {
  const lower = prompt.toLowerCase();
  if (lower.includes("student")) return "University students building practical AI and freelance skills";
  if (lower.includes("freelance")) return "Early-career freelancers and gig workers";
  if (lower.includes("business")) return "Small business owners and operational teams";
  return topic.audience;
}

function inferPrice(prompt: string, topic: TopicProfile) {
  const currencyMatch = prompt.match(/(?:\$|rm|usd)?\s*(\d{2,4})(?:\s*(usd|rm|dollars?))?/i);
  if (currencyMatch?.[1]) return Number(currencyMatch[1]);
  if (prompt.toLowerCase().includes("free")) return 0;
  if (topic.category === "Programming" || topic.category === "Cybersecurity") return 79;
  if (topic.category === "Photography" || topic.category === "Design") return 69;
  if (topic.category === "E-Commerce") return 89;
  if (topic.category === "Game Development") return 99;
  return 59;
}

function buildOutcomes(topic: TopicProfile, level: string, variant: number) {
  if (variant % 2 === 1) {
    return [
      `Plan a realistic ${topic.label.toLowerCase()} project from a learner or client brief.`,
      `Practice ${topic.skills[2] ?? topic.skills[0]} with examples and critique.`,
      `Build and present a finished ${topic.projectNoun}.`,
      "Identify next steps for improving speed, quality, and confidence."
    ];
  }

  return [
    `Explain the essential ${topic.label.toLowerCase()} concepts at a ${level.toLowerCase()} level.`,
    `Apply ${topic.skills[0]} and ${topic.skills[1]} in a guided exercise.`,
    `Create a polished ${topic.projectNoun} for portfolio or client discussion.`,
    "Use a checklist to evaluate quality and decide what to improve next."
  ];
}

function buildSyllabus(topic: TopicProfile, level: string, variant: number) {
  if (variant % 3 === 1) {
    return [
      `${level} orientation and project brief`,
      `${titleCase(topic.skills[2] ?? topic.skills[0])} workshop`,
      "Hands-on critique and improvement loop",
      `Publish-ready ${topic.projectNoun}`,
      "Final quiz and action plan"
    ];
  }

  if (variant % 3 === 2) {
    return [
      `What good ${topic.label.toLowerCase()} looks like`,
      "Tools, setup, and workflow checklist",
      `${titleCase(topic.skills[0])} practice lab`,
      `${titleCase(topic.skills[1])} project sprint`,
      "Final review and next-step roadmap"
    ];
  }

  return [
    `${topic.label} foundations and learner goals`,
    `${titleCase(topic.skills[0])}: guided practice`,
    `${titleCase(topic.skills[1])}: examples and common mistakes`,
    `Build the ${topic.projectNoun}`,
    "Review, quiz, and portfolio packaging"
  ];
}

function extractTopicLabel(prompt: string) {
  const cleaned = prompt
    .replace(/^create\s+(a|an)?\s*/i, "")
    .replace(/\b(course|class|training|workshop|bootcamp|about|for beginners|beginner|advanced|intermediate)\b/gi, " ")
    .replace(/[^\w\s/+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return titleCase(cleaned.slice(0, 54) || "Practical Skills");
}

function isGenericAICategory(category: string | undefined, topic: TopicProfile) {
  if (!category) return false;
  const normalized = category.toLowerCase();
  return topic.category !== "AI Productivity" && (normalized === "ai productivity" || normalized === "productivity" || normalized === "general");
}

function titleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}
