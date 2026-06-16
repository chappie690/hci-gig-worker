import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { calculateFinalAmount } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

type PaymentSuccessPageProps = {
  params: Promise<{ paymentId: string }>;
};

export default async function PaymentSuccessPage({ params }: PaymentSuccessPageProps) {
  const user = await getCurrentUser();
  const { paymentId } = await params;

  if (!user) {
    redirect("/login");
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      learnerId: user.id
    },
    include: {
      course: { include: { trainer: { include: { trainerProfile: true } } } },
      enrollment: true
    }
  });

  if (!payment) {
    notFound();
  }

  const totals = calculateFinalAmount(payment.course);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-lg border border-emerald-100 bg-white p-8 shadow-lg shadow-slate-200/50">
          <Badge className="bg-emerald-50 text-emerald-700">payment successful</Badge>
          <h1 className="mt-4 text-4xl font-bold text-slate-950">You are enrolled</h1>
          <p className="mt-3 text-slate-600">Your mock payment was processed locally and your enrollment was created.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <ReceiptRow label="Receipt number" value={payment.receiptNumber} />
            <ReceiptRow label="Course enrolled" value={payment.course.title} />
            <ReceiptRow label="Original price" value={formatCurrency(totals.originalAmount)} />
            <ReceiptRow label={totals.discount.label} value={`-${formatCurrency(Math.max(0, totals.originalAmount - payment.amount))}`} />
            <ReceiptRow label="Final paid price" value={formatCurrency(payment.amount)} />
            <ReceiptRow label="Payment method" value={payment.paymentMethod} />
          </div>

          <div className="mt-8 rounded-lg bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <ProfileLogo
                user={{
                  fullName: payment.course.trainer.trainerProfile?.brandName ?? payment.course.trainer.fullName,
                  email: payment.course.trainer.email
                }}
                className="h-14 w-14"
                label={`${payment.course.trainer.trainerProfile?.brandName ?? payment.course.trainer.fullName} course provider logo`}
              />
              <p className="text-sm font-semibold text-slate-950">{payment.course.trainer.trainerProfile?.brandName ?? payment.course.trainer.fullName}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Open your learner dashboard to track course progress, upcoming sessions, notifications, and AI chatbot support.</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/learner/dashboard">Go to learner dashboard</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/learner/courses/${payment.courseId}`}>Open course</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-950">{value}</p>
    </div>
  );
}
