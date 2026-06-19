"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDemoSubscription } from "@/components/settings/subscription-access";
import { SubscriptionPaymentModal, type SubscriptionPaymentMethod } from "@/components/settings/subscription-payment-modal";
import { cn } from "@/lib/cn";
import { createSubscriptionMetadata, formatSubscriptionPrice, getPlansForRole, subscriptionEventName, subscriptionReceiptStorageKey, subscriptionStorageKey, type SubscriptionMetadata } from "@/lib/subscriptions";

type ChatMessage = {
  id: string;
  role: "trainer" | "agent";
  text: string;
};

type EmailDraft = {
  recipientLearnerName: string;
  recipientLearnerEmail: string;
  issueSummary: string;
  emailSubject: string;
  emailBody: string;
  actionTaken: string;
  nextStep: string;
  riskLevel: "low" | "medium" | "high";
  outcome: "resolved" | "refund_review" | "admin_review" | "learner_email" | "admin_report";
  escalationRecipient: "learner" | "admin" | "none";
};

type SubscriptionAction = {
  action: "UPGRADE" | "CANCEL" | "RENEW" | "FIX_PAYMENT";
  planName: string;
  title: string;
  description: string;
  buttonLabel: string;
};

const mockEmailStorageKey = "skillpilot_mock_finance_emails";

export function TrainerPaymentAgentChatbot({ trainer }: { trainer: { fullName: string; email: string } }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      text: "Ask me to handle learner payment issues, draft refund updates, review suspicious signals, or prepare a mock admin report. I will preview anything email-like before sending."
    }
  ]);
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [subscriptionAction, setSubscriptionAction] = useState<SubscriptionAction | null>(null);
  const [pendingSubscriptionAction, setPendingSubscriptionAction] = useState<SubscriptionAction | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const { subscription } = useDemoSubscription(trainer.email, "TRAINER");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading, draft, sending]);

  useEffect(() => {
    if (!loading && !sending) {
      inputRef.current?.focus();
    }
  }, [loading, sending]);

  async function submitPrompt(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = prompt.trim();

    if (!text || loading || sending) {
      return;
    }

    setPrompt("");
    setError("");
    setDraft(null);
    setSubscriptionAction(null);
    setEditing(false);
    setLoading(true);
    setMessages((current) => [...current, { id: `trainer-${Date.now()}`, role: "trainer", text }]);

    try {
      const response = await fetch("/api/ai/trainer-payment-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, subscription })
      });
      const data = await response.json().catch(() => null) as (Partial<EmailDraft> & {
        reply?: string;
        requiresEmail?: boolean;
        source?: string;
        message?: string;
        subscriptionAction?: SubscriptionAction | null;
      }) | null;
      setLoading(false);

      if (!response.ok || !data?.reply) {
        setError(data?.message ?? "Payment Agent hit some turbulence. Try again.");
        return;
      }

      setMessages((current) => {
        const reply = data.reply ?? "";
        const last = current[current.length - 1];

        if (last?.role === "agent" && last.text === reply) {
          return current;
        }

        return [...current, { id: `agent-${Date.now()}`, role: "agent", text: reply }];
      });

      if (data.requiresEmail) {
        setDraft({
          recipientLearnerName: data.recipientLearnerName ?? "Demo Learner",
          recipientLearnerEmail: data.recipientLearnerEmail ?? "demo.learner@example.com",
          issueSummary: data.issueSummary ?? "Payment support request",
          emailSubject: data.emailSubject ?? "SkillPilot payment support update",
          emailBody: data.emailBody ?? "This is a mock finance email for HCI demonstration.",
          actionTaken: data.actionTaken ?? "Prepared mock finance email.",
          nextStep: data.nextStep ?? "Preview and send the mock email if it looks correct.",
          riskLevel: data.riskLevel ?? "low",
          outcome: data.outcome ?? "learner_email",
          escalationRecipient: data.escalationRecipient ?? "learner"
        });
      }

      setSubscriptionAction(data.subscriptionAction ?? null);
    } catch {
      setLoading(false);
      setError("Payment Agent could not respond right now. Try again.");
    }
  }

  function updateDraft(field: keyof EmailDraft, value: string) {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
  }

  function cancelDraft() {
    setDraft(null);
    setEditing(false);
    setMessages((current) => [...current, { id: `agent-cancel-${Date.now()}`, role: "agent", text: "Mock email cancelled. No real email was sent." }]);
  }

  function sendMockEmail() {
    if (!draft || sending) {
      return;
    }

    setSending(true);
    window.setTimeout(() => {
      const id = `finance-email-${Date.now()}`;
      const record = {
        id,
        senderName: trainer.fullName,
        senderEmail: trainer.email,
        recipientName: draft.recipientLearnerName,
        recipientEmail: draft.recipientLearnerEmail,
        recipientType: draft.escalationRecipient,
        subject: draft.emailSubject,
        body: draft.emailBody,
        issueSummary: draft.issueSummary,
        actionTaken: draft.actionTaken,
        nextStep: draft.nextStep,
        riskLevel: draft.riskLevel,
        outcome: draft.outcome,
        createdAt: new Date().toISOString(),
        note: "This is a mock email for HCI demonstration."
      };
      saveMockEmail(record);
      setSending(false);
      router.push(`/trainer/payment-agent/mock-email?id=${encodeURIComponent(id)}`);
    }, 1100);
  }

  function applySubscriptionAction(action: SubscriptionAction) {
    if (action.action !== "CANCEL") {
      setPendingSubscriptionAction(action);
      return;
    }

    completeSubscriptionAction(action);
  }

  function completeSubscriptionAction(action: SubscriptionAction, payment?: SubscriptionPaymentMethod) {
    const plans = getPlansForRole("TRAINER");
    const plan = plans.find((item) => item.name === action.planName) ?? plans[0];
    const next = action.action === "CANCEL"
      ? { ...subscription, status: "CANCELLED" as const, paymentStatus: "CANCELLED" as const, cancelledAt: new Date().toISOString() }
      : action.action === "RENEW" || action.action === "FIX_PAYMENT"
        ? renewSubscription(subscription)
        : createSubscriptionMetadata("TRAINER", plan);

    writeSubscription(trainer.email, next);
    saveSubscriptionReceipt(trainer, next, action.action.toLowerCase(), payment);
    saveSubscriptionNotification(`${next.planName} updated`, `${trainer.fullName} completed a mock subscription ${action.action.toLowerCase().replace("_", " ")} for ${next.planName}. Receipt ${next.receiptId} was generated.`);
    setSubscriptionAction(null);
    setMessages((current) => [
      ...current,
      {
        id: `subscription-${Date.now()}`,
        role: "agent",
        text: `${action.buttonLabel} completed in mock mode. Current trainer plan: ${next.planName} at ${formatSubscriptionPrice(next.planPrice)}. Receipt ${next.receiptId} was generated. No real billing occurred.`
      }
    ]);
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white text-ink shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="border-b border-ink/10 p-5 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Finance assistant</p>
            <h2 className="mt-2 text-lg font-bold text-ink dark:text-slate-100">Payment Agent Chatbot</h2>
            <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-slate-300">
              Draft learner finance emails, review suspicious payment signals, or prepare mock admin escalation reports. No real email or payment action is performed.
            </p>
          </div>
          <Badge>Mock only</Badge>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="flex h-96 min-h-72 flex-col gap-3 overflow-y-auto rounded-2xl border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-950">
          {messages.map((message) => (
            <article key={message.id} className={cn("flex", message.role === "trainer" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[min(760px,86%)] rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm",
                  message.role === "trainer"
                    ? "border-blue-200 bg-blue-50 text-slate-900 dark:border-blue-500/30 dark:bg-blue-600/25 dark:text-blue-50"
                    : "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                )}
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {message.role === "trainer" ? "Trainer" : "AI Payment Agent"}
                </p>
                <p className="mt-2 whitespace-pre-line">{message.text}</p>
              </div>
            </article>
          ))}

          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <span>Checking finance context</span>
                <span className="ml-2 inline-flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.24s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.12s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
                </span>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} aria-hidden="true" />
        </div>

        {draft ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/25">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-blue-950 dark:text-blue-100">Mock email preview</p>
                <p className="mt-1 text-sm text-blue-900/75 dark:text-blue-100/75">
                  Risk: {draft.riskLevel}. Recipient: {draft.escalationRecipient === "admin" ? "Admin review" : "Learner support"}.
                </p>
              </div>
              <Badge>{draft.outcome.replace("_", " ")}</Badge>
            </div>

            <div className="mt-4 grid gap-3">
              <PreviewInput label="Recipient name" value={draft.recipientLearnerName} disabled={!editing} onChange={(value) => updateDraft("recipientLearnerName", value)} />
              <PreviewInput label="Recipient email" value={draft.recipientLearnerEmail} disabled={!editing} onChange={(value) => updateDraft("recipientLearnerEmail", value)} />
              <PreviewInput label="Subject" value={draft.emailSubject} disabled={!editing} onChange={(value) => updateDraft("emailSubject", value)} />
              <label className="grid gap-2 text-sm font-semibold text-ink dark:text-slate-100">
                Email body
                <textarea
                  className="min-h-44 rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-white/70 disabled:text-ink/70 dark:border-blue-900 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-300"
                  value={draft.emailBody}
                  disabled={!editing}
                  onChange={(event) => updateDraft("emailBody", event.target.value)}
                />
              </label>
              <div className="grid gap-2 rounded-xl bg-white p-3 text-sm text-ink/70 dark:bg-slate-950 dark:text-slate-300">
                <p><strong>Issue:</strong> {draft.issueSummary}</p>
                <p><strong>Action:</strong> {draft.actionTaken}</p>
                <p><strong>Next step:</strong> {draft.nextStep}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={sendMockEmail} disabled={sending || loading}>
                {sending ? "Sending mock email..." : draft.escalationRecipient === "admin" ? "Send Mock Admin Email" : "Send Mock Email"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing((current) => !current)} disabled={sending}>
                {editing ? "Lock Email" : "Edit Email"}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelDraft} disabled={sending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {subscriptionAction ? (
          <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 dark:border-purple-900/50 dark:bg-purple-950/25">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-purple-950 dark:text-purple-100">{subscriptionAction.title}</p>
                <p className="mt-2 text-sm leading-6 text-purple-900/75 dark:text-purple-100/75">{subscriptionAction.description}</p>
              </div>
              <Badge>mock billing</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={() => applySubscriptionAction(subscriptionAction)} disabled={loading || sending}>
                {subscriptionAction.buttonLabel}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSubscriptionAction(null)} disabled={loading || sending}>
                Keep Current Plan
              </Button>
            </div>
          </div>
        ) : null}

        <form className="grid gap-3" onSubmit={submitPrompt}>
          <label className="sr-only" htmlFor="trainer-payment-agent-prompt">Payment Agent prompt</label>
          <textarea
            id="trainer-payment-agent-prompt"
            ref={inputRef}
            className="min-h-24 rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/45 focus:border-moss focus:ring-4 focus:ring-limewash disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-950"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={loading || sending}
            placeholder="Example: Send an email to learner Ahmad about double payment issue."
          />

      {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={loading || sending || !prompt.trim()}>
              {loading ? "Processing..." : "Send prompt"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPrompt("Notify learner about suspicious payment activity.")}
              disabled={loading || sending}
            >
              Try fraud prompt
            </Button>
          </div>
        </form>
      </div>
      <SubscriptionPaymentModal
        open={Boolean(pendingSubscriptionAction)}
        planName={pendingSubscriptionAction?.planName ?? subscription.planName}
        planPrice={getActionPrice(pendingSubscriptionAction, subscription)}
        actionLabel={pendingSubscriptionAction?.buttonLabel ?? "Process subscription"}
        onClose={() => setPendingSubscriptionAction(null)}
        onComplete={(payment) => {
          if (pendingSubscriptionAction) {
            completeSubscriptionAction(pendingSubscriptionAction, payment);
          }
        }}
      />
    </section>
  );
}

function PreviewInput({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink dark:text-slate-100">
      {label}
      <input
        className="min-h-11 rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-white/70 disabled:text-ink/70 dark:border-blue-900 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-300"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function saveMockEmail(record: unknown) {
  try {
    const id = typeof record === "object" && record && "id" in record ? String(record.id) : `finance-email-${Date.now()}`;
    window.sessionStorage.setItem(`skillpilot_mock_finance_email_${id}`, JSON.stringify(record));
    const current = JSON.parse(window.localStorage.getItem(mockEmailStorageKey) ?? "[]") as unknown[];
    window.localStorage.setItem(mockEmailStorageKey, JSON.stringify([record, ...(Array.isArray(current) ? current : [])].slice(0, 20)));
  } catch {
    window.localStorage.removeItem(mockEmailStorageKey);
  }
}

function renewSubscription(subscription: SubscriptionMetadata): SubscriptionMetadata {
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

function writeSubscription(email: string, subscription: SubscriptionMetadata) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(subscriptionStorageKey) ?? "{}") as Record<string, SubscriptionMetadata>;
    stored[`${subscription.userRole}:${email.toLowerCase()}`] = subscription;
    window.localStorage.setItem(subscriptionStorageKey, JSON.stringify(stored));
    window.dispatchEvent(new Event(subscriptionEventName));
  } catch {
    window.localStorage.removeItem(subscriptionStorageKey);
  }
}

function saveSubscriptionReceipt(
  trainer: { fullName: string; email: string },
  subscription: SubscriptionMetadata,
  action: string,
  payment?: SubscriptionPaymentMethod
) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(subscriptionReceiptStorageKey) ?? "{}") as Record<string, unknown>;
    stored[subscription.receiptId] = {
      id: subscription.receiptId,
      userName: trainer.fullName,
      userEmail: trainer.email,
      userRole: subscription.userRole,
      planName: subscription.planName,
      planPrice: subscription.planPrice,
      billingCycle: subscription.billingCycle,
      paymentStatus: subscription.paymentStatus,
      status: subscription.status,
      action,
      paymentMethod: payment ? `${payment.methodType} - ${payment.label}` : subscription.paymentStatus,
      createdAt: new Date().toISOString(),
      note: "This is a mock SkillPilot subscription receipt. No real billing occurred."
    };
    window.localStorage.setItem(subscriptionReceiptStorageKey, JSON.stringify(stored));
  } catch {
    window.localStorage.removeItem(subscriptionReceiptStorageKey);
  }
}

function saveSubscriptionNotification(title: string, message: string) {
  try {
    const current = JSON.parse(window.localStorage.getItem("skillpilot_trainer_notifications") ?? "[]") as unknown[];
    const notification = {
      id: `subscription-${Date.now()}`,
      title,
      message,
      type: "SUBSCRIPTION",
      isRead: false,
      createdAt: new Date().toISOString()
    };
    window.localStorage.setItem("skillpilot_trainer_notifications", JSON.stringify([notification, ...(Array.isArray(current) ? current : [])].slice(0, 30)));
    window.dispatchEvent(new Event("skillpilot-notifications-updated"));
  } catch {
    // Notifications are optional for this mock flow.
  }
}

function getActionPrice(action: SubscriptionAction | null, subscription: SubscriptionMetadata) {
  if (!action) {
    return subscription.planPrice;
  }

  const plan = getPlansForRole("TRAINER").find((item) => item.name === action.planName);
  return plan?.price ?? subscription.planPrice;
}
