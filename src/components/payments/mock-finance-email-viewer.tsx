"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MockFinanceEmail = {
  id: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  recipientType: "learner" | "admin" | "none";
  subject: string;
  body: string;
  issueSummary: string;
  actionTaken: string;
  nextStep: string;
  riskLevel: "low" | "medium" | "high";
  outcome: string;
  createdAt: string;
  note: string;
};

export function MockFinanceEmailViewer({ emailId }: { emailId: string }) {
  const [email, setEmail] = useState<MockFinanceEmail | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const sessionRecord = window.sessionStorage.getItem(`skillpilot_mock_finance_email_${emailId}`);
      if (sessionRecord) {
        setEmail(JSON.parse(sessionRecord) as MockFinanceEmail);
        return;
      }

      const history = JSON.parse(window.localStorage.getItem("skillpilot_mock_finance_emails") ?? "[]") as MockFinanceEmail[];
      setEmail(Array.isArray(history) ? history.find((item) => item.id === emailId) ?? null : null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [emailId]);

  if (!email) {
    return (
      <section className="rounded-3xl border border-ink/10 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Mock finance email</p>
        <h2 className="mt-3 text-2xl font-black text-ink dark:text-slate-100">Email not found</h2>
        <p className="mt-2 text-sm text-ink/60 dark:text-slate-300">This mock email may belong to another browser session.</p>
        <Button asChild className="mt-5">
          <Link href="/trainer/payment-agent">Back to Payment Agent</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-ink/10 bg-[linear-gradient(135deg,#eff6ff,#ffffff_55%,#f5f3ff)] p-6 dark:border-slate-700 dark:bg-none dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Email sent successfully</p>
            <h2 className="mt-3 text-3xl font-black text-ink dark:text-slate-100">{email.subject}</h2>
            <p className="mt-2 text-sm text-ink/60 dark:text-slate-300">{email.note}</p>
          </div>
          <Badge>{email.recipientType === "admin" ? "Admin report" : "Learner email"}</Badge>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[0.42fr_0.58fr]">
        <aside className="grid gap-3 rounded-2xl border border-ink/10 bg-cloud p-5 text-sm dark:border-slate-700 dark:bg-slate-950">
          <Row label="From" value={`${email.senderName} (${email.senderEmail})`} />
          <Row label="To" value={`${email.recipientName} (${email.recipientEmail})`} />
          <Row label="Risk level" value={email.riskLevel} />
          <Row label="Outcome" value={email.outcome.replace("_", " ")} />
          <Row label="Timestamp" value={new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(email.createdAt))} />
        </aside>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-ink/10 bg-cloud p-5 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-moss">Issue summary</p>
            <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-slate-300">{email.issueSummary}</p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-moss">Email body</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink/75 dark:text-slate-200">{email.body}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="Action taken" value={email.actionTaken} />
            <InfoCard label="Next step" value={email.nextStep} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-ink/10 p-6 dark:border-slate-700">
        <Button asChild>
          <Link href="/trainer/payment-agent">Back to Payment Agent</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/trainer/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-ink/10 pb-3 last:border-b-0 last:pb-0 dark:border-slate-700">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-ink dark:text-slate-100">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-moss">{label}</p>
      <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-slate-300">{value}</p>
    </div>
  );
}
