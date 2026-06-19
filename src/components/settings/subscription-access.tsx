"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  currentMonthKey,
  describeSubscription,
  formatSubscriptionPrice,
  getDefaultSubscription,
  getLearnerPlanAccess,
  getPlansForRole,
  getStableSubscriptionDisplayStatus,
  getSubscriptionDisplayStatus,
  getTrainerPlanAccess,
  subscriptionEventName,
  subscriptionStorageKey,
  subscriptionUsageStorageKey,
  type LearnerSubscriptionUsage,
  type SubscriptionMetadata,
  type SubscriptionRole
} from "@/lib/subscriptions";

export function useDemoSubscription(email: string, role: SubscriptionRole) {
  const [subscription, setSubscription] = useState<SubscriptionMetadata>(() => getDefaultSubscription(role));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = () => {
      setSubscription(readSubscription(email, role));
      setLoaded(true);
    };
    const timer = window.setTimeout(load, 0);
    window.addEventListener(subscriptionEventName, load);
    window.addEventListener("storage", load);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(subscriptionEventName, load);
      window.removeEventListener("storage", load);
    };
  }, [email, role]);

  return { subscription, loaded };
}

export function useLearnerSubscriptionUsage(email: string) {
  const [usage, setUsage] = useState<LearnerSubscriptionUsage>(() => defaultUsage());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = () => {
      setUsage(readLearnerUsage(email));
      setLoaded(true);
    };
    const timer = window.setTimeout(load, 0);
    window.addEventListener(subscriptionEventName, load);
    window.addEventListener("storage", load);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(subscriptionEventName, load);
      window.removeEventListener("storage", load);
    };
  }, [email]);

  return { usage, loaded };
}

export function SubscriptionStatusCard({
  user,
  role
}: {
  user: { email: string };
  role: SubscriptionRole;
}) {
  const { subscription, loaded } = useDemoSubscription(user.email, role);
  const { usage } = useLearnerSubscriptionUsage(user.email);
  const learnerAccess = role === "LEARNER" ? getLearnerPlanAccess(subscription.planName) : null;
  const trainerAccess = role === "TRAINER" ? getTrainerPlanAccess(subscription.planName) : null;
  const paymentAgentHref = role === "TRAINER" ? "/trainer/payment-agent" : "/learner/chatbot";
  const displayStatus = loaded ? getSubscriptionDisplayStatus(subscription) : getStableSubscriptionDisplayStatus(subscription);

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 text-ink shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss dark:text-emerald-300">Subscription</p>
          <h2 className="mt-2 text-xl font-black">{subscription.planName}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/65 dark:text-slate-300">{describeSubscription(subscription, displayStatus)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{displayStatus}</Badge>
          <Badge>{formatSubscriptionPrice(subscription.planPrice)}</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <MiniStat label="Status" value={displayStatus} />
        <MiniStat label="Renewal date" value={formatShortDate(subscription.renewalDate)} />
        <MiniStat label="Monthly price" value={formatSubscriptionPrice(subscription.planPrice)} />
        <MiniStat label="Payment" value={formatPaymentStatus(subscription.paymentStatus)} />
      </div>

      {learnerAccess ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <MiniStat label="Courses used" value={`${usage.courseEnrollments}/${formatLimit(learnerAccess.courseLimit)}`} />
          <MiniStat label="Chatbot used" value={`${usage.chatbotMessages}/${formatLimit(learnerAccess.chatbotLimit)}`} />
          <MiniStat label="Certificates" value={learnerAccess.certificates ? "Unlocked" : "Locked"} />
          <MiniStat label="Reminders" value={learnerAccess.priorityReminders ? "Priority" : "Standard"} />
        </div>
      ) : null}

      {trainerAccess ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniStat label="Course publishing" value={formatLimit(trainerAccess.coursePublishLimit)} />
          <MiniStat label="AI tools" value={trainerAccess.aiMarketing ? "Unlocked" : "Limited"} />
          <MiniStat label="Fraud support" value={trainerAccess.fraudSupport ? "Unlocked" : "Business only"} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link href={role === "TRAINER" ? "/trainer/settings" : "/learner/settings"}>Manage subscription</Link>
        </Button>
        <Button asChild>
          <Link href={paymentAgentHref}>Ask AI Payment Agent</Link>
        </Button>
      </div>
    </section>
  );
}

export function TrainerFeatureGate({
  user,
  feature,
  minimumPlan,
  children
}: {
  user: { email: string };
  feature: string;
  minimumPlan: "Trainer Pro" | "Trainer Business";
  children: React.ReactNode;
}) {
  const { subscription, loaded } = useDemoSubscription(user.email, "TRAINER");
  const allowed = minimumPlan === "Trainer Pro"
    ? subscription.planName === "Trainer Pro" || subscription.planName === "Trainer Business"
    : subscription.planName === "Trainer Business";

  if (allowed) {
    return <>{children}</>;
  }

  const plan = getPlansForRole("TRAINER").find((item) => item.name === minimumPlan)!;

  return (
    <section className="rounded-3xl border border-blue-200 bg-blue-50 p-8 text-center shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">Upgrade required</p>
      <h2 className="mt-3 text-3xl font-black text-blue-950 dark:text-blue-100">{feature} is available in {minimumPlan}.</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-blue-900/75 dark:text-blue-100/75">
        You are currently on {subscription.planName}{loaded ? "" : " by default"}. Upgrade to {minimumPlan} at {formatSubscriptionPrice(plan.price)} to unlock it. This is a mock subscription flow; no real billing occurs.
      </p>
      <Button asChild className="mt-5">
        <Link href="/trainer/settings">Upgrade plan</Link>
      </Button>
    </section>
  );
}

export function readSubscription(email: string, role: SubscriptionRole): SubscriptionMetadata {
  try {
    const stored = JSON.parse(window.localStorage.getItem(subscriptionStorageKey) ?? "{}") as Record<string, Partial<SubscriptionMetadata>>;
    const value = stored[subscriptionKey(email, role)];
    const fallback = getDefaultSubscription(role);

    if (!value || value.userRole !== role || typeof value.planName !== "string") {
      return fallback;
    }

    const paymentStatus: SubscriptionMetadata["paymentStatus"] =
      value.paymentStatus === "PAID" || value.paymentStatus === "CANCELLED" || value.paymentStatus === "FAILED"
        ? value.paymentStatus
        : value.planPrice === 0
          ? "FREE"
          : "PAID";

    return {
      userRole: role,
      planName: value.planName,
      planPrice: typeof value.planPrice === "number" ? value.planPrice : fallback.planPrice,
      billingCycle: "month",
      status: value.status === "CANCELLED" || value.status === "EXPIRED" || value.status === "PAYMENT_FAILED" ? value.status : "ACTIVE",
      startedAt: value.startedAt ?? fallback.startedAt,
      renewalDate: value.renewalDate ?? fallback.renewalDate,
      cancelledAt: value.cancelledAt ?? null,
      paymentStatus,
      receiptId: value.receiptId ?? fallback.receiptId
    };
  } catch {
    window.localStorage.removeItem(subscriptionStorageKey);
    return getDefaultSubscription(role);
  }
}

export function readLearnerUsage(email: string): LearnerSubscriptionUsage {
  try {
    const stored = JSON.parse(window.localStorage.getItem(subscriptionUsageStorageKey) ?? "{}") as Record<string, Partial<LearnerSubscriptionUsage>>;
    const value = stored[email.toLowerCase()];
    const fallback = defaultUsage();

    if (!value || value.monthKey !== fallback.monthKey) {
      return fallback;
    }

    return {
      monthKey: fallback.monthKey,
      courseEnrollments: Number(value.courseEnrollments ?? 0),
      chatbotMessages: Number(value.chatbotMessages ?? 0)
    };
  } catch {
    window.localStorage.removeItem(subscriptionUsageStorageKey);
    return defaultUsage();
  }
}

export function writeLearnerUsage(email: string, usage: LearnerSubscriptionUsage) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(subscriptionUsageStorageKey) ?? "{}") as Record<string, LearnerSubscriptionUsage>;
    stored[email.toLowerCase()] = usage;
    window.localStorage.setItem(subscriptionUsageStorageKey, JSON.stringify(stored));
    window.dispatchEvent(new Event(subscriptionEventName));
  } catch {
    window.localStorage.removeItem(subscriptionUsageStorageKey);
  }
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-cloud p-3 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/50 dark:text-slate-400">{label}</p>
      <p className="mt-2 font-black text-ink dark:text-slate-100">{value}</p>
    </div>
  );
}

function defaultUsage(): LearnerSubscriptionUsage {
  return {
    monthKey: currentMonthKey(),
    courseEnrollments: 0,
    chatbotMessages: 0
  };
}

function formatLimit(value: number) {
  return Number.isFinite(value) ? String(value) : "Unlimited";
}

function formatPaymentStatus(value: SubscriptionMetadata["paymentStatus"]) {
  if (value === "FREE") return "Free";
  if (value === "PAID") return "Paid";
  if (value === "FAILED") return "Payment failed";
  return "Cancelled";
}

function formatShortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function subscriptionKey(email: string, role: SubscriptionRole) {
  return `${role}:${email.toLowerCase()}`;
}
