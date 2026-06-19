import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON, isGroqConfigured } from "@/lib/groq";

const schema = z.object({
  query: z.string({ required_error: "Search query is required." }).trim().min(1, "Search query is required.").max(120),
  role: z.string().optional()
});

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      href: z.string()
    })
  ).min(1).max(5)
});

const routeMap = [
  { title: "Learner Dashboard", href: "/learner/dashboard", keywords: ["learner", "progress", "dashboard", "alerts"], reason: "Track enrolled courses, progress, sessions, and notifications." },
  { title: "My Courses", href: "/learner/courses", keywords: ["my courses", "enrolled", "learn", "course"], reason: "Open enrolled courses and continue learning." },
  { title: "Discover Courses", href: "/learner/discover", keywords: ["browse", "discover", "catalog", "courses", "buy"], reason: "Browse purchasable courses and use mock checkout." },
  { title: "Learner Sessions", href: "/learner/sessions", keywords: ["calendar", "sessions", "training", "schedule"], reason: "View upcoming learner training sessions." },
  { title: "Pilot Pete", href: "/learner/chatbot", keywords: ["chat", "chatbot", "ai help", "question"], reason: "Ask Pilot Pete course and platform questions." },
  { title: "Trainer Dashboard", href: "/trainer/dashboard", keywords: ["trainer", "dashboard", "metrics", "revenue"], reason: "Review trainer metrics, revenue, learners, and milestones." },
  { title: "Trainer Courses", href: "/trainer/courses", keywords: ["course management", "publish", "courses"], reason: "Create, edit, publish, and manage trainer courses." },
  { title: "AI Marketing", href: "/trainer/ai-marketing", keywords: ["marketing", "campaign", "ad", "email", "hashtags", "seo"], reason: "Generate Groq-powered campaign copy and performance tips." },
  { title: "AI Branding", href: "/trainer/ai-branding", keywords: ["branding", "brand", "logo", "tagline", "bio"], reason: "Generate brand names, taglines, bios, and logo prompts." },
  { title: "Social Automation", href: "/trainer/social-automation", keywords: ["social", "post", "instagram", "linkedin", "facebook"], reason: "Schedule and simulate posting generated marketing content." },
  { title: "Automation", href: "/trainer/automation", keywords: ["automation", "workflow", "reminder"], reason: "Manage workflow tasks and AI-generated automation ideas." },
  { title: "Payment Agent", href: "/trainer/payment-agent", keywords: ["payment", "payments", "revenue", "receipt", "refund"], reason: "Monitor payments, revenue, pricing, and risk signals." },
  { title: "Reviews", href: "/trainer/reviews", keywords: ["reviews", "feedback", "stars"], reason: "Review learner feedback and course trust signals." },
  { title: "Settings", href: "/trainer/settings", keywords: ["settings", "profile", "avatar", "email"], reason: "Update profile details and workspace preferences." }
];

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const fallback = localSuggestions(body.query, body.role);

  if (isGroqConfigured()) {
    const groq = await generateJSON({
      system: "You are SkillPilot AI's navigation guide. Pick the best existing routes for a user's search. Return only valid JSON with suggestions.",
      user: {
        query: body.query,
        role: body.role,
        availableRoutes: routeMap.map(({ title, href, reason }) => ({ title, href, reason }))
      },
      schema: suggestionSchema,
      temperature: 0.2
    });

    if (groq.ok) {
      return NextResponse.json(groq.value);
    }
  }

  return NextResponse.json({ suggestions: fallback });
}

function localSuggestions(query: string, role?: string) {
  const normalized = query.toLowerCase();
  const scored = routeMap
    .map((route) => ({
      ...route,
      score: route.keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 2 : 0), 0) + (role === "LEARNER" && route.href.startsWith("/learner") ? 1 : 0) + (role === "TRAINER" && route.href.startsWith("/trainer") ? 1 : 0)
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 4).map(({ title, reason, href }) => ({ title, reason, href }));
}
