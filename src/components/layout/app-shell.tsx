import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";
import { TrainerSidebar } from "@/components/layout/trainer-sidebar";
import { ProfileIdentity } from "@/components/profile/profile-logo";

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
    <main className="min-h-screen bg-cloud dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto border-r border-ink/10 bg-white px-5 py-6 dark:border-slate-700 dark:bg-slate-950 lg:block">
        <Link href="/" className="block text-sm font-bold uppercase tracking-[0.18em] text-moss">
          SkillPilot AI
        </Link>
        <div className="mt-5 rounded-lg border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-900">
          <ProfileIdentity user={user} logoClassName="h-12 w-12" />
        </div>
        <TrainerSidebar activeHref={activeHref} className="mt-6" />
      </aside>
      <section className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-ink/10 bg-cloud/95 px-6 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink/55 dark:text-slate-300">{subtitle}</p>
              <h1 className="text-2xl font-bold text-ink dark:text-slate-100">{title}</h1>
            </div>
            <HeaderActions user={user} />
          </div>
          <TrainerSidebar activeHref={activeHref} className="mx-auto mt-4 max-h-[48vh] max-w-7xl overflow-y-auto lg:hidden" />
        </header>
        <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
      </section>
    </main>
  );
}
