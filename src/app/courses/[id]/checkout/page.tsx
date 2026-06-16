import Link from "next/link";
import { redirect } from "next/navigation";
import { HeaderActions } from "@/components/layout/header-actions";
import { CheckoutForm } from "@/components/payments/checkout-form";
import { getCurrentUser } from "@/lib/auth";
import { calculateFinalAmount } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

type CheckoutPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect(`/login?next=/courses/${id}/checkout`);
  }

  if (user.role !== "LEARNER") {
    redirect("/trainer/dashboard");
  }

  const course = await prisma.course.findFirst({
    where: { id, status: "PUBLISHED" },
    include: {
      enrollments: true,
      trainer: { include: { trainerProfile: true } }
    }
  });

  if (!course) {
    redirect("/courses");
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      learnerId_courseId: {
        learnerId: user.id,
        courseId: course.id
      }
    }
  });
  const totals = calculateFinalAmount(course);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/courses" className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
            SkillPilot AI
          </Link>
          <Link href={`/courses/${course.id}`} className="text-sm font-semibold text-slate-600 hover:text-slate-950">
            Back to course
          </Link>
          <HeaderActions user={user} showSearch={false} showLogout={false} />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {existingEnrollment ? (
          <section className="rounded-lg border border-blue-100 bg-white p-8 shadow-lg shadow-slate-200/50">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Already enrolled</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-950">You already have access to {course.title}</h1>
            <p className="mt-3 text-slate-600">SkillPilot prevented a duplicate enrollment and no new payment was created.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white" href="/learner/dashboard">
                Go to learner dashboard
              </Link>
              <Link className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950" href="/courses">
                Browse courses
              </Link>
            </div>
          </section>
        ) : (
          <CheckoutForm
            course={{
              id: course.id,
              title: course.title,
              trainerName: course.trainer.trainerProfile?.brandName ?? course.trainer.fullName,
              trainerEmail: course.trainer.email,
              originalAmount: totals.originalAmount,
              discountLabel: totals.discount.label,
              discountAmount: totals.discount.amount,
              finalAmount: totals.finalAmount
            }}
          />
        )}
      </div>
    </main>
  );
}
