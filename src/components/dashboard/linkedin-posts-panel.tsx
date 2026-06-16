"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { PromotionalVisualPreview } from "@/components/trainer/promotional-visual-preview";
import { readStoredSocialPosts, sanitizeLegacySocialStorage, type StoredSocialPost } from "@/lib/social-post-storage";

export function LinkedInPostsPanel() {
  const [posts, setPosts] = useState<StoredSocialPost[]>([]);

  useEffect(() => {
    function loadPosts() {
      try {
        sanitizeLegacySocialStorage();
        setPosts(readStoredSocialPosts());
      } catch {
        setPosts([]);
      }
    }

    const frame = window.requestAnimationFrame(loadPosts);
    window.addEventListener("storage", loadPosts);
    window.addEventListener("skillpilot-social-posts-updated", loadPosts);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", loadPosts);
      window.removeEventListener("skillpilot-social-posts-updated", loadPosts);
    };
  }, []);

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Published Promotional Posts</p>
          <h2 className="mt-2 text-xl font-black text-ink">Published Promotional Posts</h2>
          <p className="mt-2 text-sm text-ink/60">Mock social posts generated from Groq copy and Hugging Face visual support.</p>
        </div>
        <Badge>{posts.length} published</Badge>
      </div>

      <div className="mt-5 grid gap-4">
        {posts.slice(0, 3).map((post) => (
          <article key={post.id} className="grid gap-4 rounded-2xl border border-ink/10 bg-cloud p-4 md:grid-cols-[0.22fr_1fr_auto] md:items-start">
            <PromotionalVisualPreview post={post} compact className="md:aspect-square" />
            <div>
              <div className="mb-3 flex items-center gap-3">
                <ProfileLogo
                  user={{ fullName: post.trainerBrandName ?? post.promotion.trainerName, email: post.trainerEmail ?? "" }}
                  logoUrl={post.trainerLogoUrl}
                  className="h-11 w-11"
                  label={`${post.trainerBrandName ?? post.promotion.trainerName} LinkedIn post logo`}
                />
                <div>
                  <p className="font-bold text-ink">{post.trainerBrandName ?? post.promotion.trainerName}</p>
                  <p className="text-xs text-ink/55">{post.trainerTagline}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-blue-50 text-blue-700">{post.promotion.platform}</Badge>
                <Badge className="bg-emerald-50 text-emerald-700">{post.status}</Badge>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/70">{post.promotion.caption}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
                {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(post.publishedAt))}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink/60">
                <span>{post.analytics.views.toLocaleString()} views</span>
                <span>{post.analytics.likes.toLocaleString()} likes</span>
                <span>{post.analytics.comments.toLocaleString()} comments</span>
                <span>{post.analytics.shares.toLocaleString()} shares</span>
              </div>
            </div>
            <Button asChild variant="secondary">
              <Link href={`/mock-social/${post.promotion.platform.toLowerCase()}?postId=${post.id}`}>View Post</Link>
            </Button>
          </article>
        ))}

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 bg-cloud p-8 text-center">
            <p className="text-sm font-bold text-ink">No promotional posts published yet.</p>
            <p className="mt-2 text-sm text-ink/60">Use Social Automation to generate and publish a mock promotional post.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
