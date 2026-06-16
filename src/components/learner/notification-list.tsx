"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
};

export function NotificationList({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [items, setItems] = useState(notifications);

  async function markAsRead(id: string) {
    setLoadingId(id);
    const response = await fetch(`/api/learner/notifications/${id}/read`, { method: "PATCH" });
    setLoadingId(null);

    if (response.ok) {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
      router.refresh();
    }
  }

  if (!items.length) {
    return <p className="rounded-lg border border-ink/10 p-4 text-sm text-ink/60">No notifications yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {items.map((notification) => (
        <div key={notification.id} className="rounded-lg border border-ink/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{notification.title}</p>
                <Badge className={notification.isRead ? "bg-cloud text-ink/60" : undefined}>{notification.isRead ? "read" : "unread"}</Badge>
              </div>
              <p className="mt-2 text-sm text-ink/65">{notification.message}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-moss">{notification.type}</p>
            </div>
            {!notification.isRead ? (
              <Button type="button" variant="secondary" onClick={() => markAsRead(notification.id)} disabled={loadingId === notification.id}>
                {loadingId === notification.id ? "Saving..." : "Mark read"}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
