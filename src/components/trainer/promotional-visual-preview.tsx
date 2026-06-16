"use client";

import { useEffect, useState } from "react";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { cn } from "@/lib/cn";
import { type StoredSocialPost } from "@/lib/social-post-storage";

export function PromotionalVisualPreview({
  post,
  className,
  compact = false
}: {
  post: StoredSocialPost;
  className?: string;
  compact?: boolean;
}) {
  const [sessionImage, setSessionImage] = useState<string | null>(null);
  const imageUrl = sessionImage ?? (post.visual.promoImageUrl && !post.visual.promoImageUrl.startsWith("data:") ? post.visual.promoImageUrl : null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSessionImage(window.sessionStorage.getItem(getPromoImageSessionKey(post.id)));
      } catch {
        setSessionImage(null);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [post.id]);

  if (imageUrl) {
    return (
      <div
        className={cn("overflow-hidden rounded-2xl bg-cover bg-center shadow-sm", aspectClass(post.promotion.platform), className)}
        style={{ backgroundImage: `url(${imageUrl})` }}
        role="img"
        aria-label={`${post.promotion.platform} promotional image for ${post.promotion.courseTitle}`}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-white/20 p-4 text-white shadow-sm",
        aspectClass(post.promotion.platform),
        platformGradient(post.promotion.platform),
        className
      )}
      role="img"
      aria-label={`Fallback ${post.promotion.platform} promotional poster for ${post.promotion.courseTitle}`}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,0.32),transparent_28%),radial-gradient(circle_at_82%_72%,rgba(255,255,255,0.22),transparent_26%)]" />
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] backdrop-blur">
            {post.promotion.platform}
          </span>
          <ProfileLogo
            user={{ fullName: post.trainerBrandName ?? post.promotion.trainerName, email: post.trainerEmail ?? "" }}
            logoUrl={post.trainerLogoUrl}
            className={compact ? "h-8 w-8" : "h-11 w-11"}
            label={`${post.trainerBrandName ?? post.promotion.trainerName} promotional poster logo`}
          />
        </div>
        <div>
          <p className={cn("font-black leading-tight", compact ? "text-sm" : "text-2xl")}>{post.promotion.courseTitle}</p>
          <p className={cn("mt-2 font-semibold text-white/82", compact ? "line-clamp-2 text-xs" : "text-sm")}>
            {post.trainerBrandName ?? post.promotion.trainerName}
          </p>
          {!compact ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/78">{post.promotion.shortAdCopy}</p> : null}
        </div>
        <div className="rounded-xl border border-white/20 bg-white/14 px-3 py-2 backdrop-blur">
          <p className={cn("font-black", compact ? "line-clamp-1 text-xs" : "text-sm")}>{post.promotion.callToAction}</p>
        </div>
      </div>
    </div>
  );
}

export function getPromoImageSessionKey(postId: string) {
  return `skillpilot_social_post_image_${postId}`;
}

function aspectClass(platform: StoredSocialPost["promotion"]["platform"]) {
  if (platform === "TikTok") {
    return "aspect-[9/16]";
  }

  if (platform === "Instagram") {
    return "aspect-square";
  }

  return "aspect-video";
}

function platformGradient(platform: StoredSocialPost["promotion"]["platform"]) {
  if (platform === "Facebook") {
    return "bg-[linear-gradient(135deg,#0f3c91,#1877f2_48%,#93c5fd)]";
  }

  if (platform === "TikTok") {
    return "bg-[linear-gradient(145deg,#020617,#111827_48%,#ec4899)]";
  }

  if (platform === "Instagram") {
    return "bg-[linear-gradient(135deg,#4338ca,#9333ea_48%,#ec4899)]";
  }

  return "bg-[linear-gradient(135deg,#083766,#0a66c2_48%,#38bdf8)]";
}
