"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MarketingContentItem = {
  id: string;
  platform: string;
  generatedText: string;
  scheduledAt: string | null;
  status: string;
  type: string;
  createdAt: string;
  course: { title: string } | null;
};

export function SocialAutomationManager({ initialContent }: { initialContent: MarketingContentItem[] }) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [scheduleItem, setScheduleItem] = useState<MarketingContentItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MarketingContentItem | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function openSchedule(item: MarketingContentItem) {
    setScheduleItem(item);
    setScheduledAt(toDatetimeLocal(item.scheduledAt) || defaultScheduleTime());
    setMessage(null);
  }

  async function runAction(item: MarketingContentItem, action: "SCHEDULE" | "POST" | "CANCEL", dateValue?: string) {
    setLoading(`${action}-${item.id}`);
    setMessage(null);

    const response = await fetch(`/api/trainer/social-automation/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        scheduledAt: dateValue ?? null
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to update automation." });
      return;
    }

    setContent((current) => current.map((currentItem) => (currentItem.id === item.id ? data.content : currentItem)));
    setScheduleItem(null);
    setMessage({ type: "success", text: data?.message ?? "Automation updated." });
    router.refresh();

    if (action === "POST") {
      const postId = `db-social-${item.id}-${Date.now()}`;
      const stored = JSON.parse(window.localStorage.getItem("skillpilot-demo-social-posts") ?? "[]") as unknown[];
      window.localStorage.setItem("skillpilot-demo-social-posts", JSON.stringify([
        {
          id: postId,
          platform: item.platform,
          trainerName: "SkillPilot Trainer",
          courseTitle: item.course?.title ?? "Brand content",
          caption: item.generatedText,
          hashtags: [],
          cta: "Preview the course.",
          status: "POSTED",
          scheduledAt: null,
          createdAt: new Date().toISOString()
        },
        ...stored
      ]));
      router.push(`/trainer/social-automation/mock-post/${postId}`);
    }
  }

  async function confirmDelete() {
    if (!deleteItem) {
      return;
    }

    setLoading(`DELETE-${deleteItem.id}`);
    setMessage(null);
    const response = await fetch(`/api/trainer/social-automation/${deleteItem.id}`, {
      method: "DELETE"
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to delete marketing content." });
      return;
    }

    setContent((current) => current.filter((item) => item.id !== deleteItem.id));
    setDeleteItem(null);
    setMessage({ type: "success", text: data?.message ?? "Marketing content deleted." });
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      {message ? (
        <div className={message.type === "success" ? "rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" : "rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"}>
          {message.text}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-ink/10 bg-white">
        <div className="hidden grid-cols-[0.85fr_1.35fr_0.6fr_0.55fr_0.95fr] gap-4 border-b border-ink/10 bg-cloud px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-ink/55 xl:grid">
          <p>Content</p>
          <p>Generated text</p>
          <p>Scheduled</p>
          <p>Status</p>
          <p>Actions</p>
        </div>

        <div className="divide-y divide-ink/10">
          {content.map((item) => (
            <article key={item.id} className="grid gap-4 p-5 xl:grid-cols-[0.85fr_1.35fr_0.6fr_0.55fr_0.95fr] xl:items-start">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{item.platform.toLowerCase()}</Badge>
                  <Badge className="bg-cloud text-ink/70">{item.type.toLowerCase()}</Badge>
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{item.course?.title ?? "Brand content"}</p>
                <p className="mt-1 text-xs text-ink/50">Created {formatDate(item.createdAt)}</p>
              </div>

              <p className="max-h-32 overflow-auto text-sm leading-6 text-ink/70">{item.generatedText}</p>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45 xl:hidden">Scheduled</p>
                <p className="mt-1 text-sm font-semibold text-ink">{item.scheduledAt ? formatDate(item.scheduledAt) : "Not scheduled"}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45 xl:hidden">Status</p>
                <Badge className={statusClass(item.status)}>{item.status.toLowerCase()}</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => openSchedule(item)} disabled={loading !== null || item.status === "POSTED"}>
                  Schedule
                </Button>
                <Button type="button" variant="secondary" onClick={() => runAction(item, "POST")} disabled={loading !== null || item.status === "POSTED"}>
                  {loading === `POST-${item.id}` ? "Posting..." : "Post Now"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => runAction(item, "CANCEL")} disabled={loading !== null || item.status !== "SCHEDULED"}>
                  {loading === `CANCEL-${item.id}` ? "Cancelling..." : "Cancel"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setDeleteItem(item)} disabled={loading !== null}>
                  Delete
                </Button>
              </div>
            </article>
          ))}

          {content.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-ink">No marketing content yet.</p>
              <p className="mt-2 text-sm text-ink/60">Generate content in AI Marketing or AI Branding to start your social automation queue.</p>
            </div>
          ) : null}
        </div>
      </section>

      {scheduleItem ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold text-ink">Schedule social post</h2>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              Choose when SkillPilot AI should simulate this {scheduleItem.platform.toLowerCase()} post. Scheduling creates a SOCIAL_POST automation task.
            </p>
            <label className="mt-5 grid gap-2 text-sm font-medium text-ink">
              <span>Scheduled date and time</span>
              <input
                className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                required
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setScheduleItem(null)}>
                Close
              </Button>
              <Button type="button" onClick={() => runAction(scheduleItem, "SCHEDULE", scheduledAt)} disabled={loading === `SCHEDULE-${scheduleItem.id}`}>
                {loading === `SCHEDULE-${scheduleItem.id}` ? "Scheduling..." : "Schedule post"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteItem ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold text-ink">Delete marketing content?</h2>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              This removes the selected content record from the automation queue. Existing automation task history is kept for audit context.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setDeleteItem(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmDelete} disabled={loading === `DELETE-${deleteItem.id}`}>
                {loading === `DELETE-${deleteItem.id}` ? "Deleting..." : "Delete content"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function statusClass(status: string) {
  if (status === "POSTED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "SCHEDULED") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-cloud text-ink/70";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function toDatetimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function defaultScheduleTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setMinutes(0, 0, 0);

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
