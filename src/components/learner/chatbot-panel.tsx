"use client";

import { ChatbotWorkspace, type ChatItem, type CourseOption, type NavigationTarget, type TeachingStyle } from "@/components/chatbot/chatbot-workspace";

const learnerGameStorageKey = "skillpilot-learner-game-state";
const styleStorageKey = "skillpilot-chatbot-style";

const learnerTargets: NavigationTarget[] = [
  {
    title: "Sessions",
    href: "/learner/sessions",
    reason: "view upcoming live sessions, meeting links, and session status",
    actionLabel: "Open Sessions",
    keywords: ["session", "sessions", "meeting", "calendar", "schedule", "live class"]
  },
  {
    title: "My Courses",
    href: "/learner/dashboard",
    reason: "continue enrolled courses, review progress, and see completion status",
    actionLabel: "Open Dashboard",
    keywords: ["my course", "continue", "progress", "completed", "complete", "certificate", "score"]
  },
  {
    title: "Course Catalog",
    href: "/learner/discover",
    reason: "preview recommended courses and enroll in new learning paths",
    actionLabel: "Open Catalog",
    keywords: ["recommend", "recommendation", "discover", "browse", "buy", "enroll", "catalog"]
  },
  {
    title: "Payment History",
    href: "/learner/dashboard",
    reason: "check payments, receipts, and enrollment status",
    actionLabel: "Open Payments",
    keywords: ["payment", "receipt", "refund", "checkout", "paid", "invoice"]
  }
];

export function ChatbotPanel({
  learner,
  courses,
  initialMessages
}: {
  learner: { fullName: string; email: string };
  courses: CourseOption[];
  initialMessages: ChatItem[];
}) {
  return (
    <ChatbotWorkspace
      user={learner}
      courses={courses}
      initialMessages={initialMessages}
      endpoint="/api/ai/chatbot"
      botName="Pilot Pete"
      botInitials="PP"
      workspaceTitle="Pilot Pete learner support"
      savedHistoryLabel="Messages are loaded from your saved SkillPilot history"
      contextLabel="Course context"
      emptyTitle={`Hi ${firstName(learner.fullName)}, I am Pilot Pete.`}
      emptyDescription="Ask me about your enrolled courses, upcoming sessions, certificates, progress, payments, or what course to explore next."
      placeholder="Ask about sessions, course progress, certificates, payment receipts, or what to learn next..."
      emptyQuestionError="Ask Pilot Pete a course, session, progress, payment, or certificate question first."
      loadingText="Pilot Pete is checking your course context..."
      navigationTargets={learnerTargets}
      styleStorageKey={styleStorageKey}
      onStyleSaved={saveLearnerStyleReward}
      enablePaymentAgentActions
    />
  );
}

function saveLearnerStyleReward(_style: TeachingStyle) {
  try {
    const fallback = {
      xp: 120,
      streak: 2,
      dailyGoal: 0,
      achievements: {},
      unlocked: {},
      accent: "blue",
      darkMode: false
    };
    const stored = window.localStorage.getItem(learnerGameStorageKey);
    const current = stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
    const alreadyExplored = Boolean(current.achievements?.["ai-chat"]);

    window.localStorage.setItem(
      learnerGameStorageKey,
      JSON.stringify({
        ...current,
        xp: Number(current.xp ?? 0) + (alreadyExplored ? 0 : 20),
        achievements: {
          ...current.achievements,
          "ai-chat": true
        }
      })
    );

    return alreadyExplored ? "Teaching style saved." : "+20 XP. AI Chat Explorer unlocked.";
  } catch {
    window.localStorage.removeItem(learnerGameStorageKey);
    return "Teaching style saved.";
  }
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "learner";
}
