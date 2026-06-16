"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type NavItem = {
  label: string;
  href: string;
  icon?: string;
};

type NavGroup = {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "OV",
    items: [
      { label: "Dashboard", href: "/trainer/dashboard", icon: "DB" },
      { label: "AI Chatbot", href: "/trainer/ai-chatbot", icon: "AI" }
    ]
  },
  {
    id: "courses",
    label: "Course Management",
    icon: "CM",
    items: [
      { label: "Courses", href: "/trainer/courses" },
      { label: "Learners", href: "/trainer/learners" },
      { label: "Sessions", href: "/trainer/sessions" },
      { label: "Scheduling", href: "/trainer/scheduling" },
      { label: "Reviews", href: "/trainer/reviews" }
    ]
  },
  {
    id: "marketing",
    label: "Marketing Tools",
    icon: "AI",
    items: [
      { label: "Marketing", href: "/trainer/marketing" },
      { label: "AI Marketing", href: "/trainer/ai-marketing" },
      { label: "Social Automation", href: "/trainer/social-automation" },
      { label: "Automation", href: "/trainer/automation" },
      { label: "AI Branding", href: "/trainer/ai-branding" }
    ]
  },
  {
    id: "finance",
    label: "Finance",
    icon: "$",
    items: [
      { label: "Payment Agent", href: "/trainer/payment-agent" },
      { label: "Payments", href: "/trainer/payments" },
      { label: "Revenue", href: "/trainer/revenue" }
    ]
  },
  {
    id: "support",
    label: "Support / Settings",
    icon: "SS",
    items: [
      { label: "Settings", href: "/trainer/settings" }
    ]
  }
];

const storageKey = "skillpilot-trainer-sidebar-groups";

export function TrainerSidebar({
  activeHref,
  className,
  compact = false
}: {
  activeHref: string;
  className?: string;
  compact?: boolean;
}) {
  const defaultExpanded = useMemo(
    () => Object.fromEntries(navGroups.map((group) => [group.id, true])) as Record<string, boolean>,
    []
  );
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(storageKey);

      if (!stored) {
        return;
      }

      try {
        setExpanded({ ...defaultExpanded, ...(JSON.parse(stored) as Record<string, boolean>) });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [defaultExpanded]);

  function toggleGroup(groupId: string) {
    setExpanded((current) => {
      const next = { ...current, [groupId]: !current[groupId] };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  return (
    <nav className={cn("grid gap-2", className)} aria-label="Trainer navigation">
      {navGroups.map((group) => {
        const isExpanded = expanded[group.id] ?? true;

        return (
          <section key={group.id} className="rounded-xl border border-ink/10 bg-white/70 p-2 dark:border-slate-700 dark:bg-slate-900/70">
            <button
              aria-controls={`trainer-nav-${group.id}`}
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm font-bold text-ink transition hover:bg-limewash focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-950"
              type="button"
              onClick={() => toggleGroup(group.id)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-950 text-[10px] font-black text-white">
                  {group.icon}
                </span>
                <span className={cn("truncate", compact && "sr-only")}>{group.label}</span>
              </span>
              <span aria-hidden="true" className={cn("text-ink/45 transition", isExpanded && "rotate-90")}>
                &gt;
              </span>
            </button>

            {isExpanded ? (
              <div id={`trainer-nav-${group.id}`} className="mt-1 grid gap-1">
                {group.items.map((item) => {
                  const active = activeHref === item.href;

                  return (
                    <Link
                      key={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink/68 transition hover:bg-limewash hover:text-ink active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 motion-reduce:active:scale-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-blue-950",
                        active && "bg-limewash text-ink shadow-sm ring-1 ring-blue-100 dark:bg-blue-950/60 dark:text-white dark:ring-blue-900"
                      )}
                      href={item.href}
                    >
                      {item.icon ? (
                        <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                          {item.icon}
                        </span>
                      ) : null}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}
