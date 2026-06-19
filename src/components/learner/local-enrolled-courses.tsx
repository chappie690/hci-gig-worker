"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StockCourse } from "@/lib/stock-courses";

export function LocalEnrolledCourses({ stockCourses }: { stockCourses: StockCourse[] }) {
  const [ids, setIds] = useState<string[]>([]);
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = JSON.parse(window.localStorage.getItem("skillpilot-demo-purchased-course-ids") ?? "[]") as string[];
      setIds(stored.filter((id) => id.startsWith("stock-course-")));
      try {
        const scores = JSON.parse(window.localStorage.getItem("skillpilot-course-quiz-scores") ?? "{}") as Record<string, { score: number }>;
        setPassedIds(Object.entries(scores).filter(([, result]) => result.score >= 8).map(([id]) => id));
      } catch {
        setPassedIds([]);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const courses = stockCourses.filter((course) => ids.includes(course.id));

  if (!courses.length) {
    return null;
  }

  return (
    <>
      {message ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200 lg:col-span-2" aria-live="polite">
          {message}
        </div>
      ) : null}
      {courses.map((course) => (
        <article key={course.id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0 dark:border-slate-700 dark:bg-slate-900">
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">stock enrolled</Badge>
          <h3 className="mt-3 text-xl font-bold text-ink dark:text-slate-100">{course.title}</h3>
          <p className="mt-1 text-sm text-ink/55 dark:text-slate-400">{course.trainerName}</p>
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-ink/65 dark:text-slate-300">{course.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700 dark:bg-purple-950/60 dark:text-purple-200">{course.level}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{course.duration}</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200">{course.rating} rating</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {passedIds.includes(course.id) ? (
              <Button asChild variant="secondary">
                <Link href={`/learner/certificate/${course.id}`}>View Certificate</Link>
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => setConfirmId(course.id)}>
              Unenroll
            </Button>
            <Button asChild>
              <Link href={`/learner/course-player/${course.id}`}>Start / Do Course</Link>
            </Button>
          </div>
        </article>
      ))}

      {confirmId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4" role="dialog" aria-modal="true" aria-labelledby="stock-unenroll-title">
          <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <h2 id="stock-unenroll-title" className="text-xl font-black text-slate-900 dark:text-slate-100">Unenroll from stock course?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This removes only your local demo enrollment. The course remains available in Discover.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setConfirmId(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => unenrollLocal(confirmId)}>
                Confirm Unenroll
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );

  function unenrollLocal(courseId: string) {
    const next = ids.filter((id) => id !== courseId);
    window.localStorage.setItem("skillpilot-demo-purchased-course-ids", JSON.stringify(next));
    setIds(next);
    setConfirmId(null);
    setMessage("You unenrolled from the local demo course.");
  }
}
