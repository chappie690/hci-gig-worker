import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { calculateFinalAmount } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

type CoursesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CourseMarketplacePage({ searchParams }: CoursesPageProps) {
  const params = (await searchParams) ?? {};
  const search = getParam(params.q);
  const category = getParam(params.category);
  const level = getParam(params.level);

  const [categories, levels, courses] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true }
    }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      distinct: ["level"],
      orderBy: { level: "asc" },
      select: { level: true }
    }),
    prisma.course.findMany({
      where: {
        status: "PUBLISHED",
        ...(search ? { title: { contains: search } } : {}),
        ...(category ? { category } : {}),
        ...(level ? { level } : {})
      },
      include: {
        trainer: {
          include: { trainerProfile: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <PublicHeader />

      <section className="border-b border-white/10 bg-[linear-gradient(135deg,#0f172a,#1e3a8a_42%,#6d28d9)]">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-100">Course marketplace</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">Learn practical AI skills from working trainers.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50/80">
            Browse short, applied AI courses for productivity, marketing, payment workflows, support automation, and team enablement.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <form className="grid gap-3 rounded-lg border border-white/10 bg-white p-4 text-slate-900 shadow-2xl md:grid-cols-[1fr_0.45fr_0.35fr_auto]" action="/courses">
          <label className="grid gap-2 text-sm font-semibold">
            Search
            <input
              className="min-h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              name="q"
              placeholder="Search by course title"
              defaultValue={search}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Category
            <select className="min-h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" name="category" defaultValue={category}>
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.category} value={item.category}>
                  {item.category}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Level
            <select className="min-h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" name="level" defaultValue={level}>
              <option value="">All levels</option>
              {levels.map((item) => (
                <option key={item.level} value={item.level}>
                  {item.level}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button className="min-h-11 w-full rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700" type="submit">
              Apply
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-white/70">{courses.length} published course{courses.length === 1 ? "" : "s"}</p>
          <Link className="text-sm font-semibold text-blue-200 hover:text-white" href="/courses">
            Reset filters
          </Link>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          {courses.map((course) => {
            const totals = calculateFinalAmount(course);
            const hasDiscount = totals.discount.amount > 0;

            return (
            <Card key={course.id} className="overflow-hidden border-white/10 bg-white text-slate-950 shadow-xl shadow-slate-950/20 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-950/30 motion-reduce:hover:translate-y-0">
              <div className="h-36 bg-[linear-gradient(135deg,#1d4ed8,#7c3aed_55%,#f8fafc)] p-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-800">{course.category}</span>
                  {hasDiscount ? <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{totals.discount.label}</span> : null}
                </div>
              </div>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-start gap-3">
                      <ProfileLogo
                        user={{ fullName: course.trainer.trainerProfile?.brandName ?? course.trainer.fullName, email: course.trainer.email }}
                        className="h-11 w-11"
                        label={`${course.trainer.trainerProfile?.brandName ?? course.trainer.fullName} course provider logo`}
                      />
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">{course.title}</h2>
                        <p className="mt-1 text-sm text-slate-500">{course.trainer.trainerProfile?.brandName ?? course.trainer.fullName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {hasDiscount ? <p className="text-xs font-bold text-slate-400 line-through">{formatCurrency(totals.originalAmount)}</p> : null}
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(totals.finalAmount)}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{course.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{course.level}</span>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">{course.duration}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{course.category}</span>
                </div>
                <Button asChild className="mt-5 w-full">
                  <Link href={`/courses/${course.id}`}>View details</Link>
                </Button>
              </CardContent>
            </Card>
            );
          })}
        </section>
      </section>
    </main>
  );
}

function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function PublicHeader() {
  return (
    <header className="border-b border-white/10 bg-slate-950/95 px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link href="/" className="text-sm font-bold uppercase tracking-[0.18em] text-white">
          SkillPilot AI
        </Link>
        <nav className="flex items-center gap-3 text-sm font-semibold">
          <Link className="text-white/70 hover:text-white" href="/courses">
            Courses
          </Link>
          <Link className="text-white/70 hover:text-white" href="/login">
            Login
          </Link>
          <Link className="rounded-lg bg-white px-3 py-2 text-slate-950" href="/register">
            Register
          </Link>
          <HeaderActions showSearch={false} showLogout={false} />
        </nav>
      </div>
    </header>
  );
}
