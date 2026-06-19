"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type LearnerCourseEnrollment = {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  course: {
    title: string;
    description: string;
    trainerName: string;
    nextSession?: string | null;
  };
};

const hiddenEnrollmentStorageKey = "skillpilot-demo-unenrolled-enrollment-ids";

export function LearnerCourseList({ enrollments }: { enrollments: LearnerCourseEnrollment[] }) {
  const router = useRouter();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [confirmItem, setConfirmItem] = useState<LearnerCourseEnrollment | null>(null);
  const [loadingId, setLoadingId] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHiddenIds(readHiddenEnrollments());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const items = useMemo(
    () => enrollments.filter((item) => !hiddenIds.includes(item.id) && !removedIds.includes(item.id)),
    [enrollments, hiddenIds, removedIds]
  );
  const hasCourses = items.length > 0;

  async function unenroll(item: LearnerCourseEnrollment) {
    setLoadingId(item.id);
    setMessage(null);
    const response = await fetch(`/api/learner/enrollments/${item.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => null);
    setLoadingId("");
    setConfirmItem(null);

    if (!response.ok) {
      hideEnrollmentLocally(item.id);
      setHiddenIds((current) => Array.from(new Set([...current, item.id])));
      createLocalNotification(item);
      setMessage({
        type: "error",
        text: data?.message ? `${data.message} Hidden locally for this demo session.` : "Database unenroll failed, so SkillPilot hid this enrollment locally for the demo."
      });
      return;
    }

    setRemovedIds((current) => Array.from(new Set([...current, item.id])));
    setMessage({ type: "success", text: data?.message ?? `You unenrolled from ${item.course.title}.` });
    window.dispatchEvent(new Event("skillpilot-notifications-updated"));
    router.refresh();
  }

  return (
    <>
      {message ? (
        <div className={message.type === "success" ? "rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200 lg:col-span-2" : "rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 lg:col-span-2"} aria-live="polite">
          {message.text}
        </div>
      ) : null}

      {hasCourses ? (
        items.map((enrollment, index) => (
          <article
            key={enrollment.id}
            className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge
                  className={
                    enrollment.status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : "dark:bg-slate-800 dark:text-slate-200"
                  }
                >
                  {enrollment.status.toLowerCase()}
                </Badge>

                <h3 className="mt-3 text-xl font-bold text-ink dark:text-slate-100">
                  {enrollment.course.title}
                </h3>

                <p className="mt-1 text-sm text-ink/55 dark:text-slate-400">
                  {enrollment.course.trainerName}
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                {nextStep(index, enrollment.progress)}
              </span>
            </div>

            <p className="mt-4 line-clamp-2 text-sm leading-6 text-ink/65 dark:text-slate-300">
              {enrollment.course.description}
            </p>

            <Progress className="mt-5 h-3" value={enrollment.progress} />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink/55 dark:text-slate-400">
                {enrollment.progress}% complete
              </p>

              <div className="flex flex-wrap gap-2">
                {enrollment.status === "COMPLETED" ? (
                  <Button asChild variant="secondary">
                    <Link href={`/learner/certificate/${enrollment.courseId}`}>
                      View Certificate
                    </Link>
                  </Button>
                ) : null}

                <Button type="button" variant="secondary" onClick={() => setConfirmItem(enrollment)}>
                  Unenroll
                </Button>

                <Button asChild>
                  <Link href={`/learner/course-player/${enrollment.courseId}`}>
                    Start / Do Course
                  </Link>
                </Button>
              </div>
            </div>

            {enrollment.course.nextSession ? (
              <p className="mt-4 rounded-lg bg-cloud px-3 py-2 text-sm text-ink/65 dark:bg-slate-800 dark:text-slate-300">
                Next live session: {formatDate(enrollment.course.nextSession)}
              </p>
            ) : null}
          </article>
        ))
      ) : (
        <div className="rounded-2xl border border-ink/10 bg-white p-8 text-center shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-xl font-bold text-ink dark:text-slate-100">
            No enrolled courses yet
          </h3>

          <p className="mt-2 text-sm text-ink/60 dark:text-slate-300">
            Browse the catalog and use the mock AI Payment Agent checkout to add your first course.
          </p>

          <Button asChild className="mt-5">
            <Link href="/learner/discover">Discover courses</Link>
          </Button>
        </div>
      )}

      {confirmItem ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4" role="dialog" aria-modal="true" aria-labelledby="unenroll-title">
          <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <h2 id="unenroll-title" className="text-xl font-black text-slate-900 dark:text-slate-100">Unenroll from course?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This removes only your enrollment in {confirmItem.course.title}. The course stays available in the public catalog.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setConfirmItem(null)} disabled={loadingId === confirmItem.id}>
                Cancel
              </Button>
              <Button type="button" onClick={() => unenroll(confirmItem)} disabled={loadingId === confirmItem.id}>
                {loadingId === confirmItem.id ? "Unenrolling..." : "Confirm Unenroll"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function readHiddenEnrollments() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(hiddenEnrollmentStorageKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    window.localStorage.removeItem(hiddenEnrollmentStorageKey);
    return [];
  }
}

function hideEnrollmentLocally(enrollmentId: string) {
  const next = Array.from(new Set([...readHiddenEnrollments(), enrollmentId]));
  window.localStorage.setItem(hiddenEnrollmentStorageKey, JSON.stringify(next));
}

function createLocalNotification(item: LearnerCourseEnrollment) {
  const key = "skillpilot_learner_notifications";
  const notification = {
    id: `local-unenroll-${item.id}-${Date.now()}`,
    title: "Course unenrolled locally",
    message: `${item.course.title} was hidden from your course list in this demo session.`,
    type: "ENROLLMENT_CANCELLED",
    isRead: false,
    createdAt: new Date().toISOString()
  };

  try {
    const current = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
    window.localStorage.setItem(key, JSON.stringify([notification, ...(Array.isArray(current) ? current : [])]));
    window.dispatchEvent(new Event("skillpilot-notifications-updated"));
  } catch {
    window.localStorage.setItem(key, JSON.stringify([notification]));
  }
}

function nextStep(index: number, progress: number) {
  if (progress >= 100) {
    return "Review mode";
  }

  return ["Next lesson: 8 mins", "15 mins left", "Quiz review: 10 mins"][
    index % 3
  ];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(date));
}
