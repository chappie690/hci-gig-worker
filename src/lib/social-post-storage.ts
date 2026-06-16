"use client";

export const linkedinPostsStorageKey = "skillpilot_trainer_linkedin_posts";
export const socialPostsStorageKey = "skillpilot_trainer_social_posts";
export const maxStoredSocialPosts = 15;

export type SocialPlatform = "LinkedIn" | "Facebook" | "TikTok" | "Instagram";

export type StoredSocialPost = {
  id: string;
  trainerTagline: string;
  trainerLogoUrl?: string;
  trainerBrandName?: string;
  trainerEmail?: string;
  status: "Published";
  publishedAt: string;
  source?: { groq?: "groq" | "fallback"; huggingFace?: "huggingface" | "fallback" };
  promotion: {
    postTitle: string;
    caption: string;
    hashtags: string[];
    callToAction: string;
    shortAdCopy: string;
    longAdCopy?: string;
    engagementQuestion?: string;
    audienceTargetingReason?: string;
    targetAudience?: string;
    trainerName: string;
    courseTitle: string;
    platform: SocialPlatform;
    createdAt?: string;
  };
  visual: {
    promoImageUrl?: string;
    visualPromptUsed: string;
    visualSource: "huggingface" | "fallback";
    modelUsed?: string;
    safeErrorCode?: string;
    safeErrorMessage?: string;
    fallbackVisualId: string;
  };
  analytics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
};

type SaveResult = {
  ok: boolean;
  pruned: boolean;
  message?: string;
};

export function readStoredSocialPosts() {
  const social = readPostsFromKey(socialPostsStorageKey);
  const legacyLinkedIn = readPostsFromKey(linkedinPostsStorageKey);
  return dedupePosts([...social, ...legacyLinkedIn]).slice(0, maxStoredSocialPosts);
}

export function saveStoredSocialPost(post: StoredSocialPost) {
  const cleanedPost = sanitizeSocialPost(post);
  const posts = dedupePosts([cleanedPost, ...readStoredSocialPosts()]).slice(0, maxStoredSocialPosts);
  const result = writePostsWithQuotaRecovery(socialPostsStorageKey, posts);

  if (cleanedPost.promotion.platform === "LinkedIn") {
    writePostsWithQuotaRecovery(linkedinPostsStorageKey, posts.filter((item) => item.promotion.platform === "LinkedIn").slice(0, maxStoredSocialPosts));
  }

  window.dispatchEvent(new Event("skillpilot-social-posts-updated"));
  return result;
}

export function sanitizeLegacySocialStorage() {
  const social = readPostsFromKey(socialPostsStorageKey);
  const legacyLinkedIn = readPostsFromKey(linkedinPostsStorageKey);
  const sanitized = dedupePosts([...social, ...legacyLinkedIn]).map(sanitizeSocialPost).slice(0, maxStoredSocialPosts);
  writePostsWithQuotaRecovery(socialPostsStorageKey, sanitized);
  writePostsWithQuotaRecovery(linkedinPostsStorageKey, sanitized.filter((item) => item.promotion.platform === "LinkedIn"));
  return sanitized;
}

export function getStoredSocialPostVisual(post: StoredSocialPost) {
  if (post.visual.promoImageUrl && !post.visual.promoImageUrl.startsWith("data:")) {
    return { backgroundImage: `url(${post.visual.promoImageUrl})` };
  }

  return { background: fallbackVisualGradient(post.visual.fallbackVisualId, post.promotion.platform) };
}

function readPostsFromKey(key: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.map(coerceStoredSocialPost).filter(Boolean) as StoredSocialPost[] : [];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}

function writePostsWithQuotaRecovery(key: string, posts: StoredSocialPost[]): SaveResult {
  try {
    window.localStorage.setItem(key, JSON.stringify(posts.map(sanitizeSocialPost).slice(0, maxStoredSocialPosts)));
    return { ok: true, pruned: false };
  } catch (error) {
    const pruned = posts.map(sanitizeSocialPost).slice(0, 10);

    try {
      window.localStorage.setItem(key, JSON.stringify(pruned));
      return {
        ok: true,
        pruned: true,
        message: "SkillPilot trimmed older image-heavy post history so your latest post could be saved."
      };
    } catch {
      try {
        window.localStorage.removeItem(key);
        window.localStorage.setItem(key, JSON.stringify(pruned.slice(0, 5)));
        return {
          ok: true,
          pruned: true,
          message: "SkillPilot kept your latest lightweight post history after browser storage filled up."
        };
      } catch {
        return {
          ok: false,
          pruned: true,
          message: error instanceof DOMException && error.name === "QuotaExceededError"
            ? "Browser storage is full. The post was published for this session, but history could not be saved."
            : "SkillPilot could not save this post history locally."
        };
      }
    }
  }
}

function sanitizeSocialPost(post: StoredSocialPost): StoredSocialPost {
  const fallbackVisualId = post.visual.fallbackVisualId || createVisualId(post);
  const safeImageUrl = post.visual.promoImageUrl && !post.visual.promoImageUrl.startsWith("data:") ? post.visual.promoImageUrl : undefined;

  return {
    id: post.id,
    trainerTagline: post.trainerTagline,
    trainerLogoUrl: post.trainerLogoUrl && !post.trainerLogoUrl.startsWith("data:") ? post.trainerLogoUrl : undefined,
    trainerBrandName: post.trainerBrandName,
    trainerEmail: post.trainerEmail,
    status: "Published",
    publishedAt: post.publishedAt,
    source: post.source,
    promotion: {
      postTitle: post.promotion.postTitle,
      caption: post.promotion.caption,
      hashtags: Array.isArray(post.promotion.hashtags) ? post.promotion.hashtags.slice(0, 12) : [],
      callToAction: post.promotion.callToAction,
      shortAdCopy: post.promotion.shortAdCopy,
      longAdCopy: post.promotion.longAdCopy,
      engagementQuestion: post.promotion.engagementQuestion,
      audienceTargetingReason: post.promotion.audienceTargetingReason,
      targetAudience: post.promotion.targetAudience,
      trainerName: post.promotion.trainerName,
      courseTitle: post.promotion.courseTitle,
      platform: normalizePlatform(post.promotion.platform),
      createdAt: post.promotion.createdAt
    },
    visual: {
      promoImageUrl: safeImageUrl,
      visualPromptUsed: post.visual.visualPromptUsed,
      visualSource: post.visual.visualSource,
      modelUsed: post.visual.modelUsed,
      safeErrorCode: post.visual.safeErrorCode,
      safeErrorMessage: post.visual.safeErrorMessage,
      fallbackVisualId
    },
    analytics: {
      views: Number(post.analytics.views) || 0,
      likes: Number(post.analytics.likes) || 0,
      comments: Number(post.analytics.comments) || 0,
      shares: Number(post.analytics.shares) || 0
    }
  };
}

function coerceStoredSocialPost(value: unknown): StoredSocialPost | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<StoredSocialPost>;
  if (!item.id || !item.promotion || !item.visual || !item.analytics) {
    return null;
  }

  return sanitizeSocialPost(item as StoredSocialPost);
}

function dedupePosts(posts: StoredSocialPost[]) {
  const seen = new Set<string>();
  return posts.filter((post) => {
    if (seen.has(post.id)) {
      return false;
    }

    seen.add(post.id);
    return true;
  });
}

function createVisualId(post: StoredSocialPost) {
  return `${post.promotion.platform}-${post.id}`.replace(/[^a-z0-9-]/gi, "").toLowerCase();
}

function normalizePlatform(platform: unknown): SocialPlatform {
  if (platform === "Facebook" || platform === "TikTok" || platform === "Instagram") {
    return platform;
  }

  return "LinkedIn";
}

function fallbackVisualGradient(seed: string, platform: SocialPlatform) {
  const palettes: Record<SocialPlatform, string[]> = {
    LinkedIn: ["#0a66c2", "#60a5fa", "#e0f2fe"],
    Facebook: ["#1877f2", "#93c5fd", "#eef2ff"],
    TikTok: ["#111827", "#ec4899", "#22d3ee"],
    Instagram: ["#4f46e5", "#9333ea", "#ec4899"]
  };
  const colors = palettes[platform];
  const angle = Math.abs(hashSeed(seed)) % 90 + 110;
  return `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]} 48%, ${colors[2]})`;
}

function hashSeed(seed: string) {
  return seed.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}
