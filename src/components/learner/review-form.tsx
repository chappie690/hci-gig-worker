"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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

export function ReviewForm({
  courseId,
  courseTitle,
  trainerName,
  learnerName
}: {
  courseId: string;
  courseTitle: string;
  trainerName: string;
  learnerName: string;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [savedReview, setSavedReview] = useState<DemoReview | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const reviews = readReviews();
      const existing = reviews.find((review) => review.courseId === courseId && review.learnerName === learnerName);
      setSavedReview(existing ?? null);
      setComment(existing?.comment ?? "");
      setRating(existing?.rating ?? 5);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [courseId, learnerName]);

  function saveReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (comment.trim().length < 12) {
      setMessage("Add a little more detail so the trainer can learn from your feedback.");
      return;
    }

    const reviews = readReviews();
    const nextReview: DemoReview = {
      id: savedReview?.id ?? `review-${Date.now()}`,
      courseId,
      courseTitle,
      trainerName,
      learnerName,
      rating,
      comment: comment.trim(),
      createdAt: savedReview?.createdAt ?? new Date().toISOString()
    };
    const nextReviews = [nextReview, ...reviews.filter((review) => review.id !== nextReview.id)];
    window.localStorage.setItem(reviewKey, JSON.stringify(nextReviews));
    setSavedReview(nextReview);
    setMessage("Review saved. Your trainer can see this in the Reviews page.");
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Course review</p>
          <h3 className="mt-2 text-2xl font-black text-ink">Share feedback with your trainer</h3>
        </div>
        {savedReview ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">saved</span>
        ) : null}
      </div>

      <form className="mt-5 grid gap-4" onSubmit={saveReview}>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Rating
          <select
            className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
          >
            <option value={5}>5 stars - excellent</option>
            <option value={4}>4 stars - strong</option>
            <option value={3}>3 stars - helpful</option>
            <option value={2}>2 stars - needs work</option>
            <option value={1}>1 star - difficult to follow</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Comment
          <textarea
            className="min-h-28 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What helped you most? What should the trainer improve next?"
          />
        </label>
        {message ? <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{message}</p> : null}
        <Button className="w-fit" type="submit">
          {savedReview ? "Update review" : "Save review"}
        </Button>
      </form>
    </section>
  );
}

function readReviews(): DemoReview[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(reviewKey) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
