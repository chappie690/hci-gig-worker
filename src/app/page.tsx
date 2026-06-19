import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";
import { AnimatedCard } from "@/components/ui/animated-card";
import { CelebrationButton } from "@/components/ui/celebration-button";
import { DynamicGreeting } from "@/components/ui/dynamic-greeting";
import { GhostButton } from "@/components/ui/ghost-button";
import { GlowButton } from "@/components/ui/glow-button";
import { MetricCard } from "@/components/ui/metric-card";
import { getCurrentUser, getRoleDashboardPath } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { stockCourses } from "@/lib/stock-courses";

const features = [
  {
    title: "AI Branding",
    description: "Shape a trainer profile, brand voice, portfolio summary, and logo prompt that makes your expertise easier to trust."
  },
  {
    title: "AI Marketing Automation",
    description: "Generate campaign drafts, schedule social posts, and keep course launches moving without rebuilding your content system."
  },
  {
    title: "AI Payment Agent",
    description: "Spot pending payments, draft follow-up messages, and protect your training revenue with practical AI guidance."
  },
  {
    title: "Smart Scheduling",
    description: "Coordinate live sessions, reminders, learner progress, and meeting links from one trainer-friendly calendar."
  }
];

const sampleCourses = [
  { title: "PromptOps Sprint", learners: 18, revenue: "$2.7k", href: "/courses/seed-course-promptops" },
  { title: "AI Agent Ops", learners: 25, revenue: "$4.1k", href: "/courses/seed-course-agentops" },
  { title: "Payment Agent Blueprint", learners: 32, revenue: "$1.6k", href: "/courses/seed-course-payment-agent" }
];

const homepageCourses = stockCourses.slice(0, 12);

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <PublicHeader user={user} />

      <section className="relative border-b border-white/10 bg-[linear-gradient(135deg,#0f172a,#1e3a8a_48%,#6d28d9)]">
        <div aria-hidden="true" className="skillpilot-glow-pulse absolute left-[-120px] top-20 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div aria-hidden="true" className="skillpilot-glow-pulse absolute bottom-10 right-[-90px] h-80 w-80 rounded-full bg-fuchsia-300/20 blur-3xl" />

        <div className="relative mx-auto grid min-h-[720px] max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">SkillPilot AI</p>
            <DynamicGreeting className="mt-4 max-w-2xl rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50 backdrop-blur" />
            <h1 className="mt-5 max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
              The AI business cockpit for trainers and course creators.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-50/80">
              Build your personal brand, publish AI micro-courses, manage learners, automate marketing, schedule live training, and keep payments moving with an AI Payment Agent.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <CelebrationButton href="/register" intensity="milestone" ariaLabel="Register as a trainer">
                Register as Trainer
              </CelebrationButton>
              <GlowButton href="/courses" ariaLabel="Browse SkillPilot courses">
                Browse Courses
              </GlowButton>
              <GhostButton href="/login" ariaLabel="Login to SkillPilot AI">
                Login
              </GhostButton>
            </div>

            <form className="mt-8 grid gap-3 rounded-2xl border border-white/15 bg-white/12 p-3 shadow-2xl shadow-slate-950/20 backdrop-blur md:grid-cols-[1fr_auto]" action="/courses">
              <label className="sr-only" htmlFor="home-course-search">
                Search AI courses
              </label>
              <input
                id="home-course-search"
                className="min-h-12 rounded-xl border border-white/20 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                name="q"
                placeholder="Search PromptOps, payment agents, marketing AI..."
              />
              <button
                className="min-h-12 rounded-xl bg-white px-5 text-sm font-extrabold text-blue-800 shadow-lg shadow-blue-950/20 transition duration-200 hover:scale-[1.02] hover:bg-cyan-100 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 motion-reduce:hover:scale-100"
                type="submit"
              >
                Search courses
              </button>
            </form>
            <p className="mt-3 text-sm text-blue-50/70" aria-live="polite">
              Brewing some AI coffee while you explore trainer-ready courses.
            </p>
          </div>

          <div className="skillpilot-float rounded-3xl border border-white/15 bg-white/10 p-4 shadow-[0_28px_90px_rgba(15,23,42,0.42)] backdrop-blur motion-reduce:transform-none">
            <AnimatedCard className="bg-white p-5 text-slate-950">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Trainer revenue</p>
                  <p className="mt-1 text-4xl font-black">$8,420</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">+18%</span>
              </div>

              <div className="mt-5 grid gap-3">
                {sampleCourses.map((course, index) => (
                  <Link
                    key={course.title}
                    className="group grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 motion-reduce:hover:translate-y-0"
                    href={course.href}
                  >
                    <div>
                      <p className="font-semibold text-slate-950">{course.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{course.learners} active learners</p>
                    </div>
                    <div className="grid justify-items-end gap-2">
                      <p className="text-sm font-black text-blue-700">{course.revenue}</p>
                      <div
                        aria-hidden="true"
                        className="h-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#7c3aed)] transition-all duration-300 group-hover:w-24"
                        style={{ width: `${72 + index * 8}px` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MetricCard label="Paid" value="$6.9k" detail="This month" />
                <MetricCard label="Pending" value="$1.5k" detail="Follow ups" />
                <MetricCard label="Sessions" value="12" detail="Scheduled" />
              </div>
            </AnimatedCard>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-200">Browse courses</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Stocked with practical AI skills for trainers, learners, and gig workers.</h2>
            <p className="mt-3 text-sm leading-6 text-blue-50/75">
              Explore sample courses across automation, branding, marketing, prompt engineering, analytics, content creation, cybersecurity basics, and productivity.
            </p>
          </div>
          <GlowButton href="/courses" ariaLabel="Open the full course marketplace">
            Open Marketplace
          </GlowButton>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {homepageCourses.map((course) => (
            <Link
              key={course.id}
              href="/courses"
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white text-slate-950 shadow-xl shadow-slate-950/20 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-950/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 motion-reduce:hover:translate-y-0"
            >
              <div className="h-28 p-4" style={{ background: course.thumbnail }}>
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm">
                  {course.category}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-950">{course.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{course.trainerName}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">{formatCurrency(course.price)}</span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{course.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">{course.level}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{course.duration}</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{course.rating} rating</span>
                </div>
                <span className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition group-hover:scale-[1.02] group-hover:bg-blue-700 group-active:scale-[0.99] motion-reduce:group-hover:scale-100">
                  Browse course
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-200">Platform features</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">Everything a modern AI trainer needs to operate professionally.</h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <AnimatedCard key={feature.title} as="article" className="p-5 text-slate-950">
              <div aria-hidden="true" className="mb-5 h-11 w-11 rounded-2xl bg-[linear-gradient(135deg,#2563eb,#7c3aed)] shadow-lg shadow-blue-200" />
              <h3 className="text-lg font-bold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
            </AnimatedCard>
          ))}
        </div>
      </section>
    </main>
  );
}

function PublicHeader({ user }: { user: Awaited<ReturnType<typeof getCurrentUser>> }) {
  const dashboardHref = user ? getRoleDashboardPath(user.role) : undefined;

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-lg text-sm font-bold uppercase tracking-[0.18em] text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
        >
          SkillPilot AI
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold" aria-label="Public navigation">
          <Link className="rounded-lg px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30" href="/courses">
            Courses
          </Link>
          {user ? (
            <HeaderActions user={user} dashboardHref={dashboardHref} showSearch={false} showLogout={false} />
          ) : (
            <>
              <Link className="rounded-lg px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30" href="/login">
                Login
              </Link>
              <Link className="rounded-lg bg-white px-3 py-2 text-slate-950 transition hover:scale-[1.02] hover:bg-cyan-100 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:hover:scale-100" href="/register">
                Register
              </Link>
              <HeaderActions showSearch={false} showLogout={false} />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
