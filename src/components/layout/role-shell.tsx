import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";
import { LearnerShellFrame } from "@/components/layout/learner-sidebar";

export function RoleShell({
  user,
  label,
  title,
  activeHref,
  children
}: {
  user: { fullName: string; email: string };
  label: string;
  title: string;
  activeHref?: string;
  children: React.ReactNode;
}) {
  const showLearnerNav = label.toLowerCase().includes("learner");

  if (showLearnerNav) {
    return (
      <LearnerShellFrame user={user} label={label} title={title} activeHref={activeHref}>
        {children}
      </LearnerShellFrame>
    );
  }

  return (
    <main className="min-h-screen bg-cloud dark:bg-slate-950">
      <header className="border-b border-ink/10 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-bold uppercase tracking-[0.18em] text-moss">
              SkillPilot AI
            </Link>
            <p className="mt-2 text-sm text-ink/55 dark:text-slate-300">{label}</p>
            <h1 className="text-2xl font-bold text-ink dark:text-slate-100">{title}</h1>
          </div>
          <HeaderActions user={user} />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
    </main>
  );
}
