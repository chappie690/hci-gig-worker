"use client";

import { ChatbotWorkspace, type ChatItem, type CourseOption, type NavigationTarget } from "@/components/chatbot/chatbot-workspace";

const trainerTargets: NavigationTarget[] = [
  {
    title: "AI Marketing",
    href: "/trainer/ai-marketing",
    reason: "generate campaign copy, course descriptions, emails, ads, hashtags, and performance tips",
    actionLabel: "Yes, go there",
    keywords: ["ai marketing", "marketing", "campaign", "ad", "email", "copy", "promo"]
  },
  {
    title: "Social Automation",
    href: "/trainer/social-automation",
    reason: "create, preview, schedule, and simulate promotional social posts",
    actionLabel: "Yes, go there",
    keywords: ["social", "post", "posts", "linkedin", "instagram", "facebook", "tiktok"]
  },
  {
    title: "Sessions",
    href: "/trainer/sessions",
    reason: "view upcoming sessions, meeting details, learners invited, and session links",
    actionLabel: "Yes, go there",
    keywords: ["session", "sessions", "meeting", "calendar", "schedule", "upcoming"]
  },
  {
    title: "Courses",
    href: "/trainer/courses",
    reason: "create, edit, publish, unpublish, price, discount, and manage courses",
    actionLabel: "Yes, go there",
    keywords: ["course", "courses", "edit", "create course", "publish", "discount"]
  },
  {
    title: "Payment Agent",
    href: "/trainer/payment-agent",
    reason: "review revenue, payment counts, discounts, pricing recommendations, and transaction signals",
    actionLabel: "Yes, go there",
    keywords: ["revenue", "payment", "payments", "money", "earned", "sales", "sold"]
  },
  {
    title: "Settings",
    href: "/trainer/settings",
    reason: "edit trainer profile, logo, tagline, avatar, and brand settings",
    actionLabel: "Yes, go there",
    keywords: ["settings", "profile", "avatar", "logo", "tagline", "brand"]
  },
  {
    title: "Dashboard",
    href: "/trainer/dashboard",
    reason: "scan trainer metrics, learners, revenue, sessions, and recent activity",
    actionLabel: "Yes, go there",
    keywords: ["dashboard", "overview", "metrics", "home"]
  }
];

export function TrainerChatbotPanel({
  trainer,
  courses,
  initialMessages
}: {
  trainer: { fullName: string; email: string };
  courses: CourseOption[];
  initialMessages: ChatItem[];
}) {
  return (
    <ChatbotWorkspace
      user={trainer}
      courses={courses}
      initialMessages={initialMessages}
      endpoint="/api/ai/trainer-chatbot"
      botName="SkillPilot Agent"
      botInitials="SA"
      workspaceTitle="SkillPilot Agent trainer support"
      savedHistoryLabel="Trainer messages are saved to your SkillPilot chat history"
      contextLabel="Course context"
      emptyTitle={`Hi ${firstName(trainer.fullName)}, I am your SkillPilot Agent.`}
      emptyDescription="Ask about revenue, top-selling courses, discounts, learners, sessions, marketing, social posts, course creation, or where to find a trainer tool."
      placeholder="Try: How much revenue did I earn? Where can I create social posts? Suggest a discount. Show my upcoming sessions."
      emptyQuestionError="Ask SkillPilot Agent a trainer workspace question first."
      loadingText="SkillPilot Agent is checking your trainer workspace..."
      navigationTargets={trainerTargets}
      styleStorageKey="skillpilot-trainer-chatbot-style"
      requestMode="trainer"
    />
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "trainer";
}
