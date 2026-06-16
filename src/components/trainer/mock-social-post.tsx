"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { cn } from "@/lib/cn";

type DemoPost = {
  id: string;
  platform: string;
  trainerName: string;
  courseTitle: string;
  caption: string;
  adCopy?: string;
  hashtags: string[];
  cta: string;
  status: string;
  createdAt: string;
};

const postKey = "skillpilot-demo-social-posts";

export function MockSocialPost({ postId }: { postId: string }) {
  const [post, setPost] = useState<DemoPost | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(postKey) ?? "[]") as DemoPost[];
        setPost(parsed.find((item) => item.id === postId) ?? null);
      } catch {
        setPost(null);
      }
      setLoaded(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [postId]);

  if (loaded && !post) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
        <section className="max-w-md rounded-3xl border border-white/10 bg-white p-8 text-center text-slate-950 shadow-2xl">
          <h1 className="text-2xl font-black">Mock post not found</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">This simulated social post may belong to another browser session.</p>
          <Button asChild className="mt-5">
            <Link href="/trainer/social-automation">Back to Social Automation</Link>
          </Button>
        </section>
      </main>
    );
  }

  const platform = post?.platform ?? "INSTAGRAM";

  return (
    <main className={cn("min-h-screen px-6 py-10", platformClass(platform))}>
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-white/20 bg-white p-6 text-slate-950 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Successfully posted</p>
            <h1 className="mt-1 text-2xl font-black">{platformLabel(platform)}</h1>
          </div>
          <Button asChild variant="secondary">
            <Link href="/trainer/social-automation">Return</Link>
          </Button>
        </div>

        <article className={cn("mt-6 overflow-hidden rounded-[1.5rem] border shadow-xl", cardClass(platform))}>
          <div className="flex items-center gap-3 border-b border-black/10 bg-white/90 p-4">
            <ProfileLogo user={{ fullName: post?.trainerName ?? "SkillPilot Trainer", email: "" }} className="h-11 w-11 rounded-full" label={`${post?.trainerName ?? "Trainer"} mock social logo`} />
            <div>
              <p className="font-black">{post?.trainerName ?? "SkillPilot Trainer"}</p>
              <p className="text-xs text-slate-500">{post?.courseTitle ?? "SkillPilot course"}</p>
            </div>
          </div>
          <div className="grid aspect-square place-items-center bg-gradient-to-br from-blue-600 via-purple-600 to-slate-950 p-8 text-center text-white">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">SkillPilot AI</p>
              <h2 className="mt-3 text-3xl font-black">{post?.courseTitle ?? "AI training post"}</h2>
              <p className="mt-4 text-sm font-semibold text-white/85">{post?.cta ?? "Preview the course."}</p>
            </div>
          </div>
          <div className="bg-white p-5">
            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{post?.caption}</p>
            {post?.adCopy ? (
              <div className="mt-4 rounded-xl bg-slate-100 px-3 py-2">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Generated ad copy</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{post.adCopy}</p>
              </div>
            ) : null}
            {post?.hashtags.length ? <p className="mt-4 text-sm font-bold text-blue-700">{post.hashtags.join(" ")}</p> : null}
            <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">Successfully posted.</p>
          </div>
        </article>
      </section>
    </main>
  );
}

function platformLabel(platform: string) {
  if (platform === "TIKTOK") return "TikTok mock feed";
  if (platform === "FACEBOOK") return "Facebook mock page";
  return "Instagram mock post";
}

function platformClass(platform: string) {
  if (platform === "TIKTOK") return "bg-[linear-gradient(135deg,#050505,#111827_50%,#ec4899)]";
  if (platform === "FACEBOOK") return "bg-[linear-gradient(135deg,#0f172a,#2563eb)]";
  return "bg-[linear-gradient(135deg,#4f46e5,#9333ea_48%,#ec4899)]";
}

function cardClass(platform: string) {
  if (platform === "TIKTOK") return "border-slate-900";
  if (platform === "FACEBOOK") return "border-blue-200";
  return "border-purple-200";
}
