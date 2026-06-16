"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StockCourse } from "@/lib/stock-courses";

export function LocalEnrolledCourses({ stockCourses }: { stockCourses: StockCourse[] }) {
  const [ids, setIds] = useState<string[]>([]);
  const [passedIds, setPassedIds] = useState<string[]>([]);

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
      {courses.map((course) => (
        <article key={course.id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0">
          <Badge className="bg-blue-50 text-blue-700">stock enrolled</Badge>
          <h3 className="mt-3 text-xl font-bold text-ink">{course.title}</h3>
          <p className="mt-1 text-sm text-ink/55">{course.trainerName}</p>
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-ink/65">{course.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">{course.level}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{course.duration}</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{course.rating} rating</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {passedIds.includes(course.id) ? (
              <Button asChild variant="secondary">
                <Link href={`/learner/certificate/${course.id}`}>View Certificate</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={`/learner/course-player/${course.id}`}>Start / Do Course</Link>
            </Button>
          </div>
        </article>
      ))}
    </>
  );
}
