"use client";

import { useEffect, useState } from "react";

type DynamicGreetingProps = {
  userName?: string;
  context?: string;
  className?: string;
};

export function DynamicGreeting({ userName, context = "Ready to pilot your AI training business?", className }: DynamicGreetingProps) {
  const [period, setPeriod] = useState<"morning" | "afternoon" | "evening" | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hour = new Date().getHours();

      if (hour < 12) {
        setPeriod("morning");
      } else if (hour < 18) {
        setPeriod("afternoon");
      } else {
        setPeriod("evening");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const greeting = period ? `Good ${period}${userName ? `, ${userName}` : ""}.` : "Welcome to SkillPilot AI.";

  return (
    <p className={className} aria-live="polite">
      {greeting} {context}
    </p>
  );
}
