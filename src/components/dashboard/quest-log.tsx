"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Quest = {
  id: string;
  title: string;
  description: string;
  reward: string;
  href?: string;
  max: number;
};

const quests: Quest[] = [
  {
    id: "promo-email",
    title: "Send promo emails to inactive learners",
    description: "Nudge learners who have not progressed recently with a practical next step.",
    reward: "+20 Brand XP",
    href: "/trainer/ai-marketing",
    max: 3
  },
  {
    id: "reply-questions",
    title: "Reply to learner questions",
    description: "Review chatbot conversations and turn common questions into course improvements.",
    reward: "+15 Trust XP",
    href: "/trainer/messages",
    max: 2
  },
  {
    id: "publish-social",
    title: "Publish one AI-generated social post",
    description: "Move a generated post from scheduled to posted in your social automation queue.",
    reward: "+25 Growth XP",
    href: "/trainer/social-automation",
    max: 1
  }
];

const storageKey = "skillpilot-trainer-quest-progress";

export function QuestLog() {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("Choose a quest to advance your trainer cockpit.");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(storageKey);

      if (!stored) {
        return;
      }

      try {
        setProgress(JSON.parse(stored) as Record<string, number>);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const completionCount = useMemo(
    () => quests.filter((quest) => (progress[quest.id] ?? 0) >= quest.max).length,
    [progress]
  );

  function advanceQuest(quest: Quest) {
    const currentValue = progress[quest.id] ?? 0;
    const nextValue = Math.min(quest.max, currentValue + 1);
    const next = { ...progress, [quest.id]: nextValue };
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setProgress(next);
    setFeedback(nextValue >= quest.max ? `${quest.title} completed. Reward unlocked: ${quest.reward}.` : `${quest.title} progress saved.`);
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Quest Log</p>
          <h2 className="mt-2 text-xl font-bold text-ink">Daily actions that grow your training business</h2>
        </div>
        <span className="rounded-full bg-limewash px-3 py-1 text-sm font-bold text-moss">
          {completionCount}/{quests.length} complete
        </span>
      </div>
      <p className="mt-4 rounded-lg bg-cloud px-3 py-2 text-sm font-medium text-ink/65" aria-live="polite">
        {feedback}
      </p>

      <div className="mt-4 grid gap-3">
        {quests.map((quest) => {
          const value = progress[quest.id] ?? 0;
          const complete = value >= quest.max;
          const percent = Math.round((value / quest.max) * 100);

          return (
            <article key={quest.id} className="rounded-xl border border-ink/10 p-4 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink">{quest.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-ink/60">{quest.description}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-moss">{quest.reward}</p>
                </div>
                {complete ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">complete</span>
                ) : null}
              </div>
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-xs font-semibold text-ink/55">
                  <span>{value}/{quest.max} steps</span>
                  <span>{percent}%</span>
                </div>
                <Progress value={percent} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => advanceQuest(quest)} disabled={complete}>
                  {complete ? "Reward claimed" : "Log progress"}
                </Button>
                {quest.href ? (
                  <Button asChild variant="secondary">
                    <Link href={quest.href}>Open tool</Link>
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
