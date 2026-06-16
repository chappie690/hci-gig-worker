import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function TrainerRevenuePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const courses = await prisma.course.findMany({
    where: { trainerId: user.id },
    include: { payments: true, enrollments: true },
    orderBy: { createdAt: "desc" }
  });
  const totalRevenue = courses.reduce((sum, course) => sum + course.payments.filter((payment) => payment.status === "PAID").reduce((courseSum, payment) => courseSum + payment.amount, 0), 0);

  return (
    <AppShell user={user} title="Revenue" subtitle="Finance overview" activeHref="/trainer/revenue">
      <PageSection
        eyebrow="Revenue"
        title="Course revenue and enrollment performance"
        description="A focused finance page for reviewing paid revenue by course. For recommendations and risk monitoring, open the Payment Agent."
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Metric label="Total paid revenue" value={formatCurrency(totalRevenue)} />
        <Metric label="Courses" value={String(courses.length)} />
        <Metric label="Enrollments" value={String(courses.reduce((sum, course) => sum + course.enrollments.length, 0))} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by course</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {courses.map((course) => {
            const revenue = course.payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + payment.amount, 0);

            return (
              <div key={course.id} className="grid gap-3 rounded-lg border border-ink/10 p-4 md:grid-cols-[1fr_0.3fr_0.25fr] md:items-center">
                <div>
                  <p className="font-semibold text-ink">{course.title}</p>
                  <p className="mt-1 text-sm text-ink/55">{course.enrollments.length} enrolled learners</p>
                </div>
                <p className="font-bold text-ink">{formatCurrency(revenue)}</p>
                <Badge>{course.status.toLowerCase()}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="transition hover:-translate-y-1 hover:shadow-soft motion-reduce:hover:translate-y-0">
      <CardContent className="p-5">
        <p className="text-sm text-ink/55">{label}</p>
        <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}
