"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { PromotionalVisualPreview } from "@/components/trainer/promotional-visual-preview";
import { getLearnerPostImageSessionKey, readStoredLearnerSocialPosts, type StoredLearnerSocialPost } from "@/lib/learner-social-post-storage";
import { type StoredSocialPost } from "@/lib/social-post-storage";

export function LearnerSocialPostsPanel() {
  const [posts, setPosts] = useState<StoredLearnerSocialPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<StoredLearnerSocialPost | null>(null);

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
          <article key={post.id} className="grid gap-4 rounded-2xl border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[0.22fr_1fr_auto] md:items-start">
            <PromotionalVisualPreview
              post={toPromotionalPost(post)}
              compact
              className="md:aspect-square"
              sessionImageKey={getLearnerPostImageSessionKey(post.id)}
            />
            <div>
              <div className="mb-3 flex items-center gap-3">
                <ProfileLogo
                  user={{ fullName: post.learnerName, email: post.learnerEmail }}
                  className="h-11 w-11"
                  label={`${post.learnerName} learner post logo`}
                />
                <div>
                  <p className="font-bold text-ink dark:text-slate-100">{post.learnerName}</p>
                  <p className="text-xs text-ink/55 dark:text-slate-400">Learner portfolio update</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{post.platform}</Badge>
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">{post.status}</Badge>
              </div>
              <p className="mt-3 text-sm font-black text-ink dark:text-slate-100">{post.achievementMessage}</p>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70 dark:text-slate-300">{post.caption}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-400">
                {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(post.publishedAt))}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink/60 dark:text-slate-400">
                <span>{post.analytics.views.toLocaleString()} views</span>
                <span>{post.analytics.likes.toLocaleString()} likes</span>
                <span>{post.analytics.comments.toLocaleString()} comments</span>
                <span>{post.analytics.shares.toLocaleString()} shares</span>
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={() => setSelectedPost(post)}>
              View full post
            </Button>
          </article>
        ))}

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink/60 dark:border-slate-700 dark:text-slate-300">
            No learner posts yet. Share a course milestone from Social Automation.
          </div>
        ) : null}
      </div>

      {selectedPost ? (
        <LearnerPostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      ) : null}
    </section>
  );
}

function LearnerPostModal({ post, onClose }: { post: StoredLearnerSocialPost; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/70 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="learner-post-title">
      <section className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-700">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-moss">Full learner post</p>
            <h2 id="learner-post-title" className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{post.achievementMessage}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatDate(post.publishedAt)}</p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1.05fr_0.95fr]">
          <PromotionalVisualPreview
            post={toPromotionalPost(post)}
            className="min-h-[360px] lg:min-h-[460px]"
            sessionImageKey={getLearnerPostImageSessionKey(post.id)}
          />
          <div className="grid content-start gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <ProfileLogo
                user={{ fullName: post.learnerName, email: post.learnerEmail }}
                className="h-12 w-12"
                label={`${post.learnerName} learner post logo`}
              />
              <div>
                <p className="font-black text-slate-900 dark:text-slate-100">{post.learnerName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Learner portfolio post</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{post.platform}</Badge>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">{post.status}</Badge>
            </div>
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Full caption</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-300">{post.caption}</p>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Hashtags</p>
              <p className="mt-3 text-sm font-bold leading-6 text-blue-700 dark:text-blue-300">{post.hashtags.join(" ")}</p>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Portfolio context</p>
              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">{post.shortPortfolioDescription}</p>
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-900 dark:bg-slate-950 dark:text-slate-100">{post.callToAction}</p>
            </section>
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-4">
              <Metric label="Views" value={post.analytics.views} />
              <Metric label="Likes" value={post.analytics.likes} />
              <Metric label="Comments" value={post.analytics.comments} />
              <Metric label="Shares" value={post.analytics.shares} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-black text-slate-900 dark:text-slate-100">{value.toLocaleString()}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

function toPromotionalPost(post: StoredLearnerSocialPost): StoredSocialPost {
  return {
    id: post.id,
    trainerTagline: "Learner portfolio update",
    trainerBrandName: post.learnerName,
    trainerEmail: post.learnerEmail,
    status: post.status,
    publishedAt: post.publishedAt,
    promotion: {
      postTitle: post.achievementMessage,
      caption: post.caption,
      hashtags: post.hashtags,
      callToAction: post.callToAction,
      shortAdCopy: post.shortPortfolioDescription || post.achievementMessage,
      longAdCopy: post.caption,
      engagementQuestion: post.achievementMessage,
      trainerName: post.learnerName,
      courseTitle: post.courseTitle ?? "Learning milestone",
      platform: post.platform,
      createdAt: post.publishedAt
    },
    visual: post.visual,
    analytics: post.analytics
  };
}
