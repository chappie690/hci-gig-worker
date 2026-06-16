"use client";

import { useEffect, useState } from "react";

type DemoReview = {
  id: string;
  courseId: string;
  courseTitle: string;
  trainerName: string;
  learnerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

const reviewKey = "skillpilot-demo-reviews";

export function DemoReviewsPanel() {
  const [reviews, setReviews] = useState<DemoReview[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(reviewKey) ?? "[]");
        setReviews(Array.isArray(parsed) ? parsed : []);
      } catch {
        setReviews([]);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="mt-8 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Learner reviews</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Recent course feedback</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
            Demo reviews submitted by learners are stored in this browser so your coursework prototype can show the full feedback journey.
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{reviews.length} saved</span>
      </div>

      <div className="mt-5 grid gap-4">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-ink/10 bg-cloud p-4 transition hover:-translate-y-0.5 hover:shadow-soft motion-reduce:hover:translate-y-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-ink">{review.courseTitle}</h3>
                <p className="mt-1 text-sm text-ink/60">By {review.learnerName}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700" aria-label={`${review.rating} out of 5 stars`}>
                {review.rating}/5 stars
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/70">{review.comment}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
              {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(review.createdAt))}
            </p>
          </article>
        ))}

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 bg-cloud p-8 text-center">
            <p className="text-sm font-bold text-ink">No learner reviews yet.</p>
            <p className="mt-2 text-sm text-ink/60">Complete an enrolled course as a learner and submit a review to see it here.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
