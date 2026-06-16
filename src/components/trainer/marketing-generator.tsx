"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileLogo, useProfileBranding } from "@/components/profile/profile-logo";
import { cn } from "@/lib/cn";
import { saveStoredSocialPost, type SocialPlatform, type StoredSocialPost } from "@/lib/social-post-storage";

type CourseOption = {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  status: string;
};

type MarketingForm = {
  courseId: string;
  courseTitle: string;
  courseTopic: string;
  courseDescription: string;
  targetAudience: string;
  campaignGoal: string;
  platform: "INSTAGRAM" | "LINKEDIN" | "FACEBOOK" | "EMAIL";
  toneOfVoice: string;
  callToActionStyle: string;
};

type CampaignResult = {
  id: string;
  source?: string;
  message?: string;
  campaignTitle: string;
  courseDescription: string;
  generatedText: string;
  adCaption: string;
  emailSubject: string;
  emailBody: string;
  promoMessage: string;
  hashtags: string[];
  seoKeywords: string[];
  targetAudience: string;
  performanceTips: string[];
  callToAction: string;
};

const platforms = [
  { label: "Instagram", value: "INSTAGRAM" },
  { label: "LinkedIn", value: "LINKEDIN" },
  { label: "Facebook", value: "FACEBOOK" },
  { label: "Email", value: "EMAIL" }
] as const;

const toneOptions = ["Professional", "Encouraging", "Bold", "Friendly", "Executive"];
const ctaOptions = ["Enroll now", "Preview the course", "Book a training session", "Join the next cohort", "Download the syllabus"];

export function MarketingGenerator({ courses, trainer }: { courses: CourseOption[]; trainer: { fullName: string; email: string; tagline?: string } }) {
  const branding = useProfileBranding(trainer);
  const trainerName = branding.brandName || trainer.fullName;
  const trainerTagline = branding.tagline || trainer.tagline || "AI trainer on SkillPilot AI";
  const firstCourse = courses[0];
  const [form, setForm] = useState<MarketingForm>({
    courseId: firstCourse?.id ?? "",
    courseTitle: firstCourse?.title ?? "AI Productivity Sprint",
    courseTopic: firstCourse?.category ?? "AI workflow automation",
    courseDescription: firstCourse?.description ?? "A practical course that helps learners apply AI to real work workflows with guided examples and reusable prompts.",
    targetAudience: "freelance AI trainers and operations-minded business owners",
    campaignGoal: "drive qualified course enrollments for the next cohort",
    platform: "LINKEDIN",
    toneOfVoice: "Professional",
    callToActionStyle: "Preview the course"
  });
  const [campaign, setCampaign] = useState<CampaignResult | null>(null);
  const [loading, setLoading] = useState<"generate" | "regenerate" | "save" | "publish" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedCourse = useMemo(() => courses.find((course) => course.id === form.courseId) ?? null, [courses, form.courseId]);

  function update(field: keyof MarketingForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectCourse(courseId: string) {
    const course = courses.find((item) => item.id === courseId);

    if (!course) {
      setForm((current) => ({ ...current, courseId }));
      return;
    }

    setForm((current) => ({
      ...current,
      courseId,
      courseTitle: course.title,
      courseTopic: course.category,
      courseDescription: course.description
    }));
  }

  async function generate(mode: "generate" | "regenerate") {
    if (!form.courseTitle.trim() || !form.courseTopic.trim() || !form.targetAudience.trim()) {
      setMessage({ type: "error", text: "Add a course title, topic, and target audience before generating." });
      return;
    }

    setLoading(mode);
    setMessage(null);

    const response = await fetch("/api/ai/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        courseId: form.courseId || null,
        contentType: "AD"
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot hit some turbulence. Try again." });
      return;
    }

    setCampaign({
      id: data.id,
      source: data.source,
      message: data.message,
      campaignTitle: data.campaignTitle,
      courseDescription: data.courseDescription,
      generatedText: data.generatedText,
      adCaption: data.adCaption,
      emailSubject: data.emailSubject,
      emailBody: data.emailBody,
      promoMessage: data.promoMessage,
      hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
      seoKeywords: Array.isArray(data.seoKeywords) ? data.seoKeywords : [],
      targetAudience: data.targetAudience,
      performanceTips: Array.isArray(data.performanceTips) ? data.performanceTips : [],
      callToAction: data.callToAction
    });
    setMessage({
      type: "success",
      text: mode === "regenerate" ? "Campaign regenerated. Review the new version before saving." : "Campaign generated. Review, copy, or save it to your marketing drafts."
    });
  }

  async function saveCampaign() {
    if (!campaign) {
      return;
    }

    setLoading("save");
    setMessage(null);

    const response = await fetch(`/api/trainer/marketing/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generatedText: campaign.generatedText,
        hashtags: campaign.hashtags.join(", "),
        seoKeywords: campaign.seoKeywords.join(", "),
        callToAction: campaign.callToAction,
        structuredCampaign: campaign,
        status: "DRAFT",
        scheduledAt: null
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to save campaign." });
      return;
    }

    setMessage({ type: "success", text: "Campaign saved to MarketingContent drafts." });
  }

  async function copyCampaign() {
    if (!campaign) {
      return;
    }

    await navigator.clipboard.writeText(formatCampaign(campaign));
    setMessage({ type: "success", text: "Campaign copied to clipboard." });
  }

  function publishCampaign() {
    if (!campaign) {
      return;
    }

    setLoading("publish");
    const platform = marketingPlatformToSocialPlatform(form.platform);
    const postId = `ai-marketing-${Date.now()}`;
    const post: StoredSocialPost = {
      id: postId,
      trainerTagline,
      trainerLogoUrl: branding.activeLogoUrl,
      trainerBrandName: trainerName,
      trainerEmail: trainer.email,
      status: "Published",
      publishedAt: new Date().toISOString(),
      source: { groq: campaign.source === "groq" ? "groq" : "fallback", huggingFace: "fallback" },
      promotion: {
        postTitle: campaign.campaignTitle,
        caption: campaign.generatedText,
        hashtags: campaign.hashtags,
        callToAction: campaign.callToAction,
        shortAdCopy: campaign.adCaption,
        longAdCopy: campaign.emailBody,
        engagementQuestion: campaign.performanceTips[0],
        targetAudience: campaign.targetAudience,
        trainerName,
        courseTitle: form.courseTitle,
        platform,
        createdAt: new Date().toISOString()
      },
      visual: {
        visualPromptUsed: `Fallback poster for ${campaign.campaignTitle}`,
        visualSource: "fallback",
        fallbackVisualId: `${platform}-${postId}`
      },
      analytics: fakeAnalytics(platform)
    };
    const result = saveStoredSocialPost(post);
    setLoading(null);
    setMessage({ type: result.ok ? "success" : "error", text: result.message ?? "Campaign published to dashboard post history." });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">AI Marketing Workspace</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Build a complete Groq-powered campaign</h2>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          Select an existing course or enter campaign details manually. SkillPilot uses a server-side API route to ask Groq for structured campaign content.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); generate("generate"); }}>
          <label className="grid gap-2 text-sm font-medium text-ink">
            <span>Course source</span>
            <select
              className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none transition focus:border-moss focus:ring-4 focus:ring-limewash"
              value={form.courseId}
              onChange={(event) => selectCourse(event.target.value)}
            >
              <option value="">Manual campaign</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>

          {selectedCourse ? (
            <div className="rounded-xl border border-ink/10 bg-cloud p-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{selectedCourse.category}</Badge>
                <Badge className="bg-white text-ink/70">{selectedCourse.level}</Badge>
                <Badge className="bg-white text-ink/70">{selectedCourse.status.toLowerCase()}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/65">{selectedCourse.description}</p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Course title" value={form.courseTitle} onChange={(value) => update("courseTitle", value)} />
            <TextField label="Course topic" value={form.courseTopic} onChange={(value) => update("courseTopic", value)} />
          </div>

          <TextArea label="Course description" value={form.courseDescription} onChange={(value) => update("courseDescription", value)} rows={4} />
          <TextArea label="Target audience" value={form.targetAudience} onChange={(value) => update("targetAudience", value)} rows={3} />
          <TextField label="Campaign goal" value={form.campaignGoal} onChange={(value) => update("campaignGoal", value)} />

          <div className="grid gap-4 md:grid-cols-3">
            <SelectField label="Platform/channel" value={form.platform} options={platforms} onChange={(value) => update("platform", value)} />
            <SelectField label="Tone of voice" value={form.toneOfVoice} options={toneOptions.map((tone) => ({ label: tone, value: tone }))} onChange={(value) => update("toneOfVoice", value)} />
            <SelectField label="CTA style" value={form.callToActionStyle} options={ctaOptions.map((style) => ({ label: style, value: style }))} onChange={(value) => update("callToActionStyle", value)} />
          </div>

          {message ? (
            <p className={cn("rounded-lg px-4 py-3 text-sm font-medium", message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")} aria-live="polite">
              {message.text}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={loading !== null}>
              {loading === "generate" ? "Brewing your AI marketing campaign..." : "Generate Campaign"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => generate("regenerate")} disabled={loading !== null || !campaign}>
              {loading === "regenerate" ? "Regenerating..." : "Regenerate"}
            </Button>
            <Button type="button" variant="secondary" onClick={copyCampaign} disabled={!campaign || loading !== null}>
              Copy
            </Button>
            <Button type="button" variant="secondary" onClick={saveCampaign} disabled={!campaign || loading !== null}>
              {loading === "save" ? "Saving..." : "Save Campaign"}
            </Button>
            <Button type="button" onClick={publishCampaign} disabled={!campaign || loading !== null}>
              {loading === "publish" ? "Publishing..." : "Publish Post"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Campaign Preview</p>
            <div className="mt-3 flex items-center gap-3">
              <ProfileLogo user={trainer} className="h-12 w-12" label={`${trainerName} AI marketing preview logo`} />
              <div>
                <h2 className="text-2xl font-bold text-ink">{campaign?.campaignTitle ?? "Generated campaign cards appear here"}</h2>
                <p className="text-sm text-ink/55">{trainerName} - {trainerTagline}</p>
              </div>
            </div>
          </div>
          <Badge>{form.platform.toLowerCase()}</Badge>
        </div>

        {loading === "generate" || loading === "regenerate" ? (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm font-semibold text-blue-700">
            Brewing your AI marketing campaign...
          </div>
        ) : null}

        {campaign ? (
          <div className="mt-5 grid gap-4">
            {campaign.message ? <ResultCard title="AI note" value={campaign.message} tone="blue" /> : null}
            <ResultCard title="Campaign Preview" value={campaign.generatedText} />
            <ResultCard title="Course Description" value={campaign.courseDescription} />
            <ResultCard title="Ad Copy" value={campaign.adCaption} />
            <ResultCard title="Email Campaign" value={`Subject: ${campaign.emailSubject}\n\n${campaign.emailBody}`} />
            <ResultCard title="Promo Message" value={campaign.promoMessage} />
            <ResultCard title="Hashtags" value={campaign.hashtags.join(" ")} tone="purple" />
            <ResultCard title="SEO Keywords" value={campaign.seoKeywords.join(", ")} tone="purple" />
            <ResultCard title="Target Audience Suggestion" value={campaign.targetAudience} />
            <ResultCard title="Campaign Performance Tips" value={campaign.performanceTips.map((tip) => `- ${tip}`).join("\n")} tone="blue" />
            <ResultCard title="Call To Action" value={campaign.callToAction} />
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-ink/20 bg-cloud p-8 text-sm leading-6 text-ink/60">
            Generate a campaign to see marketing copy, course description, email campaign, promo message, ad copy, hashtags, SEO keywords, target audience suggestions, and performance tips.
          </div>
        )}
      </section>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <input
        className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none transition focus:border-moss focus:ring-4 focus:ring-limewash"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <textarea
        className="resize-y rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none transition focus:border-moss focus:ring-4 focus:ring-limewash"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <select
        className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none transition focus:border-moss focus:ring-4 focus:ring-limewash"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultCard({ title, value, tone = "default" }: { title: string; value: string; tone?: "default" | "blue" | "purple" }) {
  return (
    <article
      className={cn(
        "rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
        tone === "blue" && "border-blue-100 bg-blue-50",
        tone === "purple" && "border-purple-100 bg-purple-50",
        tone === "default" && "border-ink/10 bg-white"
      )}
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{title}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/75">{value}</p>
    </article>
  );
}

function formatCampaign(campaign: CampaignResult) {
  return [
    ["Campaign Title", campaign.campaignTitle],
    ["Campaign Preview", campaign.generatedText],
    ["Course Description", campaign.courseDescription],
    ["Ad Copy", campaign.adCaption],
    ["Email Subject", campaign.emailSubject],
    ["Email Body", campaign.emailBody],
    ["Promo Message", campaign.promoMessage],
    ["Hashtags", campaign.hashtags.join(" ")],
    ["SEO Keywords", campaign.seoKeywords.join(", ")],
    ["Target Audience", campaign.targetAudience],
    ["Performance Tips", campaign.performanceTips.map((tip) => `- ${tip}`).join("\n")],
    ["Call To Action", campaign.callToAction]
  ]
    .map(([label, value]) => `${label}\n${value}`)
    .join("\n\n");
}

function marketingPlatformToSocialPlatform(platform: MarketingForm["platform"]): SocialPlatform {
  if (platform === "FACEBOOK") return "Facebook";
  if (platform === "INSTAGRAM") return "Instagram";
  return "LinkedIn";
}

function fakeAnalytics(platform: SocialPlatform) {
  const multiplier = platform === "TikTok" ? 3 : platform === "Instagram" ? 2 : platform === "Facebook" ? 2 : 1;
  return {
    views: 260 * multiplier + Math.floor(Math.random() * 90),
    likes: 38 * multiplier + Math.floor(Math.random() * 20),
    comments: 6 * multiplier + Math.floor(Math.random() * 8),
    shares: 5 * multiplier + Math.floor(Math.random() * 6)
  };
}
