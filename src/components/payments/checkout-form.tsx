"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { formatCurrency } from "@/lib/format";
import { paymentMethods } from "@/lib/payment";

type CheckoutCourse = {
  id: string;
  title: string;
  trainerName: string;
  trainerEmail: string;
  originalAmount: number;
  discountLabel: string;
  discountAmount: number;
  finalAmount: number;
};

export function CheckoutForm({ course }: { course: CheckoutCourse }) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>("Mock Card");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; dashboardUrl?: string } | null>(null);

  async function confirmPayment() {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: course.id,
        paymentMethod
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage({
        type: "error",
        text: data?.message ?? "Payment could not be completed.",
        dashboardUrl: data?.dashboardUrl
      });
      return;
    }

    setMessage({ type: "success", text: "Payment confirmed. Redirecting to your receipt..." });
    router.push(data.redirectUrl);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_0.58fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Secure mock checkout</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">{course.title}</h1>
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <ProfileLogo user={{ fullName: course.trainerName, email: course.trainerEmail }} className="h-14 w-14" label={`${course.trainerName} checkout provider logo`} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Trainer</p>
            <p className="font-black text-slate-950">{course.trainerName}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          SkillPilot AI simulates local payment processing for this HCI prototype. No real card details are requested, stored, or processed.
        </div>

        <label className="mt-6 grid gap-2 text-sm font-medium text-slate-950">
          <span>Payment method</span>
          <select
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as (typeof paymentMethods)[number])}
          >
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>

        {message ? (
          <div className={message.type === "success" ? "mt-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" : "mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"}>
            {message.text}
            {message.dashboardUrl ? (
              <Link className="ml-2 underline" href={message.dashboardUrl}>
                Go to learner dashboard
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={confirmPayment} disabled={loading}>
            {loading ? "Processing payment..." : "Confirm payment"}
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/courses/${course.id}`}>Cancel</Link>
          </Button>
        </div>
      </div>

      <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
        <h2 className="text-xl font-bold text-slate-950">Payment summary</h2>
        <div className="mt-5 grid gap-3 text-sm">
          <SummaryRow label="Original price" value={formatCurrency(course.originalAmount)} />
          <SummaryRow label={course.discountLabel} value={`-${formatCurrency(course.discountAmount)}`} muted={course.discountAmount === 0} />
          <div className="mt-2 border-t border-slate-200 pt-4">
            <SummaryRow label="Final amount" value={formatCurrency(course.finalAmount)} strong />
          </div>
        </div>
        <div className="mt-6 rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Stored payment data</p>
          <ul className="mt-3 grid gap-2 text-sm text-slate-600">
            <li>Learner ID</li>
            <li>Course ID</li>
            <li>Amount and status</li>
            <li>Receipt number</li>
            <li>Selected payment method</li>
          </ul>
        </div>
      </aside>
    </section>
  );
}

function SummaryRow({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={strong ? "flex items-center justify-between text-lg font-bold text-slate-950" : "flex items-center justify-between text-slate-600"}>
      <span className={muted ? "text-slate-400" : undefined}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
