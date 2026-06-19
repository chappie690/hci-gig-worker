"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AICourseRecommender } from "@/components/learner/ai-course-recommender";
import { CoursePurchasePanel, type PurchasableCourse } from "@/components/learner/course-purchase-panel";
import { LearnerSocialPostsPanel } from "@/components/learner/learner-social-posts-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CelebrationButton } from "@/components/ui/celebration-button";
import { DynamicGreeting } from "@/components/ui/dynamic-greeting";
import { MetricCard } from "@/components/ui/metric-card";
import { Progress } from "@/components/ui/progress";
import { ProfileLogo, useProfileBranding } from "@/components/profile/profile-logo";
import { SubscriptionStatusCard } from "@/components/settings/subscription-access";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";

type EnrollmentItem = {
  id: string;
  courseId: string;
  progress: number;
  status: string;
  course: {
    title: string;
    duration: string;
    trainerName: string;
  };
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
};

type SessionItem = {
  id: string;
  title: string;
  courseTitle: string;
  startTime: string;
  status: string;
};

type PaymentItem = {
  id: string;
  receiptNumber: string;
  courseTitle: string;
  amount: number;
  status: string;
};

type LearnerGameState = {
  xp: number;
  streak: number;
  dailyGoal: number;
  achievements: Record<string, boolean>;
  unlocked: Record<string, boolean>;
  accent: "blue" | "purple" | "emerald";
  darkMode: boolean;
};

const storageKey = "skillpilot-learner-game-state";
const defaultState: LearnerGameState = {
  xp: 120,
  streak: 2,
  dailyGoal: 0,
  achievements: {},
  unlocked: {},
  accent: "blue",
  darkMode: false
};

const tiers = [
  { name: "Novice", min: 0, next: 200 },
  { name: "Explorer", min: 200, next: 500 },
  { name: "Pilot", min: 500, next: 1000 },
  { name: "Commander", min: 1000, next: null }
];

const achievementDefs = [
  { id: "first-course", title: "First Course Started", icon: "GO" },
  { id: "streak-3", title: "3-Day Learning Streak", icon: "3D" },
  { id: "perfect-quiz", title: "Perfect Quiz Score", icon: "100" },
  { id: "course-completed", title: "Course Completed", icon: "OK" },
  { id: "ai-chat", title: "AI Chat Explorer", icon: "AI" }
];

export function LearnerDashboardExperience({
  userName,
  userEmail,
  enrollments,
  notifications,
  sessions,
  payments,
  recommendedCourses,
  recommendationCourses
}: {
  userName: string;
  userEmail: string;
  enrollments: EnrollmentItem[];
  notifications: NotificationItem[];
  sessions: SessionItem[];
  payments: PaymentItem[];
  recommendedCourses: PurchasableCourse[];
  recommendationCourses: PurchasableCourse[];
}) {
  const [game, setGame] = useState(defaultState);
  const [xpFeedback, setXpFeedback] = useState("");
  const [noticeItems, setNoticeItems] = useState(notifications);
  const [loadingNotification, setLoadingNotification] = useState("");
  const user = useMemo(() => ({ fullName: userName, email: userEmail }), [userEmail, userName]);
  const branding = useProfileBranding(user);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(storageKey);

      if (!stored) {
        return;
      }

      try {
        setGame({ ...defaultState, ...(JSON.parse(stored) as LearnerGameState) });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const active = enrollments.filter((enrollment) => enrollment.status === "ACTIVE").length;
  const completed = enrollments.filter((enrollment) => enrollment.status === "COMPLETED").length;
  const averageProgress = enrollments.length ? Math.round(enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) / enrollments.length) : 0;
  const unread = noticeItems.filter((notification) => !notification.isRead).length;
  const paidTotal = payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + payment.amount, 0);
  const tier = getTier(game.xp);
  const tierProgress = tier.next ? Math.round(((game.xp - tier.min) / (tier.next - tier.min)) * 100) : 100;
  const accentClass = game.accent === "purple" ? "ring-2 ring-purple-200" : game.accent === "emerald" ? "ring-2 ring-emerald-200" : "";
  const completedAchievements = useMemo<Record<string, boolean>>(
    () => ({
      ...game.achievements,
      "first-course": enrollments.length > 0 || Boolean(game.achievements["first-course"]),
      "streak-3": game.streak >= 3 || Boolean(game.achievements["streak-3"]),
      "course-completed": completed > 0 || Boolean(game.achievements["course-completed"])
    }),
    [completed, enrollments.length, game.achievements, game.streak]
  );

  function saveGame(next: LearnerGameState) {
    setGame(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function awardXp(amount: number, reason: string, achievements: string[] = []) {
    const currentTier = getTier(game.xp).name;
    const nextAchievements = { ...game.achievements };
    achievements.forEach((achievement) => {
      nextAchievements[achievement] = true;
    });
    const next: LearnerGameState = {
      ...game,
      xp: game.xp + amount,
      achievements: nextAchievements
    };
    saveGame(next);
    setXpFeedback(`+${amount} XP ${reason}`);

    if (getTier(next.xp).name !== currentTier) {
      setXpFeedback(`+${amount} XP ${reason}. New tier unlocked: ${getTier(next.xp).name}.`);
    }
  }

  function completeDailyGoal() {
    const nextDaily = Math.min(2, game.dailyGoal + 1);
    const nextStreak = nextDaily >= 2 ? Math.max(game.streak, 3) : game.streak;
    const next: LearnerGameState = {
      ...game,
      dailyGoal: nextDaily,
      streak: nextStreak,
      xp: game.xp + 25,
      achievements: {
        ...game.achievements,
        ...(nextStreak >= 3 ? { "streak-3": true } : {})
      }
    };
    saveGame(next);
    setXpFeedback("+25 XP daily goal progress saved.");
  }

  function recordPerfectQuiz() {
    if (completedAchievements["perfect-quiz"]) {
      setXpFeedback("Perfect quiz badge is already in your trophy room.");
      return;
    }

    awardXp(30, "for a perfect demo quiz", ["perfect-quiz"]);
  }

  async function markNotificationRead(id: string) {
    setLoadingNotification(id);
    const response = await fetch(`/api/learner/notifications/${id}/read`, { method: "PATCH" });
    setLoadingNotification("");

    if (!response.ok) {
      setXpFeedback("Pilot Pete hit some turbulence. Please try again.");
      return;
    }

    setNoticeItems((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    awardXp(10, "for clearing a notification");
  }

  function buyUnlock(id: string, cost: number, update: Partial<LearnerGameState>) {
    if (game.unlocked[id]) {
      saveGame({ ...game, ...update });
      setXpFeedback("Customization applied.");
      return;
    }

    if (game.xp < cost) {
      setXpFeedback(`You need ${cost - game.xp} more XP to unlock this reward.`);
      return;
    }

    saveGame({
      ...game,
      ...update,
      xp: game.xp - cost,
      unlocked: { ...game.unlocked, [id]: true }
    });
    setXpFeedback(`Unlocked ${id.replace("-", " ")} for ${cost} XP.`);
  }

  return (
    <div className={cn("grid gap-6 rounded-3xl p-0 transition", game.darkMode && "bg-slate-950 p-4 text-white")}>
      <section className={cn("rounded-2xl border border-ink/10 bg-white p-5 shadow-sm", accentClass, game.darkMode && "border-white/10 bg-white/10")}>
        <DynamicGreeting
          userName={userName}
          context="Your learning cockpit is warmed up and ready."
          className={cn("text-sm font-semibold text-ink/65", game.darkMode && "text-white/80")}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <DashboardMetric icon="AC" label="Active Courses" value={String(active)} detail="In progress" />
          <DashboardMetric icon="OK" label="Completed" value={String(completed)} detail="Finished courses" />
          <DashboardMetric icon="%" label="Average Progress" value={`${averageProgress}%`} detail="Across enrollments" />
          <DashboardMetric icon="!" label="Unread Alerts" value={String(unread)} detail="Need attention" />
        </div>
      </section>

      <SubscriptionStatusCard user={{ email: userEmail }} role="LEARNER" />

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <XpPanel game={game} tier={tier.name} tierProgress={tierProgress} xpFeedback={xpFeedback} />
        <LearningStreak game={game} onComplete={completeDailyGoal} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <CardLike title="Enrolled courses">
          <div className="grid gap-3">
            {enrollments.map((enrollment, index) => (
              <article key={enrollment.id} className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{enrollment.course.title}</p>
                    <p className="mt-1 text-sm text-ink/60">{enrollment.course.trainerName} - {enrollment.course.duration}</p>
                    <p className="mt-2 text-sm font-semibold text-moss">{nextLessonCopy(index, enrollment.progress)}</p>
                  </div>
                  <Badge className={statusClass(enrollment.status)}>{enrollment.status.toLowerCase()}</Badge>
                </div>
                <Progress className="mt-4 h-3" value={enrollment.progress} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-ink/55">{enrollment.progress}% complete</span>
                  <div className="flex flex-wrap gap-2">
                    {enrollment.status === "COMPLETED" || enrollment.progress >= 100 ? (
                      <Button asChild variant="secondary">
                        <Link href={`/learner/certificate/${enrollment.courseId}`}>View Certificate</Link>
                      </Button>
                    ) : null}
                    <CelebrationButton
                      href={`/learner/courses/${enrollment.courseId}`}
                      className="min-h-10 bg-slate-950 px-4 py-2 text-white shadow-slate-200 hover:bg-blue-700"
                      intensity="small"
                      onCelebrate={() => awardXp(15, "for continuing a course", ["first-course"])}
                    >
                      Continue learning
                    </CelebrationButton>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </CardLike>

        <CardLike title="Notifications">
          <GamifiedNotifications items={noticeItems} loadingId={loadingNotification} onRead={markNotificationRead} />
        </CardLike>
      </section>

      <CardLike title="Recommended for you">
        <CoursePurchasePanel
          compact
          courses={recommendedCourses}
          emptyText="You are enrolled in every recommended course. Nice momentum."
          learnerName={userName}
          learnerEmail={userEmail}
        />
      </CardLike>

      <AICourseRecommender courses={recommendationCourses} learnerName={userName} learnerEmail={userEmail} />

      <LearnerSocialPostsPanel />

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <AchievementGallery achievements={completedAchievements} onPerfectQuiz={recordPerfectQuiz} />
        <div className="grid gap-5">
          <LearnerPortfolio user={user} brandName={branding.brandName} tagline={branding.tagline} />
          <CustomizeDashboard game={game} onBuy={buyUnlock} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <CardLike title="Upcoming training sessions">
          <div className="overflow-hidden rounded-lg border border-ink/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-cloud text-ink/60">
                <tr>
                  <th className="px-4 py-3 font-semibold">Session</th>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-4 py-3 font-medium text-ink">{session.title}</td>
                    <td className="px-4 py-3 text-ink/65">{session.courseTitle}</td>
                    <td className="px-4 py-3 text-ink/65">{formatDate(session.startTime)}</td>
                    <td className="px-4 py-3"><Badge>{session.status.toLowerCase()}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardLike>

        <CardLike title="Payment history">
          <div className="mb-4 rounded-lg bg-cloud p-4">
            <p className="text-sm text-ink/55">Paid total</p>
            <p className="mt-1 text-2xl font-bold text-ink">{formatCurrency(paidTotal)}</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-ink/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-cloud text-ink/60">
                <tr>
                  <th className="px-4 py-3 font-semibold">Receipt</th>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 font-medium text-ink">{payment.receiptNumber}</td>
                    <td className="px-4 py-3 text-ink/65">{payment.courseTitle}</td>
                    <td className="px-4 py-3 text-ink/65">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3"><Badge className={statusClass(payment.status)}>{payment.status.toLowerCase()}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardLike>
      </section>
    </div>
  );
}

function DashboardMetric({ icon, label, value, detail }: { icon: string; label: string; value: string; detail: string }) {
  return (
    <MetricCard
      className="min-h-36 transition hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0"
      detail={detail}
      label={`${icon} ${label}`}
      value={value}
    />
  );
}

function XpPanel({ game, tier, tierProgress, xpFeedback }: { game: LearnerGameState; tier: string; tierProgress: number; xpFeedback: string }) {
  return (
    <CardLike title="XP and tier">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-4xl font-black text-ink">{game.xp} XP</p>
          <p className="mt-1 text-sm font-semibold text-moss">{tier} tier</p>
        </div>
        <span className="rounded-full bg-limewash px-3 py-1 text-sm font-bold text-moss">{tierProgress}% to next tier</span>
      </div>
      <Progress className="mt-4 h-3" value={tierProgress} />
      {xpFeedback ? <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700" aria-live="polite">{xpFeedback}</p> : null}
    </CardLike>
  );
}

function LearningStreak({ game, onComplete }: { game: LearnerGameState; onComplete: () => void }) {
  return (
    <CardLike title="Learning streak">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-ink/55">Current streak</p>
          <p className="mt-2 text-4xl font-black text-ink">FIRE {game.streak} days</p>
          <p className="mt-2 text-sm text-ink/65">{game.dailyGoal} of 2 lessons completed today</p>
        </div>
        <CelebrationButton
          className="bg-slate-950 text-white shadow-slate-200 hover:bg-blue-700"
          disabled={game.dailyGoal >= 2}
          intensity="small"
          onCelebrate={onComplete}
        >
          {game.dailyGoal >= 2 ? "Goal complete" : "Complete today's goal"}
        </CelebrationButton>
      </div>
      <Progress className="mt-4 h-3" value={(game.dailyGoal / 2) * 100} />
    </CardLike>
  );
}

function GamifiedNotifications({ items, loadingId, onRead }: { items: NotificationItem[]; loadingId: string; onRead: (id: string) => void }) {
  if (!items.length) {
    return <p className="rounded-lg border border-ink/10 p-4 text-sm text-ink/60">No notifications yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {items.map((notification) => (
        <article
          key={notification.id}
          className={cn(
            "rounded-xl border border-ink/10 p-4 transition duration-300",
            notification.isRead ? "translate-x-2 bg-cloud opacity-65" : "bg-white hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{notification.title}</p>
                <Badge className={notification.isRead ? "bg-cloud text-ink/60" : undefined}>{notification.isRead ? "read" : "unread"}</Badge>
              </div>
              <p className="mt-2 text-sm text-ink/65">{notification.message}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-moss">{notification.type}</p>
            </div>
            {!notification.isRead ? (
              <Button type="button" variant="secondary" onClick={() => onRead(notification.id)} disabled={loadingId === notification.id}>
                {loadingId === notification.id ? "Saving..." : "Mark read +10 XP"}
              </Button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function AchievementGallery({ achievements, onPerfectQuiz }: { achievements: Record<string, boolean>; onPerfectQuiz: () => void }) {
  return (
    <CardLike title="Trophy room">
      <div className="grid gap-3 sm:grid-cols-2">
        {achievementDefs.map((achievement) => {
          const unlocked = Boolean(achievements[achievement.id]);

          return (
            <article
              key={achievement.id}
              aria-label={`${achievement.title}: ${unlocked ? "unlocked" : "locked"}`}
              className={cn("rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0", unlocked ? "border-purple-100 bg-purple-50" : "border-slate-200 bg-slate-50 opacity-70")}
            >
              <span aria-hidden="true" className={cn("grid h-10 w-10 place-items-center rounded-xl text-xs font-black", unlocked ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-600")}>
                {unlocked ? achievement.icon : "LOCK"}
              </span>
              <h3 className="mt-3 font-bold text-ink">{achievement.title}</h3>
              <p className="mt-1 text-sm font-semibold text-ink/50">{unlocked ? "Unlocked" : "Locked"}</p>
            </article>
          );
        })}
      </div>
      <Button className="mt-4" type="button" variant="secondary" onClick={onPerfectQuiz}>
        Record perfect quiz +30 XP
      </Button>
    </CardLike>
  );
}

function CustomizeDashboard({ game, onBuy }: { game: LearnerGameState; onBuy: (id: string, cost: number, update: Partial<LearnerGameState>) => void }) {
  return (
    <CardLike title="Customize dashboard">
      <div className="grid gap-3">
        <Reward label="Dark mode theme" cost={80} unlocked={game.unlocked["dark-mode"]} onClick={() => onBuy("dark-mode", 80, { darkMode: true })} />
        <Reward label="Purple accent" cost={60} unlocked={game.unlocked["purple-accent"]} onClick={() => onBuy("purple-accent", 60, { accent: "purple" })} />
        <Reward label="Commander avatar frame" cost={120} unlocked={game.unlocked["avatar-frame"]} onClick={() => onBuy("avatar-frame", 120, {})} />
      </div>
    </CardLike>
  );
}

function LearnerPortfolio({
  user,
  brandName,
  tagline
}: {
  user: { fullName: string; email: string };
  brandName?: string;
  tagline?: string;
}) {
  return (
    <CardLike title="Achievement portfolio">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink/10 bg-cloud p-4">
        <ProfileLogo user={user} className="h-16 w-16" label={`${brandName || user.fullName} learner portfolio logo`} />
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-moss">Personal learning brand</p>
          <h3 className="mt-1 text-xl font-black text-ink">{brandName || user.fullName}</h3>
          <p className="mt-1 text-sm text-ink/60">{tagline || "Building a portfolio of practical AI skills on SkillPilot AI."}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-ink/65">
        This mark is used as your learner identity for achievements, profile previews, and mock completion certificates.
      </p>
    </CardLike>
  );
}

function Reward({ label, cost, unlocked, onClick }: { label: string; cost: number; unlocked?: boolean; onClick: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 p-4">
      <div>
        <p className="font-semibold text-ink">{label}</p>
        <p className="text-sm text-ink/55">{unlocked ? "Unlocked" : `${cost} XP`}</p>
      </div>
      <Button type="button" variant="secondary" onClick={onClick}>
        {unlocked ? "Apply" : "Unlock"}
      </Button>
    </div>
  );
}

function CardLike({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white shadow-sm">
      <div className="border-b border-ink/10 p-5">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function getTier(xp: number) {
  for (let index = tiers.length - 1; index >= 0; index -= 1) {
    if (xp >= tiers[index].min) {
      return tiers[index];
    }
  }

  return tiers[0];
}

function nextLessonCopy(index: number, progress: number) {
  const copies = ["15 mins left in Chapter 1", "Next lesson: 8 mins", "Quiz review: 10 mins"];
  if (progress >= 100) {
    return "Course complete. Review your notes anytime.";
  }
  return copies[index % copies.length];
}

function statusClass(status: string) {
  if (status === "COMPLETED" || status === "PAID") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "bg-red-50 text-red-700";
  }

  return undefined;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
