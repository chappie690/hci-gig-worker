import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AutomationManager } from "@/components/trainer/automation-manager";
import { AutomationWorkflowBuilder } from "@/components/trainer/automation-workflow-builder";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AutomationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const tasks = await prisma.automationTask.findMany({
    where: { trainerId: user.id },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }]
  });

  const serializedTasks = tasks.map((task) => ({
    id: task.id,
    type: task.type,
    title: task.title,
    description: task.description,
    status: task.status,
    scheduledAt: task.scheduledAt.toISOString(),
    createdAt: task.createdAt.toISOString()
  }));

  return (
    <AppShell user={user} title="Automation" subtitle="AI workflow operations" activeHref="/trainer/automation">
      <PageSection
        eyebrow="AI Automation Workflow"
        title="Control every trainer automation from one board"
        description="Create, edit, schedule, and monitor workflow tasks for course publishing, social posts, email reminders, chatbot replies, and session reminders."
      />

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <Metric label="Total tasks" value={String(tasks.length)} />
        <Metric label="Pending" value={String(tasks.filter((task) => task.status === "PENDING").length)} />
        <Metric label="Running" value={String(tasks.filter((task) => task.status === "RUNNING").length)} />
        <Metric label="Completed" value={String(tasks.filter((task) => task.status === "COMPLETED").length)} />
      </section>

      <AutomationWorkflowBuilder />

      <AutomationManager initialTasks={serializedTasks} />
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-ink/55">{label}</p>
        <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}
