"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const learnerGameStorageKey = "skillpilot-learner-game-state";

export function ProgressUpdater({
  enrollmentId,
  initialProgress,
  initialStatus
}: {
  enrollmentId: string;
  initialProgress: number;
  initialStatus: string;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");

  async function saveProgress(nextProgress: number) {
    const previousProgress = progress;
    setLoading(true);
    setError("");
    setCompletionMessage("");

    const response = await fetch(`/api/learner/enrollments/${enrollmentId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: nextProgress })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(data?.message ?? "Unable to save progress.");
      return;
    }

    setProgress(data.enrollment.progress);
    setStatus(data.enrollment.status);

    if (previousProgress < 100 && data.enrollment.progress >= 100) {
      awardCompletionXp();
      setCompletionMessage("Course completed. +50 XP and Course Completed trophy unlocked.");
    }

    router.refresh();
  }

  function awardCompletionXp() {
    const fallback = {
      xp: 120,
      streak: 2,
      dailyGoal: 0,
      achievements: {},
      unlocked: {},
      accent: "blue",
      darkMode: false
    };

    try {
      const stored = window.localStorage.getItem(learnerGameStorageKey);
      const current = stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
      window.localStorage.setItem(
        learnerGameStorageKey,
        JSON.stringify({
          ...current,
          xp: Number(current.xp ?? 0) + 50,
          achievements: {
            ...current.achievements,
            "course-completed": true
          }
        })
      );
    } catch {
      window.localStorage.removeItem(learnerGameStorageKey);
    }
  }

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink/60">Course progress</p>
          <p className="mt-1 text-3xl font-bold text-ink">{progress}%</p>
        </div>
        <span className="rounded-full bg-limewash px-3 py-1 text-xs font-bold capitalize text-moss">{status.toLowerCase()}</span>
      </div>
      <Progress className="mt-4" value={progress} />
      {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {completionMessage ? (
        <div className="relative mt-3 overflow-hidden rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700" aria-live="polite">
          <span className="skillpilot-confetti left-4 top-1 bg-emerald-400" />
          <span className="skillpilot-confetti left-1/2 top-2 bg-purple-400" />
          <span className="skillpilot-confetti right-5 top-1 bg-blue-400" />
          {completionMessage}
        </div>
      ) : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button type="button" onClick={() => saveProgress(Math.min(progress + 20, 100))} disabled={loading || progress >= 100}>
          {loading ? "Saving..." : "Update progress"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => saveProgress(100)} disabled={loading || progress >= 100}>
          Mark completed
        </Button>
      </div>
    </div>
  );
}
