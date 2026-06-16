"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { PromotionalVisualPreview } from "@/components/trainer/promotional-visual-preview";
import {
  getLearnerPostImageSessionKey,
  readStoredLearnerSocialPosts,
  type StoredLearnerSocialPost
} from "@/lib/learner-social-post-storage";
import { readStoredSocialPosts, sanitizeLegacySocialStorage, type StoredSocialPost } from "@/lib/social-post-storage";

type Platform = "LinkedIn" | "Facebook" | "TikTok" | "Instagram";

export function MockLinkedInPage({ postId }: { postId: string }) {
  return <MockSocialPlatformPage postId={postId} platform="LinkedIn" />;
}

export function MockSocialPlatformPage({ postId, platform }: { postId: string; platform: Platform }) {
  const [post, setPost] = useState<StoredSocialPost | null>(null);
  const [learnerPost, setLearnerPost] = useState<StoredLearnerSocialPost | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        sanitizeLegacySocialStorage();
        const posts = readStoredSocialPosts().filter((item) => item.promotion?.platform === platform || (platform === "LinkedIn" && !item.promotion?.platform));
        const trainerPost = posts.find((item) => item.id === postId) ?? (!postId ? posts[0] ?? null : null);
        const learnerPosts = readStoredLearnerSocialPosts().filter((item) => item.platform === platform);
        const matchingLearnerPost = trainerPost ? null : learnerPosts.find((item) => item.id === postId) ?? (!postId ? learnerPosts[0] ?? null : null);
        setPost(trainerPost);
        setLearnerPost(matchingLearnerPost);
      } catch {
        setPost(null);
        setLearnerPost(null);
      }
      setLoaded(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [platform, postId]);

  if (loaded && !post && !learnerPost) {
    return (
      <main className={`grid min-h-screen place-items-center px-6 ${platformBackground(platform)}`}>
        <section className="max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-black text-slate-950">{platform} post not found</h1>
          <p className="mt-3 text-sm text-slate-600">This mock post may belong to another browser session.</p>
          <Button asChild className="mt-5">
            <Link href="/trainer/social-automation">Back to Social Automation</Link>
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className={`min-h-screen px-4 py-8 ${platformShell(platform)}`}>
      <header className="mx-auto mb-6 flex max-w-5xl items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded text-xl font-black text-white ${platformMark(platform)}`}>{platformShort(platform)}</div>
          <div>
            <p className="font-black text-slate-950">Mock {platform}</p>
            <p className="text-xs text-slate-500">SkillPilot demo workspace</p>
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link href={learnerPost ? "/learner/dashboard" : "/trainer/dashboard"}>Back to Dashboard</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">Post successfully published</p>
        <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-start gap-3 border-b border-slate-200 p-5">
            <ProfileLogo
              user={{ fullName: learnerPost?.learnerName ?? post?.trainerBrandName ?? post?.promotion.trainerName ?? "SkillPilot Trainer", email: learnerPost?.learnerEmail ?? post?.trainerEmail ?? "" }}
              logoUrl={post?.trainerLogoUrl}
              className="h-14 w-14"
              label={`${learnerPost?.learnerName ?? post?.trainerBrandName ?? post?.promotion.trainerName ?? "User"} social logo`}
            />
            <div>
              <p className="font-black text-slate-950">{learnerPost?.learnerName ?? post?.trainerBrandName ?? post?.promotion.trainerName}</p>
              <p className="text-xs text-slate-500">{learnerPost ? "SkillPilot learner portfolio" : post?.trainerTagline}</p>
              <p className="mt-1 text-xs text-slate-400">{post || learnerPost ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date((post?.publishedAt ?? learnerPost?.publishedAt) as string)) : "Just now"}</p>
            </div>
          </div>

          <div className="p-5">
            <p className="text-lg font-black text-slate-950">{learnerPost?.achievementMessage ?? post?.promotion.postTitle}</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{learnerPost?.caption ?? post?.promotion.caption}</p>
            <p className={`mt-4 text-sm font-bold ${platformText(platform)}`}>{(learnerPost?.hashtags ?? post?.promotion.hashtags ?? []).join(" ")}</p>
            <p className={`mt-4 rounded-xl px-3 py-2 text-sm font-bold ${platformCta(platform)}`}>{learnerPost?.callToAction ?? post?.promotion.callToAction}</p>
            {learnerPost ? <p className="mt-3 text-sm leading-6 text-slate-500">{learnerPost.shortPortfolioDescription}</p> : null}
          </div>

          <div className="bg-slate-100 p-5">
            {post ? (
              <PromotionalVisualPreview post={post} className={visualAspect(platform)} />
            ) : learnerPost ? (
              <LearnerVisual post={learnerPost} platform={platform} />
            ) : (
              <div className={`${visualAspect(platform)} rounded-2xl bg-slate-200`} />
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 border-t border-slate-200 p-5 text-center text-sm">
            <Stat label="views" value={post?.analytics.views ?? learnerPost?.analytics.views ?? 0} />
            <Stat label="likes" value={post?.analytics.likes ?? learnerPost?.analytics.likes ?? 0} />
            <Stat label="comments" value={post?.analytics.comments ?? learnerPost?.analytics.comments ?? 0} />
            <Stat label="shares" value={post?.analytics.shares ?? learnerPost?.analytics.shares ?? 0} />
          </div>
        </article>
      </section>
    </main>
  );
}

function LearnerVisual({ post, platform }: { post: StoredLearnerSocialPost; platform: Platform }) {
  const [sessionImage, setSessionImage] = useState<string | null>(null);
  const imageUrl = sessionImage ?? post.visual.promoImageUrl ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSessionImage(window.sessionStorage.getItem(getLearnerPostImageSessionKey(post.id)));
      } catch {
        setSessionImage(null);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [post.id]);

  if (imageUrl) {
    return <div className={`${visualAspect(platform)} rounded-2xl bg-cover bg-center shadow-sm`} style={{ backgroundImage: `url(${imageUrl})` }} role="img" aria-label={`${platform} learner generated visual`} />;
  }

  return (
    <div className={`${visualAspect(platform)} grid place-items-center rounded-2xl bg-[linear-gradient(135deg,#2563eb,#7c3aed_55%,#0f172a)] p-8 text-center text-white shadow-sm`}>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">SkillPilot portfolio</p>
        <h2 className="mt-3 text-3xl font-black">{post.courseTitle ?? "Learning milestone"}</h2>
        <p className="mt-3 text-sm text-white/80">{post.achievementMessage}</p>
      </div>
    </div>
  );
}

function platformBackground(platform: Platform) {
  if (platform === "TikTok") return "bg-black";
  if (platform === "Instagram") return "bg-[linear-gradient(135deg,#4f46e5,#9333ea_45%,#ec4899)]";
  if (platform === "Facebook") return "bg-[#1877f2]";
  return "bg-[#0a66c2]";
}

function platformShell(platform: Platform) {
  if (platform === "TikTok") return "bg-[#050505]";
  if (platform === "Instagram") return "bg-[#fafafa]";
  if (platform === "Facebook") return "bg-[#f0f2f5]";
  return "bg-[#eef3f8]";
}

function platformMark(platform: Platform) {
  if (platform === "TikTok") return "bg-black";
  if (platform === "Instagram") return "bg-gradient-to-br from-purple-600 to-pink-500";
  if (platform === "Facebook") return "bg-[#1877f2]";
  return "bg-[#0a66c2]";
}

function platformShort(platform: Platform) {
  if (platform === "TikTok") return "tt";
  if (platform === "Instagram") return "ig";
  if (platform === "Facebook") return "f";
  return "in";
}

function platformText(platform: Platform) {
  if (platform === "TikTok") return "text-pink-600";
  if (platform === "Instagram") return "text-purple-700";
  if (platform === "Facebook") return "text-[#1877f2]";
  return "text-[#0a66c2]";
}

function platformCta(platform: Platform) {
  if (platform === "TikTok") return "bg-pink-50 text-pink-700";
  if (platform === "Instagram") return "bg-purple-50 text-purple-700";
  if (platform === "Facebook") return "bg-blue-50 text-[#1877f2]";
  return "bg-blue-50 text-[#0a66c2]";
}

function visualAspect(platform: Platform) {
  if (platform === "TikTok") return "aspect-[9/16] mx-auto max-w-sm";
  if (platform === "Instagram") return "aspect-square";
  return "aspect-video";
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-black text-slate-950">{value.toLocaleString()}</p>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
    </div>
  );
}
