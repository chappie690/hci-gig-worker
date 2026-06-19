import Link from "next/link";
import { notFound } from "next/navigation";
import { HeaderActions } from "@/components/layout/header-actions";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { calculateFinalAmount } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

type CourseDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseDetailsPage({ params }: CourseDetailsPageProps) {
  const { id } = await params;
  const [course, user] = await Promise.all([
    prisma.course.findFirst({
      where: { id, status: "PUBLISHED" },
      include: {
        trainer: {
          include: { trainerProfile: true }
        },
        enrollments: true,
        trainingSessions: {
          orderBy: { startTime: "asc" },
          take: 3
        }
      },
    }),
    getCurrentUser()
  ]);

  if (!course) {
    notFound();
  }

  const chatbotHref = user?.role === "LEARNER" ? "/learner/chatbot" : user ? `/${user.role.toLowerCase()}/dashboard` : "/login";
  const totals = calculateFinalAmount(course);
  const hasDiscount = totals.discount.amount > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <PublicHeader />

      <section className="border-b border-white/10 bg-[linear-gradient(135deg,#0f172a,#1e3a8a_46%,#6d28d9)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1fr_0.42fr] lg:items-start">
          <div>
            <Link className="text-sm font-semibold text-blue-100 hover:text-white" href="/courses">
              Back to marketplace
            </Link>
            <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-blue-100">{course.category}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">{course.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-50/80">{course.description}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
              <span className="rounded-full bg-white/15 px-4 py-2">{course.level}</span>
            <span className="rounded-full bg-white/15 px-4 py-2">{course.duration}</span>
            <span className="rounded-full bg-white/15 px-4 py-2">{course.enrollments.length} learners enrolled</span>
            {hasDiscount ? <span className="rounded-full bg-emerald-400/20 px-4 py-2 text-emerald-100">{totals.discount.label}</span> : null}
          </div>
          </div>

          <aside className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-2xl">
            <p className="text-sm font-semibold text-slate-500">Course price</p>
            {hasDiscount ? <p className="mt-2 text-sm font-bold text-slate-400 line-through">{formatCurrency(totals.originalAmount)}</p> : null}
            <p className="mt-1 text-4xl font-bold text-slate-950">{formatCurrency(totals.finalAmount)}</p>
            {hasDiscount ? <p className="mt-2 text-sm font-bold text-emerald-700">{totals.discount.label}: save {formatCurrency(totals.discount.amount)}</p> : null}
            <div className="mt-5 grid gap-3">
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link href={`/courses/${course.id}/checkout`}>Enroll / Pay</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={chatbotHref}>Ask Pilot Pete</Link>
              </Button>
            </div>
            <div className="mt-5 rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Includes</p>
              <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                <li>Short applied lessons</li>
                <li>Trainer-led session support</li>
                <li>Pilot Pete course guidance</li>
                <li>Payment receipt tracking</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[0.75fr_0.45fr]">
        <article className="rounded-lg border border-white/10 bg-white p-6 text-slate-950">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Course overview</p>
          <h2 className="mt-3 text-2xl font-bold">What you will build</h2>
          <p className="mt-4 leading-7 text-slate-600">{course.description}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Info label="Category" value={course.category} />
            <Info label="Level" value={course.level} />
            <Info label="Duration" value={course.duration} />
          </div>
        </article>

        <aside className="rounded-lg border border-white/10 bg-white p-6 text-slate-950">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-700">Trainer</p>
          <div className="mt-3 flex items-center gap-3">
            <ProfileLogo
              user={{ fullName: course.trainer.trainerProfile?.brandName ?? course.trainer.fullName, email: course.trainer.email }}
              className="h-14 w-14"
              label={`${course.trainer.trainerProfile?.brandName ?? course.trainer.fullName} course provider logo`}
            />
            <h2 className="text-2xl font-bold">{course.trainer.trainerProfile?.brandName ?? course.trainer.fullName}</h2>
          </div>
          <p className="mt-2 font-semibold text-slate-600">{course.trainer.trainerProfile?.tagline}</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">{course.trainer.trainerProfile?.bio}</p>
        </aside>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-950">{value}</p>
    </div>
  );
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
