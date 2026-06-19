"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HeaderActions } from "@/components/layout/header-actions";
import { LogoutButton } from "@/components/layout/logout-button";
import { ProfileIdentity } from "@/components/profile/profile-logo";
import { cn } from "@/lib/cn";

const primaryItems = [
  { label: "Dashboard", href: "/learner/dashboard", icon: HomeIcon },
  { label: "My Courses", href: "/learner/courses", icon: BookIcon },
  { label: "Discover", href: "/learner/discover", icon: CompassIcon }
];

const engagementItems = [
  { label: "Sessions", href: "/learner/sessions", icon: CalendarIcon },
  { label: "Pilot Pete", href: "/learner/chatbot", icon: SparkIcon },
  { label: "Social Automation", href: "/learner/social-automation", icon: SparkIcon }
];

const learnerSidebarScrollKey = "skillpilot-learner-sidebar-scroll";

export function LearnerShellFrame({
  user,
  label,
  title,
  activeHref,
  children
}: {
  user: { fullName: string; email: string; role?: string };
  label: string;
  title: string;
  activeHref?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = Number(window.localStorage.getItem(learnerSidebarScrollKey) ?? 0);
      if (sidebarRef.current && Number.isFinite(stored)) {
        sidebarRef.current.scrollTop = stored;
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-cloud dark:bg-slate-950">
      <aside
        ref={sidebarRef}
        className="fixed inset-y-0 left-0 z-20 hidden w-72 overflow-y-auto overscroll-contain border-r border-ink/10 bg-white px-5 py-6 shadow-xl shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-950 lg:flex lg:flex-col"
        onScroll={(event) => {
          window.localStorage.setItem(learnerSidebarScrollKey, String(event.currentTarget.scrollTop));
        }}
      >
        <LearnerSidebarContent user={user} activeHref={activeHref} />
      </aside>

      <section className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-ink/10 bg-cloud/95 px-4 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-ink/10 bg-white text-ink shadow-sm transition hover:bg-limewash active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 lg:hidden"
                aria-label="Open learner navigation"
                aria-expanded={open}
                onClick={() => setOpen(true)}
              >
                <MenuIcon />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm text-ink/55 dark:text-slate-300">{label}</p>
                <h1 className="truncate text-2xl font-bold text-ink dark:text-slate-100">{title}</h1>
              </div>
            </div>
            <HeaderActions user={user} showLogout={false} showProfile={false} />
          </div>
        </header>

        {open ? (
          <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="Learner navigation">
            <button className="absolute inset-0 bg-slate-950/40" type="button" aria-label="Close learner navigation" onClick={() => setOpen(false)} />
            <aside className="relative flex h-full w-[min(88vw,320px)] flex-col overflow-y-auto border-r border-ink/10 bg-white px-5 py-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
              <div className="mb-4 flex items-center justify-between gap-3">
                <Link href="/" className="text-sm font-bold uppercase tracking-[0.18em] text-moss" onClick={() => setOpen(false)}>
                  SkillPilot AI
                </Link>
                <button
                  type="button"
                  className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ink transition hover:bg-cloud focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
              <LearnerSidebarContent user={user} activeHref={activeHref} onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
      </section>
    </main>
  );
}

function LearnerSidebarContent({
  user,
  activeHref,
  onNavigate
}: {
  user: { fullName: string; email: string; role?: string };
  activeHref?: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Link
        href="/"
        className="rounded-lg text-sm font-bold uppercase tracking-[0.18em] text-moss transition hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
        onClick={onNavigate}
      >
        SkillPilot AI
      </Link>

      <nav className="mt-7 grid gap-7" aria-label="Learner navigation">
        <SidebarGroup label="Primary navigation" items={primaryItems} activeHref={activeHref} onNavigate={onNavigate} />
        <SidebarGroup label="Engagement" items={engagementItems} activeHref={activeHref} onNavigate={onNavigate} />
      </nav>

      <div className="mt-auto grid gap-3 border-t border-ink/10 pt-5 dark:border-slate-700">
        <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-cloud p-3 dark:border-slate-700 dark:bg-slate-900">
          <ProfileIdentity user={user} logoClassName="h-11 w-11" />
        </div>
        <Link
          href="/learner/settings"
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-limewash hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
            activeHref === "/learner/settings" && "bg-blue-50 text-blue-800 shadow-sm dark:bg-blue-950/60 dark:text-white"
          )}
          onClick={onNavigate}
        >
          <SettingsIcon />
          <span>Settings</span>
        </Link>
        <LogoutButton />
      </div>
    </>
  );
}

function SidebarGroup({
  label,
  items,
  activeHref,
  onNavigate
}: {
  label: string;
  items: Array<{ label: string; href: string; icon: () => React.ReactNode }>;
  activeHref?: string;
  onNavigate?: () => void;
}) {
  return (
    <section>
      <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-ink/45 dark:text-slate-400">{label}</p>
      <div className="mt-2 grid gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeHref === item.href || (item.href === "/learner/courses" && activeHref?.startsWith("/learner/courses/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-limewash hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                active && "bg-blue-50 text-blue-800 shadow-sm dark:bg-blue-950/60 dark:text-white"
              )}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function HomeIcon() {
  return <IconBase><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></IconBase>;
}

function BookIcon() {
  return <IconBase><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" /></IconBase>;
}

function CompassIcon() {
  return <IconBase><circle cx="12" cy="12" r="9" /><path d="m15 9-2 5-5 2 2-5 5-2z" /></IconBase>;
}

function CalendarIcon() {
  return <IconBase><path d="M8 2v4" /><path d="M16 2v4" /><rect height="18" rx="2" width="18" x="3" y="4" /><path d="M3 10h18" /></IconBase>;
}

function SparkIcon() {
  return <IconBase><path d="M12 3l1.4 4.4L18 9l-4.6 1.6L12 15l-1.4-4.4L6 9l4.6-1.6L12 3z" /><path d="M19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14z" /></IconBase>;
}

function SettingsIcon() {
  return <IconBase><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z" /><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2 3.4-.2-.1a1.8 1.8 0 0 0-2 .1 1.8 1.8 0 0 0-.9 1.7v.3H9.2v-.3a1.8 1.8 0 0 0-.9-1.7 1.8 1.8 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.5-1.1H3V10h.2a1.8 1.8 0 0 0 1.5-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1 2-3.4.2.1a1.8 1.8 0 0 0 2-.1 1.8 1.8 0 0 0 .9-1.7V1.5h5.6v.3a1.8 1.8 0 0 0 .9 1.7 1.8 1.8 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.5 1.1h.2v3.8H21a1.8 1.8 0 0 0-1.6 1.1z" /></IconBase>;
}

function MenuIcon() {
  return <IconBase><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></IconBase>;
}
