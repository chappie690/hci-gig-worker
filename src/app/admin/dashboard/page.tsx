import { redirect } from "next/navigation";
import { AdminDashboardManager } from "@/components/admin/admin-dashboard-manager";
import { RoleShell } from "@/components/layout/role-shell";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [users, courses, payments, enrollments] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.course.findMany({ include: { trainer: true, enrollments: true }, orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ include: { learner: true, course: true }, orderBy: { createdAt: "desc" } }),
    prisma.enrollment.findMany({ include: { learner: true, course: true, payment: true }, orderBy: { createdAt: "desc" } })
  ]);

  const revenue = payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <RoleShell user={user} label="Admin console" title="Platform operations dashboard">
      <section className="mb-6 border-b border-ink/10 pb-5 dark:border-slate-700">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Admin dashboard</p>
        <h2 className="mt-1 text-2xl font-bold text-ink dark:text-slate-100">Govern users, courses, payments, and enrollments</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-slate-300">
          All tables below are loaded from Prisma. Delete actions use confirmation prompts and payment/enrollment details open in safe read-only modals.
        </p>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-5">
        <Metric label="Users" value={users.length} />
        <Metric label="Trainers" value={users.filter((account) => account.role === "TRAINER").length} />
        <Metric label="Learners" value={users.filter((account) => account.role === "LEARNER").length} />
        <Metric label="Courses" value={courses.length} />
        <Metric label="Revenue" value={formatCurrency(revenue)} />
      </section>

      <AdminDashboardManager
        users={users.map((account) => ({
          id: account.id,
          fullName: account.fullName,
          email: account.email,
          role: account.role,
          createdAt: account.createdAt.toISOString()
        }))}
        courses={courses.map((course) => ({
          id: course.id,
          title: course.title,
          trainerName: course.trainer.fullName,
          category: course.category,
          level: course.level,
          status: course.status,
          price: course.price,
          enrollments: course.enrollments.length
        }))}
        payments={payments.map((payment) => ({
          id: payment.id,
          learnerName: payment.learner.fullName,
          courseTitle: payment.course.title,
          amount: payment.amount,
          status: payment.status,
          receiptNumber: payment.receiptNumber,
          paymentMethod: payment.paymentMethod,
          createdAt: payment.createdAt.toISOString()
        }))}
        enrollments={enrollments.map((enrollment) => ({
          id: enrollment.id,
          learnerName: enrollment.learner.fullName,
          courseTitle: enrollment.course.title,
          paymentReceipt: enrollment.payment.receiptNumber,
          progress: enrollment.progress,
          status: enrollment.status,
          createdAt: enrollment.createdAt.toISOString()
        }))}
      />
    </RoleShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="dark:border-slate-700 dark:bg-slate-900">
      <CardContent className="p-5">
        <p className="text-sm text-ink/55 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-bold text-ink dark:text-slate-100">{value}</p>
      </CardContent>
    </Card>
  );
}
