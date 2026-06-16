"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readStoredLearnerSocialPosts, type StoredLearnerSocialPost } from "@/lib/learner-social-post-storage";

export function LearnerSocialPostsPanel() {
  const [posts, setPosts] = useState<StoredLearnerSocialPost[]>([]);

  useEffect(() => {
    function loadPosts() {
      setPosts(readStoredLearnerSocialPosts());
    }

    const frame = window.requestAnimationFrame(loadPosts);
    window.addEventListener("storage", loadPosts);
    window.addEventListener("skillpilot-learner-social-posts-updated", loadPosts);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", loadPosts);
      window.removeEventListener("skillpilot-learner-social-posts-updated", loadPosts);
    };
  }, []);

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Learner portfolio posts</p>
          <h2 className="mt-2 text-xl font-black text-ink dark:text-slate-100">Recent learner social posts</h2>
          <p className="mt-2 text-sm text-ink/60 dark:text-slate-300">Achievement and progress posts stay separate from trainer promotions.</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/learner/social-automation">Create Post</Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-3">
        {posts.slice(0, 3).map((post) => (
          <article key={post.id} className="rounded-2xl border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{post.platform}</Badge>
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">{post.status}</Badge>
              </div>
              <span className="text-xs font-semibold text-ink/45 dark:text-slate-400">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(post.publishedAt))}</span>
            </div>
            <p className="mt-3 text-sm font-black text-ink dark:text-slate-100">{post.achievementMessage}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70 dark:text-slate-300">{post.caption}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink/60 dark:text-slate-400">
              <span>{post.analytics.views.toLocaleString()} views</span>
              <span>{post.analytics.likes.toLocaleString()} likes</span>
              <span>{post.analytics.comments.toLocaleString()} comments</span>
            </div>
          </article>
        ))}

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink/60 dark:border-slate-700 dark:text-slate-300">
            No learner posts yet. Share a course milestone from Social Automation.
          </div>
        ) : null}
      </div>
    </section>
  );
}
