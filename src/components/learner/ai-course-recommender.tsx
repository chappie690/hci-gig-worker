"use client";

import { useMemo, useState } from "react";
import { CoursePurchasePanel, type PurchasableCourse } from "@/components/learner/course-purchase-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Recommendation = {
  courseId: string;
  reason: string;
  skillsGained: string[];
};

export function AICourseRecommender({
  courses,
  learnerName,
  learnerEmail
}: {
  courses: PurchasableCourse[];
  learnerName: string;
  learnerEmail: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const recommendedCourses = useMemo(() => {
    return recommendations.flatMap((recommendation) => {
      const course = courses.find((item) => item.id === recommendation.courseId);
      return course ? [{ ...course, recommendationReason: recommendation.reason, skillsGained: recommendation.skillsGained }] : [];
    });
  }, [courses, recommendations]);

  async function recommend() {
    if (!prompt.trim()) {
      setMessage({ type: "error", text: "Tell SkillPilot what you want to learn first." });
      return;
    }

    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/ai/course-recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        courses: courses.map((course) => ({
          id: course.id,
          title: course.title,
          trainerName: course.trainerName,
          category: course.category,
          level: course.level,
          duration: course.duration,
          price: course.finalAmount,
          description: course.description,
          topic: course.topic ?? course.category
        }))
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot could not recommend courses right now." });
      return;
    }

    setRecommendations(Array.isArray(data?.recommendations) ? data.recommendations : []);
    setMessage({ type: "success", text: data?.source === "groq" ? "Groq matched courses to your learning goal." : "SkillPilot used local matching to recommend courses." });
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">AI course recommendation</p>
          <h2 className="mt-2 text-2xl font-black text-ink">What do you want to learn?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">
            Describe your goal and SkillPilot will match you with real stock and trainer-created courses you can preview or buy.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor="learner-course-goal">Learning goal</label>
        <textarea
          id="learner-course-goal"
          className="min-h-24 rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-moss focus:ring-4 focus:ring-limewash"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Example: I want to learn AI tools to start freelancing."
        />
        <Button type="button" onClick={recommend} disabled={loading} className="self-start">
          {loading ? "Recommending..." : "Recommend Courses"}
        </Button>
      </div>

      {message ? (
        <p className={cn("mt-4 rounded-xl px-3 py-2 text-sm font-semibold", message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")} aria-live="polite">
          {message.text}
        </p>
      ) : null}

      {recommendedCourses.length ? (
        <div className="mt-6">
          <CoursePurchasePanel
            compact
            courses={recommendedCourses}
            learnerName={learnerName}
            learnerEmail={learnerEmail}
            emptyText="No matching courses found yet."
          />
        </div>
      ) : null}
    </section>
  );
}
