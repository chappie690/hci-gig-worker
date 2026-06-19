"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readLearnerUsage, useDemoSubscription, writeLearnerUsage } from "@/components/settings/subscription-access";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { readLocalAICourses, type LocalAICourse } from "@/lib/local-ai-course-storage";
import { findStoredProfileBranding, getDisplayLogo } from "@/lib/profile-branding";
import { formatSubscriptionPrice, getLearnerPlanAccess, getPlansForRole } from "@/lib/subscriptions";

export type PurchasableCourse = {
  id: string;
  title: string;
  description: string;
  trainerName: string;
  trainerEmail?: string;
  category: string;
  level: string;
  duration: string;
  rating: string;
  topic?: string;
  originalAmount: number;
  discountLabel: string;
  discountAmount: number;
  finalAmount: number;
  enrolled: boolean;
  recommendationReason?: string;
  skillsGained?: string[];
};

const purchasedStorageKey = "skillpilot-demo-purchased-course-ids";
const receiptStorageKey = "skillpilot-demo-receipts";
const paymentMethods = ["Debit / Credit Card", "Online Banking / Payment", "E-Wallet"];

export function CoursePurchasePanel({
  courses,
  compact = false,
  emptyText = "No purchasable courses are available right now.",
  learnerName = "Demo Learner",
  learnerEmail = "learner@skillpilot.ai"
}: {
  courses: PurchasableCourse[];
  compact?: boolean;
  emptyText?: string;
  learnerName?: string;
  learnerEmail?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<PurchasableCourse | null>(null);
  const [preview, setPreview] = useState<PurchasableCourse | null>(null);
  const [method, setMethod] = useState(paymentMethods[0]);
  const [mockDetails, setMockDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [localAICourses, setLocalAICourses] = useState<LocalAICourse[]>([]);
  const { subscription } = useDemoSubscription(learnerEmail, "LEARNER");
  const learnerAccess = getLearnerPlanAccess(subscription.planName);

  useEffect(() => {
    function loadLocalState() {
      const stored = window.localStorage.getItem(purchasedStorageKey);

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setPurchasedIds(parsed.filter((value) => typeof value === "string"));
          }
        } catch {
          window.localStorage.removeItem(purchasedStorageKey);
        }
      }

      setLocalAICourses(readLocalAICourses());
    }

    const frame = window.requestAnimationFrame(loadLocalState);
    window.addEventListener("storage", loadLocalState);
    window.addEventListener("skillpilot-local-ai-courses-updated", loadLocalState);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", loadLocalState);
      window.removeEventListener("skillpilot-local-ai-courses-updated", loadLocalState);
    };
  }, []);

  const selectedPurchased = useMemo(() => (selected ? purchasedIds.includes(selected.id) || selected.enrolled : false), [purchasedIds, selected]);
  const previewPurchased = useMemo(() => (preview ? purchasedIds.includes(preview.id) || preview.enrolled : false), [purchasedIds, preview]);
  const allCourses = useMemo(() => {
    const local: PurchasableCourse[] = localAICourses.map((course) => {
      const discountAmount = course.discountActive && course.discountPercent ? Math.round(course.price * Math.min(100, Math.max(0, course.discountPercent)) / 100) : 0;
      return {
        id: course.id,
        title: course.title,
        description: course.description,
        trainerName: course.trainerName,
        trainerEmail: course.trainerEmail,
        category: course.category,
        level: course.level,
        duration: course.duration,
        rating: "4.8",
        topic: course.category,
        originalAmount: course.price,
        discountLabel: course.discountLabel ?? "AI Draft Deal",
        discountAmount,
        finalAmount: Math.max(0, course.price - discountAmount),
        enrolled: false
      };
    });

    const seen = new Set(courses.map((course) => course.id));
    return [...local.filter((course) => !seen.has(course.id)), ...courses];
  }, [courses, localAICourses]);

  function openCheckout(course: PurchasableCourse) {
    setPreview(null);
    setSelected(course);
    setMethod(paymentMethods[0]);
    setMockDetails("");
    setMessage("");
  }

  function closeCheckout() {
    if (!loading) {
      setSelected(null);
      setMessage("");
    }
  }

  async function confirmPurchase() {
    if (!selected) {
      return;
    }

    setLoading(true);
    setMessage("");

    const limitMessage = learnerEnrollmentLimitMessage(subscription.planName, learnerAccess.courseLimit, learnerEmail);
    if (limitMessage) {
      setLoading(false);
      setMessage(limitMessage);
      return;
    }

    if (!mockDetails.trim()) {
      setLoading(false);
      setMessage("Add the requested mock payment details before confirming.");
      return;
    }

    if (selected.id.startsWith("stock-course-") || selected.id.startsWith("ai-local-")) {
      const receiptId = createLocalReceipt(selected, method);
      persistPurchase(selected.id);
      incrementCourseUsage(learnerEmail);
      createLocalNotification(selected);
      setLoading(false);
      setMessage("Receipt sent to your email.");
      window.setTimeout(() => router.push(`/learner/receipt/${receiptId}`), 650);
      return;
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: selected.id, paymentMethod: method })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      if (data?.alreadyEnrolled) {
        persistPurchase(selected.id);
        setMessage("You already have access to this course. No duplicate payment was created.");
        router.refresh();
        return;
      }

      setMessage(data?.message ?? "Pilot Pete hit some turbulence. Please try again.");
      return;
    }

    persistPurchase(selected.id);
    incrementCourseUsage(learnerEmail);
    const receiptId = createLocalReceipt(selected, method, data?.receiptNumber);
    setMessage("Receipt sent to your email.");
    router.refresh();
    window.setTimeout(() => router.push(`/learner/receipt/${receiptId}`), 650);
  }

  function persistPurchase(courseId: string) {
    setPurchasedIds((current) => {
      const next = Array.from(new Set([...current, courseId]));
      window.localStorage.setItem(purchasedStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function createLocalReceipt(course: PurchasableCourse, paymentMethod: string, receiptNumber = `SP-DEMO-${Date.now().toString(36).toUpperCase()}`) {
    const receiptId = `${receiptNumber}-${course.id}`;
    const receipt = {
      id: receiptId,
      receiptNumber,
      learnerName,
      learnerEmail,
      courseId: course.id,
      courseTitle: course.title,
      trainerName: course.trainerName,
      trainerLogoUrl: getDisplayLogo(findStoredProfileBranding(course.trainerEmail ?? course.trainerName)),
      originalAmount: course.originalAmount,
      discountLabel: course.discountLabel,
      discountAmount: course.discountAmount,
      amount: course.finalAmount,
      paymentMethod,
      status: "PAID",
      createdAt: new Date().toISOString()
    };
    const current = JSON.parse(window.localStorage.getItem(receiptStorageKey) ?? "{}") as Record<string, unknown>;
    window.localStorage.setItem(receiptStorageKey, JSON.stringify({ ...current, [receiptId]: receipt }));
    return receiptId;
  }

  function createLocalNotification(course: PurchasableCourse) {
    const key = "skillpilot_learner_notifications";
    const notification = {
      id: `local-enrollment-${course.id}-${Date.now()}`,
      title: "Enrollment confirmed",
      message: `You are enrolled in ${course.title}. Your mock receipt was sent to ${learnerEmail}.`,
      type: "ENROLLMENT",
      isRead: false,
      createdAt: new Date().toISOString(),
      actionHref: `/learner/course-player/${course.id}`
    };
    try {
      const current = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
      window.localStorage.setItem(key, JSON.stringify([notification, ...(Array.isArray(current) ? current : [])]));
      window.dispatchEvent(new Event("skillpilot-notifications-updated"));
    } catch {
      window.localStorage.setItem(key, JSON.stringify([notification]));
    }
  }

  if (!allCourses.length) {
    return <p className="rounded-xl border border-ink/10 bg-white p-5 text-sm text-ink/60">{emptyText}</p>;
  }

  return (
    <>
      <div className={cn("grid gap-4", compact ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3")}>
        {allCourses.map((course) => {
          const purchased = course.enrolled || purchasedIds.includes(course.id);

          return (
            <article
              key={course.id}
              className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-within:ring-4 focus-within:ring-blue-100 motion-reduce:hover:translate-y-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge className="bg-blue-50 text-blue-700">{course.category}</Badge>
                  <h3 className="mt-3 text-lg font-bold text-ink">{course.title}</h3>
                  <p className="mt-1 text-sm text-ink/55">{course.trainerName}</p>
                </div>
                <div className="text-right">
                  {course.discountAmount > 0 ? (
                    <p className="text-xs font-bold text-slate-400 line-through">{formatCurrency(course.originalAmount)}</p>
                  ) : null}
                  <p className="rounded-full bg-limewash px-3 py-1 text-sm font-black text-moss">{formatCurrency(course.finalAmount)}</p>
                  {course.discountAmount > 0 ? <p className="mt-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{course.discountLabel}</p> : null}
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/65">{course.description}</p>
              {course.recommendationReason ? (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Why it matches</p>
                  <p className="mt-2 text-sm leading-6 text-blue-900">{course.recommendationReason}</p>
                  {course.skillsGained?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {course.skillsGained.map((skill) => (
                        <span key={skill} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">{skill}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">{course.level}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{course.duration}</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{course.rating} rating</span>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="secondary" onClick={() => setPreview(course)}>
                  Preview
                </Button>
                {purchased ? (
                  <Button asChild>
                    <Link href={`/learner/course-player/${course.id}`}>Start Course</Link>
                  </Button>
                ) : (
                  <Button type="button" onClick={() => openCheckout(course)}>
                    Buy
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {preview ? (
        <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-slate-950/55 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="course-preview-title">
          <section className="w-full max-w-3xl overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-2xl">
            <div className="bg-[linear-gradient(135deg,#1d4ed8,#7c3aed_55%,#f8fafc)] p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-50">Course preview</p>
                  <h2 id="course-preview-title" className="mt-3 text-3xl font-black">{preview.title}</h2>
                  <p className="mt-2 text-sm font-semibold text-blue-50/85">{preview.trainerName}</p>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                  onClick={() => setPreview(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.38fr]">
              <div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{preview.category}</span>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">{preview.level}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{preview.duration}</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{preview.rating} rating</span>
                </div>
                <p className="mt-5 text-sm leading-7 text-ink/70">{preview.description}</p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-ink/10 bg-cloud p-4">
                    <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink/55">Topic</dt>
                    <dd className="mt-2 font-bold text-ink">{preview.topic ?? preview.category}</dd>
                  </div>
                  <div className="rounded-2xl border border-ink/10 bg-cloud p-4">
                    <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink/55">Access</dt>
                    <dd className="mt-2 font-bold text-ink">{previewPurchased ? "Enrolled" : "Available to buy"}</dd>
                  </div>
                </dl>
              </div>

              <aside className="rounded-2xl border border-ink/10 bg-cloud p-5">
                <p className="text-sm font-semibold text-ink/55">Price</p>
                <p className="mt-2 text-4xl font-black text-ink">{formatCurrency(preview.finalAmount)}</p>
                {preview.discountAmount > 0 ? (
                  <div className="mt-2 grid gap-1">
                    <p className="text-sm font-semibold text-ink/45 line-through">{formatCurrency(preview.originalAmount)}</p>
                    <p className="text-sm font-semibold text-emerald-700">{preview.discountLabel}: save {formatCurrency(preview.discountAmount)}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-ink/60">No hidden fees in this demo checkout.</p>
                )}
                <div className="mt-5 grid gap-3">
                  {previewPurchased ? (
                    <Button asChild>
                      <Link href={`/learner/course-player/${preview.id}`}>Start Course</Link>
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => openCheckout(preview)}>
                      Enroll / Buy
                    </Button>
                  )}
                  <Button type="button" variant="secondary" onClick={() => setPreview(null)}>
                    Back to catalog
                  </Button>
                </div>
              </aside>
            </div>
          </section>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-40 flex items-stretch justify-end" role="dialog" aria-modal="true" aria-labelledby="learner-checkout-title">
          <button className="absolute inset-0 bg-slate-950/45" type="button" aria-label="Close checkout" onClick={closeCheckout} />
          <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">AI Payment Agent</p>
                <h2 id="learner-checkout-title" className="mt-2 text-2xl font-bold text-ink">
                  Confirm course purchase
                </h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ink transition hover:bg-cloud focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                onClick={closeCheckout}
              >
                Close
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">SkillPilot&apos;s AI Payment Agent is ready to process this securely.</p>
              <p className="mt-2 text-sm leading-6 text-blue-800">This prototype uses a local mock payment. No card number is collected or stored.</p>
            </div>

            <section className="mt-5 rounded-2xl border border-ink/10 p-4">
              <h3 className="font-bold text-ink">{selected.title}</h3>
              <p className="mt-1 text-sm text-ink/55">{selected.trainerName}</p>
              <dl className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/55">Original price</dt>
                  <dd className="font-semibold text-ink">{formatCurrency(selected.originalAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/55">{selected.discountLabel}</dt>
                  <dd className="font-semibold text-emerald-700">-{formatCurrency(selected.discountAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-ink/10 pt-3 text-base">
                  <dt className="font-bold text-ink">Final amount</dt>
                  <dd className="font-black text-blue-700">{formatCurrency(selected.finalAmount)}</dd>
                </div>
              </dl>
            </section>

            <label className="mt-5 grid gap-2 text-sm font-semibold text-ink">
              Payment method
              <select
                className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                disabled={selectedPurchased}
              >
                {paymentMethods.map((paymentMethod) => (
                  <option key={paymentMethod} value={paymentMethod}>{paymentMethod}</option>
                ))}
              </select>
            </label>

            <label className="mt-5 grid gap-2 text-sm font-semibold text-ink">
              Mock payment details
              <input
                className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                value={mockDetails}
                onChange={(event) => setMockDetails(event.target.value)}
                placeholder={method === "Debit / Credit Card" ? "Mock card holder name" : method === "E-Wallet" ? "Mock wallet ID" : "Mock banking reference"}
                disabled={selectedPurchased}
              />
            </label>

            {message ? (
              <p className={cn("mt-4 rounded-lg px-3 py-2 text-sm font-semibold", selectedPurchased ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")} aria-live="polite">
                {message}
              </p>
            ) : null}

            <div className="mt-auto grid gap-3 pt-6">
              {selectedPurchased ? (
                <Button asChild>
                  <Link href="/learner/courses">Go to My Courses</Link>
                </Button>
              ) : (
                <Button type="button" onClick={confirmPurchase} disabled={loading}>
                  {loading ? "Processing securely..." : "Confirm mock payment"}
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={closeCheckout} disabled={loading}>
                Cancel
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function learnerEnrollmentLimitMessage(planName: string, limit: number, learnerEmail: string) {
  if (!Number.isFinite(limit) || limit > 999) {
    return "";
  }

  if (limit <= 0) {
    const upgrade = getPlansForRole("LEARNER").find((plan) => plan.name === "Starter Learner");
    return `Course enrollment is locked on ${planName}. Upgrade to ${upgrade?.name ?? "Starter Learner"} at ${formatSubscriptionPrice(upgrade?.price ?? 19)} to enroll in courses.`;
  }

  const usage = readLearnerUsage(learnerEmail);
  if (usage.courseEnrollments >= limit) {
    const upgrade = getPlansForRole("LEARNER").find((plan) => plan.name === "Pro Learner");
    return `You have used ${usage.courseEnrollments}/${limit} course enrollments this month on ${planName}. Upgrade to ${upgrade?.name ?? "Pro Learner"} at ${formatSubscriptionPrice(upgrade?.price ?? 49)} for unlimited access.`;
  }

  return "";
}

function incrementCourseUsage(learnerEmail: string) {
  const usage = readLearnerUsage(learnerEmail);
  writeLearnerUsage(learnerEmail, {
    ...usage,
    courseEnrollments: usage.courseEnrollments + 1
  });
}
