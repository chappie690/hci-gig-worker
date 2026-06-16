"use client";

import Link from "next/link";
import { useState } from "react";

type Suggestion = {
  title: string;
  reason: string;
  href: string;
};

export function GlobalSearch({ role }: { role?: string }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    setMessage("");
    const response = await fetch("/api/ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, role })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage(data?.message ?? "Search hit some turbulence. Try again.");
      setSuggestions([]);
      setOpen(true);
      return;
    }

    setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    setOpen(true);
  }

  return (
    <div className="relative w-full min-w-0 max-w-sm">
      <form className="relative" onSubmit={submit}>
        <label className="sr-only" htmlFor="skillpilot-global-search">Search SkillPilot pages</label>
        <input
          id="skillpilot-global-search"
          className="min-h-11 w-full rounded-xl border border-ink/10 bg-white px-4 pr-20 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => suggestions.length || message ? setOpen(true) : undefined}
          placeholder="Search payments, courses, marketing..."
        />
        <button className="absolute right-1.5 top-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" type="submit">
          {loading ? "..." : "Search"}
        </button>
      </form>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 max-h-96 w-full overflow-y-auto rounded-2xl border border-ink/10 bg-white p-2 shadow-2xl">
          {message ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p> : null}
          {suggestions.length ? (
            <div className="grid gap-1">
              {suggestions.map((item) => (
                <Link
                  key={`${item.href}-${item.title}`}
                  className="rounded-xl px-3 py-2 text-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  <span className="font-bold text-ink">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-ink/60">{item.reason}</span>
                </Link>
              ))}
            </div>
          ) : !message && !loading ? (
            <p className="rounded-lg bg-cloud px-3 py-2 text-sm text-ink/60">No suggestions yet. Try “payment”, “courses”, “calendar”, or “AI branding”.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
