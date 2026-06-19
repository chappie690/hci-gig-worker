import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";
import { TrainerSidebar } from "@/components/layout/trainer-sidebar";

export function AppShell({
  user,
  title = "Dashboard",
  subtitle = "Trainer workspace",
  activeHref = "/trainer/dashboard",
  children
}: {
  user: { fullName: string; email: string; role?: string };
  title?: string;
  subtitle?: string;
  activeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-cloud dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col overflow-hidden border-r border-ink/10 bg-white px-5 py-6 dark:border-slate-700 dark:bg-slate-950 lg:flex">
        <Link href="/" className="block shrink-0 rounded-lg text-sm font-bold uppercase tracking-[0.18em] text-moss focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
          SkillPilot AI
        </Link>
        <TrainerSidebar user={user} activeHref={activeHref} className="mt-6 min-h-0 flex-1" />
      </aside>
      <section className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-ink/10 bg-cloud/95 px-6 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-ink/55 dark:text-slate-300">{subtitle}</p>
              <h1 className="text-2xl font-bold text-ink dark:text-slate-100">{title}</h1>
            </div>
            <HeaderActions user={user} showLogout={false} showProfile={false} />
          </div>
          <TrainerSidebar user={user} activeHref={activeHref} className="mx-auto mt-4 max-w-7xl lg:hidden" />
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
      </section>
    </main>
  );
}
