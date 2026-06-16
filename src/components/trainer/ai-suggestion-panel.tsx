"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AISuggestionPanel({
  title,
  description,
  endpoint,
  payload,
  storageKey
}: {
  title: string;
  description: string;
  endpoint: string;
  payload: Record<string, unknown>;
  storageKey: string;
}) {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function generate() {
    setLoading(true);
    setMessage(null);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot AI could not generate suggestions." });
      return;
    }

    const generated = (data?.social ?? data?.automation ?? data) as Record<string, unknown>;
    setResult(generated);
    window.localStorage.setItem(storageKey, JSON.stringify(generated));
    setMessage({ type: "success", text: "Groq suggestions generated and saved locally for this demo." });
  }

  async function copyResult() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(formatResult(result));
    setMessage({ type: "success", text: "Copied AI suggestions to clipboard." });
  }

  return (
    <section className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Groq AI assistant</p>
          <h2 className="mt-2 text-xl font-bold text-ink">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {result ? (
            <Button type="button" variant="secondary" onClick={copyResult}>
              Copy
            </Button>
          ) : null}
          <Button type="button" onClick={generate} disabled={loading}>
            {loading ? "Generating..." : "Generate suggestions"}
          </Button>
        </div>
      </div>
      {message ? (
        <p className={message.type === "success" ? "mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700" : "mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"} aria-live="polite">
          {message.text}
        </p>
      ) : null}
      {result ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(result).map(([key, value]) => (
            <div key={key} className="rounded-lg border border-blue-100 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{humanize(key)}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/70">{formatValue(value)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function formatResult(value: Record<string, unknown>) {
  return Object.entries(value)
    .map(([key, item]) => `${humanize(key)}\n${formatValue(item)}`)
    .join("\n\n");
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => `- ${String(item)}`).join("\n");
  }

  return String(value ?? "");
}

function humanize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
