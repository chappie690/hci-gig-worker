"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readLearnerUsage, writeLearnerUsage } from "@/components/settings/subscription-access";
import { SubscriptionPaymentModal, type SubscriptionPaymentMethod } from "@/components/settings/subscription-payment-modal";
import { cn } from "@/lib/cn";
import { createSubscriptionMetadata, formatSubscriptionPrice, getDefaultSubscription, getLearnerPlanAccess, getPlansForRole, subscriptionEventName, subscriptionReceiptStorageKey, subscriptionStorageKey, type SubscriptionMetadata, type SubscriptionRole } from "@/lib/subscriptions";

export type CourseOption = {
  id: string;
  title: string;
};

export type ChatItem = {
  id: string;
  sender: string;
  message: string;
  createdAt: string;
  course: CourseOption | null;
};

export type TeachingStyle = "Direct" | "Encouraging" | "Humorous";

export type NavigationTarget = {
  title: string;
  href: string;
  reason: string;
  actionLabel: string;
  keywords: string[];
};

type PaymentMethodType = "Mock Card" | "Online Banking" | "E-Wallet";

type SavedPaymentMethod = {
  methodType: PaymentMethodType;
  label: string;
  updatedAt: string;
};

type ChatActionCard =
  | { type: "SAVE_PAYMENT_METHOD"; title: string; description: string; buttonLabel: string }
  | { type: "CONFIRM_PURCHASE"; title: string; description: string; buttonLabel: string; courseId: string; courseTitle: string; amount: number }
  | { type: "VIEW_RECEIPT"; title: string; description: string; buttonLabel: string; href: string }
  | { type: "VIEW_COURSE"; title: string; description: string; buttonLabel: string; href: string }
  | { type: "SUBSCRIPTION_ACTION"; title: string; description: string; buttonLabel: string; action: "UPGRADE" | "CANCEL" | "RENEW" | "FIX_PAYMENT"; role: SubscriptionRole; planName?: string }
  | { type: "CONFIRM_UNENROLL"; title: string; description: string; buttonLabel: string; courseId: string; courseTitle: string };

type ChatbotWorkspaceProps = {
  user: { fullName: string; email: string };
  courses: CourseOption[];
  initialMessages: ChatItem[];
  endpoint: string;
  botName: string;
  botInitials: string;
  workspaceTitle: string;
  savedHistoryLabel: string;
  contextLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  placeholder: string;
  emptyQuestionError: string;
  loadingText: string;
  navigationTargets: NavigationTarget[];
  styleStorageKey: string;
  onStyleSaved?: (style: TeachingStyle) => string;
  requestMode?: string;
  enablePaymentAgentActions?: boolean;
};

const styleSamples: Record<TeachingStyle, string> = {
  Direct: "Clear answer, practical step, no extra fluff.",
  Encouraging: "Supportive coaching with a confident next step.",
  Humorous: "Friendly and light, while staying useful."
};

export function ChatbotWorkspace({
  user,
  initialMessages,
  endpoint,
  botName,
  botInitials,
  workspaceTitle,
  savedHistoryLabel,
  emptyTitle,
  emptyDescription,
  placeholder,
  emptyQuestionError,
  loadingText,
  navigationTargets,
  styleStorageKey,
  onStyleSaved,
  requestMode,
  enablePaymentAgentActions = false
}: ChatbotWorkspaceProps) {
  const router = useRouter();
  const courseId = "";
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>("Encouraging");
  const [styleFeedback, setStyleFeedback] = useState("");
  const [suggestion, setSuggestion] = useState<NavigationTarget | null>(null);
  const [actionCards, setActionCards] = useState<ChatActionCard[]>([]);
  const [savedPaymentMethod, setSavedPaymentMethod] = useState<SavedPaymentMethod | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionMetadata | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingSubscriptionAction, setPendingSubscriptionAction] = useState<Extract<ChatActionCard, { type: "SUBSCRIPTION_ACTION" }> | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const visibleMessages = useMemo(() => sortMessagesOldestFirst(messages), [messages]);

  useEffect(() => {
    const role = requestMode === "trainer" ? "TRAINER" : "LEARNER";
    const loadSubscription = () => setSubscription(readStoredSubscription(user.email, role));
    const timer = window.setTimeout(() => {
      const storedStyle = window.localStorage.getItem(styleStorageKey);

      if (storedStyle === "Direct" || storedStyle === "Encouraging" || storedStyle === "Humorous") {
        setTeachingStyle(storedStyle);
      }

      if (enablePaymentAgentActions) {
        setSavedPaymentMethod(readSavedPaymentMethod());
      }

      loadSubscription();
    }, 0);
    window.addEventListener(subscriptionEventName, loadSubscription);
    window.addEventListener("storage", loadSubscription);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(subscriptionEventName, loadSubscription);
      window.removeEventListener("storage", loadSubscription);
    };
  }, [enablePaymentAgentActions, requestMode, styleStorageKey, user.email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages.length, loading, actionCards.length, suggestion]);

  useEffect(() => {
    if (!loading) {
      composerRef.current?.focus();
    }
  }, [loading]);

  function updateTeachingStyle(nextStyle: TeachingStyle) {
    setTeachingStyle(nextStyle);
    window.localStorage.setItem(styleStorageKey, nextStyle);
    setStyleFeedback(onStyleSaved?.(nextStyle) ?? "Teaching style saved.");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      setError(emptyQuestionError);
      composerRef.current?.focus();
      return;
    }

    const outgoingMessage = message.trim();
    if (enablePaymentAgentActions) {
      const plan = subscription ?? getDefaultSubscription("LEARNER");
      const access = getLearnerPlanAccess(plan.planName);
      const usage = readLearnerUsage(user.email);

      if (Number.isFinite(access.chatbotLimit) && usage.chatbotMessages >= access.chatbotLimit) {
        const upgrade = getPlansForRole("LEARNER").find((item) => item.name === "Pro Learner");
        setError(`Your ${plan.planName} Pilot Pete limit is used (${usage.chatbotMessages}/${access.chatbotLimit}). Upgrade to ${upgrade?.name ?? "Pro Learner"} at ${formatSubscriptionPrice(upgrade?.price ?? 49)} for full Pilot Pete access.`);
        composerRef.current?.focus();
        return;
      }
    }

    const nextSuggestion = shouldOfferNavigation(outgoingMessage) ? findNavigationTarget(outgoingMessage, navigationTargets) : null;
    setLoading(true);
    setError("");
    setSuggestion(null);
    setActionCards([]);
    setMessage("");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: outgoingMessage,
        courseId: courseId || null,
        teachingStyle,
        mode: requestMode,
        paymentMethod: enablePaymentAgentActions ? savedPaymentMethod : null,
        subscription
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(data?.message ?? `${botName} hit some turbulence. Please try again.`);
      return;
    }

    if (enablePaymentAgentActions) {
      const usage = readLearnerUsage(user.email);
      writeLearnerUsage(user.email, {
        ...usage,
        chatbotMessages: usage.chatbotMessages + 1
      });
    }

    setMessages((current) => mergeChatMessages(current, data.messages));
    setActionCards(Array.isArray(data.actionCards) ? data.actionCards : []);
    setSuggestion(nextSuggestion);
  }

  async function runAction(action: ChatActionCard) {
    if (action.type === "SAVE_PAYMENT_METHOD") {
      setShowPaymentModal(true);
      return;
    }

    if (action.type === "VIEW_RECEIPT" || action.type === "VIEW_COURSE") {
      router.push(action.href);
      return;
    }

    if (action.type === "SUBSCRIPTION_ACTION") {
      runSubscriptionAction(action);
      return;
    }

    setLoading(true);
    setError("");
    setActionCards([]);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: action.buttonLabel,
        courseId: courseId || null,
        teachingStyle,
        paymentMethod: enablePaymentAgentActions ? savedPaymentMethod : null,
        subscription,
        action: {
          type: action.type,
          courseId: action.courseId
        }
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(data?.message ?? `${botName} hit some turbulence. Please try again.`);
      return;
    }

    setMessages((current) => mergeChatMessages(current, data.messages));
    setActionCards(Array.isArray(data.actionCards) ? data.actionCards : []);
  }

  function savePaymentMethod(method: SavedPaymentMethod) {
    window.localStorage.setItem(paymentMethodStorageKey, JSON.stringify(method));
    setSavedPaymentMethod(method);
    setShowPaymentModal(false);
    setStyleFeedback("Payment method saved for mock checkout. No real card details were stored.");
  }

  function runSubscriptionAction(action: Extract<ChatActionCard, { type: "SUBSCRIPTION_ACTION" }>) {
    if (action.action !== "CANCEL") {
      setPendingSubscriptionAction(action);
      return;
    }

    completeSubscriptionAction(action);
  }

  function completeSubscriptionAction(action: Extract<ChatActionCard, { type: "SUBSCRIPTION_ACTION" }>, payment?: SubscriptionPaymentMethod) {
    const role = action.role;
    const plans = getPlansForRole(role);
    const current = subscription ?? getDefaultSubscription(role);
    const targetPlan = action.planName
      ? plans.find((plan) => plan.name === action.planName)
      : plans.find((plan) => plan.price > current.planPrice) ?? plans[plans.length - 1];
    const now = new Date();
    const next = action.action === "CANCEL"
      ? { ...current, status: "CANCELLED" as const, paymentStatus: "CANCELLED" as const, cancelledAt: now.toISOString() }
      : action.action === "FIX_PAYMENT" || action.action === "RENEW"
        ? renewSubscriptionMetadata({ ...current, status: "ACTIVE", paymentStatus: current.planPrice === 0 ? "FREE" : "PAID", cancelledAt: null })
        : createSubscriptionMetadata(role, targetPlan ?? plans[0]);

    writeStoredSubscription(user.email, next);
    saveSubscriptionReceipt(user, next, action.action.toLowerCase(), payment);
    saveSubscriptionNotification(role, `${next.planName} updated`, `${user.fullName} completed a mock subscription ${action.action.toLowerCase().replace("_", " ")} for ${next.planName}. Receipt ${next.receiptId} was generated.`);
    setSubscription(next);
    setActionCards([]);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `subscription-${Date.now()}`,
        sender: "AI_BOT",
        message: `${action.buttonLabel} completed in mock mode. Your current plan is ${next.planName} at ${formatSubscriptionPrice(next.planPrice)}. Receipt ${next.receiptId} was generated. No real billing occurred.`,
        createdAt: new Date().toISOString(),
        course: null
      }
    ]);
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-4 py-5 text-slate-900 shadow-2xl shadow-slate-900/10 transition-colors dark:border-slate-800 dark:bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.22),transparent_30%),linear-gradient(145deg,#050b18,#08111f_48%,#020617)] dark:text-white dark:shadow-slate-950/20 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute right-10 top-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-4">
        <div className="border-b border-slate-200 pb-4 dark:border-slate-800/90">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{savedHistoryLabel}</p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{workspaceTitle}</h2>
          </div>
        </div>

        <div className="flex h-[52vh] min-h-[420px] flex-col gap-4 overflow-y-auto pr-1 [scrollbar-color:#94a3b8_transparent] dark:[scrollbar-color:#334155_transparent]">
          {visibleMessages.length ? (
            visibleMessages.map((item) => (
              <ChatBubble
                key={item.id}
                item={item}
                botName={botName}
                botInitials={botInitials}
                userName={user.fullName}
                selectedCourseTitle={null}
              />
            ))
          ) : (
            <EmptyConversation botInitials={botInitials} title={emptyTitle} description={emptyDescription} />
          )}

          {loading ? (
            <div className="flex items-start gap-3">
              <BotAvatar initials={botInitials} label={`${botName} avatar`} />
              <TypingIndicator text={loadingText} />
            </div>
          ) : null}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        {suggestion ? (
          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-4 text-slate-900 shadow-lg dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-slate-100">
            <p className="text-sm font-black">I answered above. Want me to open {suggestion.title} too?</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">That page is best when you need to {suggestion.reason}.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" onClick={() => router.push(suggestion.href)}>
                {suggestion.actionLabel}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSuggestion(null)}>
                No, stay here
              </Button>
            </div>
          </div>
        ) : null}

        {actionCards.length ? (
          <div className="grid gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-slate-900 shadow-lg dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-slate-100 sm:grid-cols-2">
            {actionCards.map((action) => (
              <article key={actionCardKey(action)} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <p className="text-sm font-black">{action.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{action.description}</p>
                <Button type="button" className="mt-3" onClick={() => runAction(action)} disabled={loading}>
                  {action.buttonLabel}
                </Button>
              </article>
            ))}
          </div>
        ) : null}

        {enablePaymentAgentActions && savedPaymentMethod ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
            Saved mock payment method: {savedPaymentMethod.methodType} ({savedPaymentMethod.label}). Only safe demo details are stored.
          </p>
        ) : null}

        <form className="grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800" onSubmit={onSubmit}>
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Teaching style">
            {(["Direct", "Encouraging", "Humorous"] as TeachingStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 hover:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 active:scale-[0.98] motion-reduce:hover:translate-y-0",
                  teachingStyle === style
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-800"
                )}
                role="tab"
                aria-selected={teachingStyle === style}
                onClick={() => updateTeachingStyle(style)}
              >
                {style}
              </button>
            ))}
            <span className="text-xs text-slate-500 dark:text-slate-400">{styleSamples[teachingStyle]}</span>
          </div>

          {styleFeedback ? <p className="text-xs font-semibold text-blue-700 dark:text-blue-200" aria-live="polite">{styleFeedback}</p> : null}

          <label className="sr-only" htmlFor={`${requestMode ?? "learner"}-chatbot-question`}>Ask {botName}</label>
          <textarea
            id={`${requestMode ?? "learner"}-chatbot-question`}
            ref={composerRef}
            className="min-h-28 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-300 focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950/75 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={placeholder}
            disabled={loading}
          />

          {error ? <p className="rounded-xl border border-red-500/30 bg-red-950/50 px-3 py-2 text-sm font-semibold text-red-100">{error}</p> : null}

          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? (enablePaymentAgentActions ? "AI Payment Agent is checking your account..." : "Brewing some AI coffee...") : "Send question"}
          </Button>
        </form>
      </div>

      {showPaymentModal ? (
        <PaymentMethodModal
          onClose={() => setShowPaymentModal(false)}
          onSave={savePaymentMethod}
        />
      ) : null}
      <SubscriptionPaymentModal
        open={Boolean(pendingSubscriptionAction)}
        planName={pendingSubscriptionAction?.planName ?? subscription?.planName ?? "SkillPilot plan"}
        planPrice={getSubscriptionActionPrice(pendingSubscriptionAction, subscription)}
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

const paymentMethodStorageKey = "skillpilot_mock_payment_method";
const paymentMethodTypes: PaymentMethodType[] = ["Mock Card", "Online Banking", "E-Wallet"];

function PaymentMethodModal({
  onClose,
  onSave
}: {
  onClose: () => void;
  onSave: (method: SavedPaymentMethod) => void;
}) {
  const [methodType, setMethodType] = useState<PaymentMethodType>("Mock Card");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeLabel = buildSafePaymentLabel(methodType, value);

    if (!safeLabel) {
      setError(methodType === "Mock Card" ? "Enter only the last 4 mock card digits." : "Enter a mock provider name.");
      return;
    }

    onSave({
      methodType,
      label: safeLabel,
      updatedAt: new Date().toISOString()
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4" role="dialog" aria-modal="true" aria-labelledby="payment-method-title">
      <form className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-5 text-slate-100 shadow-2xl" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">AI Payment Agent</p>
            <h2 id="payment-method-title" className="mt-2 text-xl font-black">Save mock payment method</h2>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This prototype stores only safe mock data. Do not enter a real card number.
        </p>

        <label className="mt-4 grid gap-2 text-sm font-bold text-slate-200">
          Method type
          <select
            className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-slate-100 outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-500/20"
            value={methodType}
            onChange={(event) => {
              setMethodType(event.target.value as PaymentMethodType);
              setValue("");
              setError("");
            }}
          >
            {paymentMethodTypes.map((method) => <option key={method}>{method}</option>)}
          </select>
        </label>

        <label className="mt-4 grid gap-2 text-sm font-bold text-slate-200">
          {methodType === "Mock Card" ? "Mock card ending" : methodType === "E-Wallet" ? "E-wallet provider" : "Online banking provider"}
          <input
            className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-slate-100 outline-none placeholder:text-slate-500 focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-500/20"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={methodType === "Mock Card" ? "1234" : methodType === "E-Wallet" ? "Touch n Go demo" : "Mock Bank"}
            inputMode={methodType === "Mock Card" ? "numeric" : "text"}
          />
        </label>

        {error ? <p className="mt-3 rounded-xl border border-red-500/30 bg-red-950/50 px-3 py-2 text-sm font-semibold text-red-100">{error}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Payment Method</Button>
        </div>
      </form>
    </div>
  );
}

function ChatBubble({
  item,
  botName,
  botInitials,
  userName,
  selectedCourseTitle
}: {
  item: ChatItem;
  botName: string;
  botInitials: string;
  userName: string;
  selectedCourseTitle: string | null;
}) {
  const isUser = item.sender === "USER";
  const courseLabel = item.course?.title ?? selectedCourseTitle ?? "General";
  const displayMessage = isUser ? item.message : cleanBotMessage(item.message, courseLabel);

  return (
    <article className={cn("flex items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? <BotAvatar initials={botInitials} label={`${botName} avatar`} /> : null}
      <div className={cn("max-w-[min(760px,82%)]", isUser && "order-1")}>
        <div className={cn("mb-1 flex flex-wrap items-center gap-2", isUser && "justify-end")}>
          <Badge className={isUser ? "bg-slate-800 text-slate-100 dark:bg-slate-700" : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100"}>
            {isUser ? "You" : botName}
          </Badge>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{courseLabel}</span>
        </div>
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm leading-6 shadow-lg transition-colors",
            isUser
              ? "border-blue-200 bg-blue-50 text-slate-900 dark:border-blue-400/20 dark:bg-blue-600/30 dark:text-blue-50"
              : "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
          )}
        >
          <p className="whitespace-pre-line">{displayMessage}</p>
        </div>
      </div>
      {isUser ? <UserAvatar name={userName} /> : null}
    </article>
  );
}

function EmptyConversation({ botInitials, title, description }: { botInitials: string; title: string; description: string }) {
  return (
    <div className="mx-auto grid max-w-2xl place-items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950/40">
      <BotAvatar initials={botInitials} label={`${title} avatar`} />
      <h3 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

function BotAvatar({ initials, label }: { initials: string; label: string }) {
  return (
    <span
      aria-label={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-200 bg-slate-100 text-xs font-black text-blue-700 shadow-lg shadow-blue-950/20"
      role="img"
    >
      {initials}
    </span>
  );
}

function UserAvatar({ name }: { name: string }) {
  return (
    <span
      aria-label={`${name} avatar`}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-600 bg-slate-200 text-xs font-black text-slate-800 shadow-lg"
      role="img"
    >
      {initials(name)}
    </span>
  );
}

function TypingIndicator({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <span>{text}</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.24s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.12s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
        </span>
      </div>
    </div>
  );
}

function findNavigationTarget(message: string, targets: NavigationTarget[]) {
  const normalized = message.toLowerCase();
  return targets.find((target) => target.keywords.some((keyword) => normalized.includes(keyword))) ?? null;
}

function shouldOfferNavigation(message: string) {
  return /\b(open|go to|take me|navigate|where can i|where do i|show me the page|which page|which tab)\b/i.test(message);
}

function sortMessagesOldestFirst(items: ChatItem[]) {
  return [...items].sort((first, second) => {
    const firstTime = Date.parse(first.createdAt);
    const secondTime = Date.parse(second.createdAt);
    return (Number.isNaN(firstTime) ? 0 : firstTime) - (Number.isNaN(secondTime) ? 0 : secondTime);
  });
}

function mergeChatMessages(current: ChatItem[], incoming: ChatItem[] | undefined) {
  const byId = new Map<string, ChatItem>();

  for (const item of current) {
    byId.set(item.id, item);
  }

  if (Array.isArray(incoming)) {
    for (const item of incoming) {
      byId.set(item.id, item);
    }
  }

  return Array.from(byId.values());
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "");
}

function cleanBotMessage(message: string, courseLabel: string) {
  const normalized = message.toLowerCase();
  const blocked = ["jailbreak", "ignore previous instructions", "system prompt", "developer message", "prompt injection"];

  if (!blocked.some((term) => normalized.includes(term))) {
    return message;
  }

  return `I can help with ${courseLabel === "General" ? "your SkillPilot workspace" : courseLabel}: sessions, courses, progress, certificates, payments, revenue, and practical next steps. What would you like to do next?`;
}

function readSavedPaymentMethod() {
  try {
    const stored = window.localStorage.getItem(paymentMethodStorageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<SavedPaymentMethod>;
    if (!parsed.methodType || !paymentMethodTypes.includes(parsed.methodType) || !parsed.label) {
      window.localStorage.removeItem(paymentMethodStorageKey);
      return null;
    }

    return {
      methodType: parsed.methodType,
      label: String(parsed.label).slice(0, 80),
      updatedAt: parsed.updatedAt ?? new Date().toISOString()
    };
  } catch {
    window.localStorage.removeItem(paymentMethodStorageKey);
    return null;
  }
}

function readStoredSubscription(email: string, role: SubscriptionRole) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(subscriptionStorageKey) ?? "{}") as Record<string, Partial<SubscriptionMetadata>>;
    const value = stored[`${role}:${email.toLowerCase()}`];
    const fallback = getDefaultSubscription(role);

    if (!value || value.userRole !== role || typeof value.planName !== "string") {
      return fallback;
    }

    return {
      userRole: role,
      planName: value.planName,
      planPrice: typeof value.planPrice === "number" ? value.planPrice : fallback.planPrice,
      billingCycle: "month" as const,
      status: value.status === "CANCELLED" || value.status === "EXPIRED" || value.status === "PAYMENT_FAILED" ? value.status : "ACTIVE" as const,
      startedAt: value.startedAt ?? fallback.startedAt,
      renewalDate: value.renewalDate ?? fallback.renewalDate,
      cancelledAt: value.cancelledAt ?? null,
      paymentStatus: value.paymentStatus === "PAID" || value.paymentStatus === "CANCELLED" || value.paymentStatus === "FAILED" ? value.paymentStatus : value.planPrice === 0 ? "FREE" as const : "PAID" as const,
      receiptId: value.receiptId ?? fallback.receiptId
    };
  } catch {
    window.localStorage.removeItem(subscriptionStorageKey);
    return getDefaultSubscription(role);
  }
}

function writeStoredSubscription(email: string, subscription: SubscriptionMetadata) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(subscriptionStorageKey) ?? "{}") as Record<string, SubscriptionMetadata>;
    stored[`${subscription.userRole}:${email.toLowerCase()}`] = subscription;
    window.localStorage.setItem(subscriptionStorageKey, JSON.stringify(stored));
    window.dispatchEvent(new Event(subscriptionEventName));
  } catch {
    window.localStorage.removeItem(subscriptionStorageKey);
  }
}

function renewSubscriptionMetadata(subscription: SubscriptionMetadata): SubscriptionMetadata {
  const now = new Date();
  const renewal = new Date(now);
  renewal.setMonth(renewal.getMonth() + 1);

  return {
    ...subscription,
    status: "ACTIVE",
    renewalDate: renewal.toISOString(),
    cancelledAt: null,
    paymentStatus: subscription.planPrice === 0 ? "FREE" : "PAID",
    receiptId: `SUB-${subscription.userRole.slice(0, 1)}-${now.getTime()}`
  };
}

function saveSubscriptionReceipt(user: { fullName: string; email: string }, subscription: SubscriptionMetadata, action: string, payment?: SubscriptionPaymentMethod) {
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
    // Notifications are helpful for the demo but should not block subscription updates.
  }
}

function getSubscriptionActionPrice(
  action: Extract<ChatActionCard, { type: "SUBSCRIPTION_ACTION" }> | null,
  subscription: SubscriptionMetadata | null
) {
  if (!action) {
    return subscription?.planPrice ?? 0;
  }

  const plan = action.planName ? getPlansForRole(action.role).find((item) => item.name === action.planName) : null;
  return plan?.price ?? subscription?.planPrice ?? 0;
}

function buildSafePaymentLabel(methodType: PaymentMethodType, value: string) {
  const trimmed = value.trim();

  if (methodType === "Mock Card") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length !== 4) return "";
    return `card ending ${digits}`;
  }

  if (!trimmed || trimmed.length < 2) return "";
  return trimmed.replace(/[<>]/g, "").slice(0, 40);
}

function actionCardKey(action: ChatActionCard) {
  if ("courseId" in action) return `${action.type}-${action.courseId}`;
  if ("href" in action) return `${action.type}-${action.href}`;
  if (action.type === "SUBSCRIPTION_ACTION") return `${action.type}-${action.action}-${action.planName ?? action.role}`;
  return `${action.type}-${action.title}`;
}
