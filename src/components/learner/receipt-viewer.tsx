"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { formatCurrency } from "@/lib/format";

type Receipt = {
  receiptNumber: string;
  learnerName: string;
  learnerEmail: string;
  courseId: string;
  courseTitle: string;
  trainerName: string;
  trainerLogoUrl?: string;
  originalAmount?: number;
  discountLabel?: string;
  discountAmount?: number;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
};

export function ReceiptViewer({ receiptId }: { receiptId: string }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = JSON.parse(window.localStorage.getItem("skillpilot-demo-receipts") ?? "{}") as Record<string, Receipt>;
      setReceipt(stored[receiptId] ?? null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [receiptId]);

  if (!receipt) {
    return (
      <section className="rounded-3xl border border-ink/10 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-black text-ink">Receipt not found</h2>
        <p className="mt-2 text-sm text-ink/60">This mock receipt may belong to another browser session.</p>
        <Button asChild className="mt-5">
          <Link href="/learner/discover">Back to catalog</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-ink/10 bg-white p-8 shadow-xl">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Receipt sent to your email</p>
      <h2 className="mt-3 text-3xl font-black text-ink">Payment confirmed</h2>
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-ink/10 bg-cloud p-4">
        <ProfileLogo
          user={{ fullName: receipt.trainerName, email: "" }}
          logoUrl={receipt.trainerLogoUrl}
          className="h-14 w-14"
          label={`${receipt.trainerName} course provider logo`}
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">Course provider</p>
          <p className="font-black text-ink">{receipt.trainerName}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 rounded-2xl bg-cloud p-5 text-sm">
        <Row label="Receipt number" value={receipt.receiptNumber} />
        <Row label="Learner" value={`${receipt.learnerName} (${receipt.learnerEmail})`} />
        <Row label="Course" value={receipt.courseTitle} />
        <Row label="Trainer" value={receipt.trainerName} />
        <Row label="Original price" value={formatCurrency(receipt.originalAmount ?? receipt.amount)} />
        <Row label={receipt.discountLabel ?? "Discount"} value={`-${formatCurrency(receipt.discountAmount ?? 0)}`} />
        <Row label="Final paid price" value={formatCurrency(receipt.amount)} />
        <Row label="Method" value={receipt.paymentMethod} />
        <Row label="Date/time" value={new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(receipt.createdAt))} />
        <Row label="Status" value={receipt.status.toLowerCase()} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/learner/course-player/${receipt.courseId}`}>Start course</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/learner/courses">Go to My Courses</Link>
        </Button>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-b border-ink/10 pb-2 last:border-b-0 last:pb-0">
      <span className="font-semibold text-ink/55">{label}</span>
      <span className="font-bold text-ink">{value}</span>
    </div>
  );
}
