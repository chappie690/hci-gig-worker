"use client";

export const learnerSocialPostsStorageKey = "skillpilot_learner_social_posts";
export const maxStoredLearnerSocialPosts = 15;

export type LearnerSocialPlatform = "LinkedIn" | "Facebook" | "Instagram" | "TikTok";

export type StoredLearnerSocialPost = {
  id: string;
  learnerName: string;
  learnerEmail: string;
  platform: LearnerSocialPlatform;
  caption: string;
  hashtags: string[];
  achievementMessage: string;
  callToAction: string;
  shortPortfolioDescription: string;
  courseTitle?: string;
  status: "Published";
  publishedAt: string;
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

export function readStoredLearnerSocialPosts() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(learnerSocialPostsStorageKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.map(coercePost).filter(Boolean) as StoredLearnerSocialPost[] : [];
  } catch {
    window.localStorage.removeItem(learnerSocialPostsStorageKey);
    return [];
  }
}

export function saveStoredLearnerSocialPost(post: StoredLearnerSocialPost) {
  const cleaned = sanitizePost(post);
  const posts = [cleaned, ...readStoredLearnerSocialPosts().filter((item) => item.id !== cleaned.id)].slice(0, maxStoredLearnerSocialPosts);

  try {
    window.localStorage.setItem(learnerSocialPostsStorageKey, JSON.stringify(posts.map(sanitizePost)));
    window.dispatchEvent(new Event("skillpilot-learner-social-posts-updated"));
    return { ok: true, message: "Learner post saved." };
  } catch {
    try {
      window.localStorage.setItem(learnerSocialPostsStorageKey, JSON.stringify(posts.map(sanitizePost).slice(0, 8)));
      window.dispatchEvent(new Event("skillpilot-learner-social-posts-updated"));
      return { ok: true, message: "SkillPilot trimmed older learner posts so the newest post could be saved." };
    } catch {
      return { ok: false, message: "Browser storage is full. The post was published for this session, but history could not be saved." };
    }
  }
}

export function getLearnerPostImageSessionKey(postId: string) {
  return `skillpilot_learner_social_post_image_${postId}`;
}

function sanitizePost(post: StoredLearnerSocialPost): StoredLearnerSocialPost {
  const fallbackVisualId = post.visual.fallbackVisualId || `${post.platform}-${post.id}`.replace(/[^a-z0-9-]/gi, "").toLowerCase();

  return {
    id: post.id,
    learnerName: post.learnerName,
    learnerEmail: post.learnerEmail,
    platform: normalizePlatform(post.platform),
    caption: post.caption,
    hashtags: Array.isArray(post.hashtags) ? post.hashtags.slice(0, 12) : [],
    achievementMessage: post.achievementMessage,
    callToAction: post.callToAction,
    shortPortfolioDescription: post.shortPortfolioDescription,
    courseTitle: post.courseTitle,
    status: "Published",
    publishedAt: post.publishedAt,
    visual: {
      promoImageUrl: post.visual.promoImageUrl && !post.visual.promoImageUrl.startsWith("data:") ? post.visual.promoImageUrl : undefined,
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

function coercePost(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<StoredLearnerSocialPost>;
  if (!item.id || !item.platform || !item.visual || !item.analytics) {
    return null;
  }

  return sanitizePost(item as StoredLearnerSocialPost);
}

function normalizePlatform(platform: unknown): LearnerSocialPlatform {
  if (platform === "Facebook" || platform === "Instagram" || platform === "TikTok") {
    return platform;
  }

  return "LinkedIn";
}
