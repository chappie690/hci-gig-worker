"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actionHref?: string;
  local?: boolean;
};

export function NotificationBell({ role }: { role?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const localKey = role === "TRAINER" ? "skillpilot_trainer_notifications" : "skillpilot_learner_notifications";

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const [remote, local] = await Promise.all([fetchRemoteNotifications(), readLocalNotifications(localKey)]);
    setItems([...local, ...remote].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLoading(false);
  }, [localKey]);

  useEffect(() => {
    const timer = window.setTimeout(loadNotifications, 0);

    function onStorage() {
      loadNotifications();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("skillpilot-notifications-updated", onStorage);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("skillpilot-notifications-updated", onStorage);
    };
  }, [loadNotifications]);

  const unread = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  async function markRead(item: NotificationItem) {
    if (item.local) {
      const next = items.map((current) => current.id === item.id ? { ...current, isRead: true } : current);
      setItems(next);
      window.localStorage.setItem(localKey, JSON.stringify(next.filter((current) => current.local)));
      window.dispatchEvent(new Event("skillpilot-notifications-updated"));
      return;
    }

    const response = await fetch(`/api/notifications/${item.id}/read`, { method: "PATCH" });
    if (response.ok) {
      setItems((current) => current.map((notification) => notification.id === item.id ? { ...notification, isRead: true } : notification));
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink/10 bg-white text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-limewash focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 motion-reduce:hover:translate-y-0"
        aria-label={`Open notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
        {unread ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-black text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <section className="absolute right-0 z-50 mt-3 w-[min(92vw,420px)] overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-2xl" aria-label="Notifications panel">
          <div className="flex items-center justify-between gap-3 border-b border-ink/10 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Notifications</p>
              <h2 className="text-lg font-black text-ink">{unread} unread</h2>
            </div>
            <button className="rounded-lg px-3 py-2 text-sm font-bold text-ink/60 transition hover:bg-cloud hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <div className="max-h-[520px] overflow-y-auto p-3">
            {loading ? <p className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">Loading notifications...</p> : null}
            {!loading && items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/20 bg-cloud p-6 text-center">
                <p className="text-sm font-bold text-ink">No notifications yet.</p>
                <p className="mt-2 text-sm text-ink/60">Enrollment and meeting updates will appear here.</p>
              </div>
            ) : null}
            <div className="grid gap-2">
              {items.map((item) => (
                <article key={item.id} className={cn("rounded-2xl border border-ink/10 p-4", item.isRead ? "bg-cloud opacity-75" : "bg-white shadow-sm")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-ink/65">{item.message}</p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-ink/45">{item.type.replace(/_/g, " ")} - {formatTime(item.createdAt)}</p>
                    </div>
                    {!item.isRead ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" aria-label="Unread" /> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!item.isRead ? (
                      <button className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink transition hover:bg-limewash focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" type="button" onClick={() => markRead(item)}>
                        Mark read
                      </button>
                    ) : null}
                    {item.actionHref ? (
                      <Link className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" href={item.actionHref} onClick={() => setOpen(false)}>
                        Open
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

async function fetchRemoteNotifications(): Promise<NotificationItem[]> {
  const response = await fetch("/api/notifications", { cache: "no-store" });
  const data = await response.json().catch(() => null);
  return Array.isArray(data?.notifications) ? data.notifications : [];
}

function readLocalNotifications(key: string): NotificationItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.map((item) => ({ ...item, local: true })) : [];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}
