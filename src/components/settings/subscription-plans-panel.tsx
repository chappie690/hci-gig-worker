"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubscriptionPaymentModal, type SubscriptionPaymentMethod } from "@/components/settings/subscription-payment-modal";
import { cn } from "@/lib/cn";
import {
  createSubscriptionMetadata,
  describeSubscription,
  formatSubscriptionPrice,
  getDefaultSubscription,
  getPlansForRole,
  getSubscriptionDisplayStatus,
  subscriptionEventName,
  subscriptionReceiptStorageKey,
  subscriptionStorageKey,
  type SubscriptionMetadata,
  type SubscriptionPlan,
  type SubscriptionRole
} from "@/lib/subscriptions";

export function SubscriptionPlansPanel({
  user,
  role
}: {
  user: { email: string; fullName: string };
  role: SubscriptionRole;
}) {
  const plans = useMemo(() => getPlansForRole(role), [role]);
  const [subscription, setSubscription] = useState<SubscriptionMetadata>(() => getDefaultSubscription(role));
  const [message, setMessage] = useState("");
  const [pendingPayment, setPendingPayment] = useState<{
    action: "activate" | "renew" | "fix_failed_payment";
    plan: SubscriptionPlan;
    actionLabel: string;
  } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSubscription(readSubscription(user.email, role));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [role, user.email]);

  function activatePlan(plan: SubscriptionPlan) {
    if (plan.price > 0) {
      setPendingPayment({
        action: subscription.planName === plan.name ? "renew" : "activate",
        plan,
        actionLabel: subscription.planName === plan.name ? `Renew ${plan.name}` : `Activate ${plan.name}`
      });
      return;
    }

    const next = createSubscriptionMetadata(role, plan);
    writeSubscription(user.email, next);
    saveSubscriptionReceipt(user, next, subscription.planName === plan.name ? "renew" : plan.price > subscription.planPrice ? "upgrade" : "downgrade");
    saveSubscriptionNotification(role, `${plan.name} activated`, `${user.fullName} moved to ${plan.name} at ${formatSubscriptionPrice(plan.price)}. Receipt ${next.receiptId} was generated.`);
    setSubscription(next);
    setMessage(`${plan.name} activated as a mock subscription. Receipt ${next.receiptId} was generated.`);
  }

  function cancelSubscription() {
    const next: SubscriptionMetadata = {
      ...subscription,
      status: "CANCELLED",
      cancelledAt: new Date().toISOString(),
      paymentStatus: "CANCELLED"
    };
    writeSubscription(user.email, next);
    saveSubscriptionReceipt(user, next, "cancel");
    saveSubscriptionNotification(role, "Subscription cancelled", `${subscription.planName} was cancelled in demo mode. No real billing action occurred.`);
    setSubscription(next);
    setMessage(`${subscription.planName} cancelled in demo mode. No real billing action occurred.`);
  }

  function renewSubscription() {
    if (subscription.planPrice > 0) {
      setPendingPayment({
        action: "renew",
        plan: {
          role,
          name: subscription.planName,
          price: subscription.planPrice,
          billingCycle: subscription.billingCycle,
          features: plans.find((plan) => plan.name === subscription.planName)?.features ?? ["Current subscription access"]
        },
        actionLabel: `Renew ${subscription.planName}`
      });
      return;
    }

    const next = renewMetadata(subscription);
    writeSubscription(user.email, next);
    saveSubscriptionReceipt(user, next, "renew");
    saveSubscriptionNotification(role, "Subscription renewed", `${next.planName} renewed at ${formatSubscriptionPrice(next.planPrice)}. Receipt ${next.receiptId} was generated.`);
    setSubscription(next);
    setMessage(`${next.planName} renewed. Mock receipt ${next.receiptId} was generated.`);
  }

  function simulateFailedPayment() {
    const next: SubscriptionMetadata = {
      ...subscription,
      paymentStatus: "FAILED",
      status: "PAYMENT_FAILED",
      cancelledAt: new Date().toISOString()
    };
    writeSubscription(user.email, next);
    saveSubscriptionNotification(role, "Subscription payment failed", `${subscription.planName} needs a mock payment fix before renewal.`);
    setSubscription(next);
    setMessage("Mock payment failed. Use Fix Failed Payment to restore the plan.");
  }

  function fixFailedPayment() {
    if (subscription.planPrice > 0) {
      setPendingPayment({
        action: "fix_failed_payment",
        plan: {
          role,
          name: subscription.planName,
          price: subscription.planPrice,
          billingCycle: subscription.billingCycle,
          features: plans.find((plan) => plan.name === subscription.planName)?.features ?? ["Current subscription access"]
        },
        actionLabel: `Fix payment for ${subscription.planName}`
      });
      return;
    }

    const next = renewMetadata({ ...subscription, status: "ACTIVE", cancelledAt: null, paymentStatus: subscription.planPrice === 0 ? "FREE" : "PAID" });
    writeSubscription(user.email, next);
    saveSubscriptionReceipt(user, next, "fix_failed_payment");
    saveSubscriptionNotification(role, "Subscription payment fixed", `${next.planName} is active again. Receipt ${next.receiptId} was generated.`);
    setSubscription(next);
    setMessage(`Mock payment fixed. ${next.planName} is active again.`);
  }

  function completePendingPayment(payment: SubscriptionPaymentMethod) {
    if (!pendingPayment) {
      return;
    }

    const next = pendingPayment.action === "activate"
      ? createSubscriptionMetadata(role, pendingPayment.plan)
      : renewMetadata({
        ...subscription,
        planName: pendingPayment.plan.name,
        planPrice: pendingPayment.plan.price,
        billingCycle: pendingPayment.plan.billingCycle,
        status: "ACTIVE",
        cancelledAt: null,
        paymentStatus: pendingPayment.plan.price === 0 ? "FREE" : "PAID"
      });
    const receiptAction = pendingPayment.action === "activate"
      ? pendingPayment.plan.price > subscription.planPrice
        ? "upgrade"
        : pendingPayment.plan.price < subscription.planPrice
          ? "downgrade"
          : "subscribe"
      : pendingPayment.action;

    writeSubscription(user.email, next);
    saveSubscriptionReceipt(user, next, receiptAction, payment);
    saveSubscriptionNotification(role, `${next.planName} activated`, `${user.fullName} completed a mock ${payment.methodType} subscription payment for ${next.planName}. Receipt ${next.receiptId} was generated.`);
    setSubscription(next);
    setMessage(`${next.planName} activated with ${payment.methodType}. Mock receipt ${next.receiptId} was generated.`);
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 text-ink shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss dark:text-emerald-300">Mock subscription</p>
          <h2 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">{role === "TRAINER" ? "Trainer plans" : "Learner plans"}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-slate-300">
            Demo-only subscription handling for the HCI prototype. Plans use $ currency and no real billing is processed.
          </p>
        </div>
        <Badge>{getSubscriptionDisplayStatus(subscription)}</Badge>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-200">Current subscription</p>
        <p className="mt-2 text-lg font-black text-blue-950 dark:text-blue-100">{subscription.planName}</p>
        <p className="mt-1 text-sm leading-6 text-blue-900/75 dark:text-blue-100/75">{describeSubscription(subscription)}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-blue-900 dark:text-blue-100">
          <span className="rounded-full bg-white px-3 py-1 dark:bg-slate-950">Receipt: {subscription.receiptId}</span>
          <span className="rounded-full bg-white px-3 py-1 dark:bg-slate-950">Payment: {subscription.paymentStatus}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const active = subscription.planName === plan.name && subscription.status === "ACTIVE";

          return (
            <article
              key={plan.name}
              className={cn(
                "flex min-h-full flex-col rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-xl focus-within:ring-4 focus-within:ring-blue-500/20 motion-reduce:hover:translate-y-0",
                active
                  ? "border-blue-300 bg-blue-50 shadow-lg shadow-blue-950/10 dark:border-blue-500/40 dark:bg-blue-950/30"
                  : "border-ink/10 bg-cloud dark:border-slate-700 dark:bg-slate-950"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-ink dark:text-slate-100">{plan.name}</h3>
                  <p className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-200">{formatSubscriptionPrice(plan.price)}</p>
                </div>
                {active ? <Badge>active</Badge> : null}
              </div>

              <ul className="mt-4 grid gap-2 text-sm leading-6 text-ink/70 dark:text-slate-300">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button type="button" className="mt-auto w-full justify-center" variant={active ? "secondary" : "primary"} onClick={() => activatePlan(plan)} disabled={active}>
                {active ? "Current plan" : plan.price === 0 ? "Use Free Plan" : `Activate ${plan.name}`}
              </Button>
            </article>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={renewSubscription}>
          Renew Mock Plan
        </Button>
        <Button type="button" variant="secondary" onClick={simulateFailedPayment} disabled={subscription.status === "CANCELLED"}>
          Simulate Failed Payment
        </Button>
        <Button type="button" variant="secondary" onClick={fixFailedPayment} disabled={subscription.status !== "PAYMENT_FAILED"}>
          Fix Failed Payment
        </Button>
        <Button type="button" variant="secondary" onClick={cancelSubscription} disabled={subscription.status === "CANCELLED"}>
          Cancel Mock Subscription
        </Button>
        {message ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" aria-live="polite">
            {message}
          </p>
        ) : null}
      </div>
      <SubscriptionPaymentModal
        open={Boolean(pendingPayment)}
        planName={pendingPayment?.plan.name ?? subscription.planName}
        planPrice={pendingPayment?.plan.price ?? subscription.planPrice}
        actionLabel={pendingPayment?.actionLabel ?? "Process subscription"}
        onClose={() => setPendingPayment(null)}
        onComplete={completePendingPayment}
      />
    </section>
  );
}

function readSubscription(email: string, role: SubscriptionRole): SubscriptionMetadata {
  try {
    const stored = JSON.parse(window.localStorage.getItem(subscriptionStorageKey) ?? "{}") as Record<string, SubscriptionMetadata>;
    return normalizeSubscription(stored[subscriptionKey(email, role)], role);
  } catch {
    window.localStorage.removeItem(subscriptionStorageKey);
    return getDefaultSubscription(role);
  }
}

function writeSubscription(email: string, subscription: SubscriptionMetadata) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(subscriptionStorageKey) ?? "{}") as Record<string, SubscriptionMetadata>;
    stored[subscriptionKey(email, subscription.userRole)] = subscription;
    window.localStorage.setItem(subscriptionStorageKey, JSON.stringify(stored));
    window.dispatchEvent(new Event(subscriptionEventName));
  } catch {
    window.localStorage.removeItem(subscriptionStorageKey);
  }
}

function renewMetadata(subscription: SubscriptionMetadata): SubscriptionMetadata {
  const now = new Date();
  const renewal = new Date(now);
  renewal.setMonth(renewal.getMonth() + 1);

  return {
    ...subscription,
    status: "ACTIVE",
    startedAt: subscription.startedAt || now.toISOString(),
    renewalDate: renewal.toISOString(),
    cancelledAt: null,
    paymentStatus: subscription.planPrice === 0 ? "FREE" : "PAID",
    receiptId: `SUB-${subscription.userRole.slice(0, 1)}-${now.getTime()}`
  };
}

function saveSubscriptionReceipt(user: { email: string; fullName: string }, subscription: SubscriptionMetadata, action: string, payment?: SubscriptionPaymentMethod) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(subscriptionReceiptStorageKey) ?? "{}") as Record<string, unknown>;
    stored[subscription.receiptId] = {
      id: subscription.receiptId,
      receiptNumber: subscription.receiptId,
      userName: user.fullName,
      userEmail: user.email,
      planName: subscription.planName,
      amount: subscription.planPrice,
      billingCycle: subscription.billingCycle,
      action,
      status: subscription.paymentStatus,
      paymentMethod: payment ? `${payment.methodType} - ${payment.label}` : subscription.paymentStatus,
      createdAt: new Date().toISOString(),
      note: "Mock subscription receipt for HCI demonstration. No real payment was made."
    };
    window.localStorage.setItem(subscriptionReceiptStorageKey, JSON.stringify(stored));
  } catch {
    window.localStorage.removeItem(subscriptionReceiptStorageKey);
  }
}

function saveSubscriptionNotification(role: SubscriptionRole, title: string, message: string) {
  try {
    const key = role === "TRAINER" ? "skillpilot_trainer_notifications" : "skillpilot_learner_notifications";
    const current = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
    const notification = {
      id: `subscription-${Date.now()}`,
      title,
      message,
      type: "SUBSCRIPTION",
      isRead: false,
      createdAt: new Date().toISOString()
    };
    window.localStorage.setItem(key, JSON.stringify([notification, ...(Array.isArray(current) ? current : [])].slice(0, 30)));
    window.dispatchEvent(new Event("skillpilot-notifications-updated"));
  } catch {
    // Subscription notifications are helpful but not required for the demo flow.
  }
}

function normalizeSubscription(value: Partial<SubscriptionMetadata> | undefined, role: SubscriptionRole): SubscriptionMetadata {
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
    billingCycle: "month" as const,
    status: value.status === "CANCELLED" || value.status === "EXPIRED" || value.status === "PAYMENT_FAILED" ? value.status : "ACTIVE",
    startedAt: value.startedAt ?? fallback.startedAt,
    renewalDate: value.renewalDate ?? fallback.renewalDate,
    cancelledAt: value.cancelledAt ?? null,
    paymentStatus,
    receiptId: value.receiptId ?? fallback.receiptId
  };
}

function subscriptionKey(email: string, role: SubscriptionRole) {
  return `${role}:${email.toLowerCase()}`;
}
