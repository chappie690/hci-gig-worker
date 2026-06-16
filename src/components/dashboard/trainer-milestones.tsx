"use client";

import { useEffect, useMemo, useState } from "react";
import { CelebrationButton } from "@/components/ui/celebration-button";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";

type MilestoneStats = {
  revenue: number;
  monthRevenue: number;
  activeLearners: number;
  publishedCourses: number;
  fiveStarReviews: number;
};

type Milestone = {
  id: string;
  title: string;
  description: string;
  icon: string;
  complete: boolean;
};

const storageKey = "skillpilot-claimed-revenue-milestones";

export function TrainerMilestones({ stats }: { stats: MilestoneStats }) {
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("Revenue celebrations are ready when you are.");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(storageKey);

      if (!stored) {
        return;
      }

      try {
        setClaimed(JSON.parse(stored) as Record<string, boolean>);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const milestones = useMemo<Milestone[]>(
    () => [
      {
        id: "first-course",
        title: "First Course Published",
        description: `${stats.publishedCourses} published course${stats.publishedCourses === 1 ? "" : "s"}`,
        icon: "UP",
        complete: stats.publishedCourses >= 1
      },
      {
        id: "ten-learners",
        title: "First 10 Active Learners",
        description: `${stats.activeLearners} active learner${stats.activeLearners === 1 ? "" : "s"}`,
        icon: "10",
        complete: stats.activeLearners >= 10
      },
      {
        id: "five-star",
        title: "First 5-Star Review",
        description: `${stats.fiveStarReviews} demo review signal${stats.fiveStarReviews === 1 ? "" : "s"}`,
        icon: "5*",
        complete: stats.fiveStarReviews >= 1
      },
      {
        id: "first-100",
        title: "First $100 Revenue",
        description: `${formatCurrency(stats.revenue)} collected`,
        icon: "$",
        complete: stats.revenue >= 100
      },
      {
        id: "month-1k",
        title: "$1k Month",
        description: `${formatCurrency(stats.monthRevenue)} this month`,
        icon: "1K",
        complete: stats.monthRevenue >= 1000
      },
      {
        id: "total-10k",
        title: "$10k Total Revenue",
        description: `${formatCurrency(stats.revenue)} total`,
        icon: "10K",
        complete: stats.revenue >= 10000
      }
    ],
    [stats]
  );
  const claimable = milestones.filter((milestone) => milestone.complete && !claimed[milestone.id]);

  function claimMilestones() {
    if (claimable.length === 0) {
      setMessage("All available milestone wins are already claimed.");
      return;
    }

    const next = { ...claimed };
    claimable.forEach((milestone) => {
      next[milestone.id] = true;
    });
    setClaimed(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setMessage(`Claimed ${claimable.length} trainer milestone${claimable.length === 1 ? "" : "s"}.`);
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Trainer Milestones</p>
          <h2 className="mt-2 text-xl font-bold text-ink">Build momentum one win at a time</h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">Unlocked states use icons and labels, not color alone.</p>
        </div>
        <CelebrationButton
          ariaLabel="Claim available trainer milestones"
          className="min-h-10 bg-slate-950 px-4 py-2 text-white shadow-slate-200 hover:bg-blue-700"
          disabled={claimable.length === 0}
          intensity="milestone"
          onCelebrate={claimMilestones}
        >
          {claimable.length ? "Claim milestone" : "Milestones claimed"}
        </CelebrationButton>
      </div>

      <p className="mt-4 rounded-lg bg-cloud px-3 py-2 text-sm font-medium text-ink/65" aria-live="polite">
        {message}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {milestones.map((milestone) => {
          const unlocked = milestone.complete;
          const isClaimed = claimed[milestone.id];

          return (
            <article
              key={milestone.id}
              aria-label={`${milestone.title}: ${unlocked ? "unlocked" : "locked"}`}
              className={cn(
                "rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
                unlocked ? "border-blue-100 bg-blue-50/70" : "border-slate-200 bg-slate-50 opacity-70"
              )}
            >
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-black", unlocked ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600")}>
                  {unlocked ? milestone.icon : "LOCK"}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-ink">{milestone.title}</h3>
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink/45">{isClaimed ? "claimed" : unlocked ? "unlocked" : "locked"}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-ink/60">{milestone.description}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
