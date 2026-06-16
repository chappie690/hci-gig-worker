"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type Payment = {
  id: string;
  description: string;
  learnerName: string;
  amount: number;
  status: string;
};

export function PaymentAgentPanel({ payments }: { payments: Payment[] }) {
  const [notes, setNotes] = useState<Record<string, string | null>>(Object.fromEntries(payments.map((payment) => [payment.id, null])));
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function askAgent(paymentId: string) {
    setLoadingId(paymentId);
    setError(null);
    const response = await fetch("/api/ai/payment-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId })
    });
    const data = await response.json().catch(() => null);
    setLoadingId(null);

    if (response.ok) {
      setNotes((current) => ({ ...current, [paymentId]: data.summary }));
      return;
    }

    setError(data?.message ?? "Pilot Pete hit some turbulence. Please try again.");
  }

  async function copyAdvice(paymentId: string) {
    const note = notes[paymentId];

    if (!note) {
      return;
    }

    await navigator.clipboard.writeText(note);
    setError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Payment Agent</CardTitle>
        <p className="text-sm text-ink/60">Detect follow-up moments and payment risk from your local data.</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
        {payments.map((payment) => (
          <div key={payment.id} data-testid={`payment-card-${payment.id}`} className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{payment.description}</p>
                <p className="text-sm text-ink/60">
                  {payment.learnerName} - {formatCurrency(payment.amount)}
                </p>
              </div>
              <Badge>{payment.status.toLowerCase()}</Badge>
            </div>
            {notes[payment.id] ? <p className="mt-3 text-sm leading-6 text-ink/70">{notes[payment.id]}</p> : null}
            <Button
              className="mt-4 min-h-10 w-full border-blue-100 bg-white text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-200"
              data-testid={`payment-agent-${payment.id}`}
              variant="secondary"
              onClick={() => askAgent(payment.id)}
              disabled={loadingId === payment.id}
            >
              {loadingId === payment.id ? "Thinking..." : "Ask payment agent"}
            </Button>
            {notes[payment.id] ? (
              <Button className="mt-2 min-h-10 w-full" type="button" variant="secondary" onClick={() => copyAdvice(payment.id)}>
                Copy advice
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
