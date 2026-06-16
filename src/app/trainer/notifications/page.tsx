import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TrainerNotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const tasks = await prisma.automationTask.findMany({
    where: { trainerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 12
  });

  return (
    <AppShell user={user} title="Notifications" subtitle="Automation alerts" activeHref="/trainer/notifications">
      <PageSection
        eyebrow="Trainer alerts"
        title="Automation and operations notifications"
        description="Trainer-facing alerts are represented by recent workflow tasks and status changes in this prototype."
      />
      <section className="grid gap-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-ink">{task.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/65">{task.description}</p>
              </div>
              <Badge>{task.status.toLowerCase()}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
