import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/ui/page-section";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TrainerMessagesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const messages = await prisma.chatMessage.findMany({
    where: { course: { trainerId: user.id } },
    include: { user: true, course: true },
    orderBy: { createdAt: "desc" },
    take: 12
  });

  return (
    <AppShell user={user} title="Messages" subtitle="Learner conversations" activeHref="/trainer/messages">
      <PageSection
        eyebrow="Support inbox"
        title="Review learner chatbot conversations"
        description="See recent course-related learner questions and AI bot replies from the database."
      />
      <section className="grid gap-3">
        {messages.map((message) => (
          <Card key={message.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-ink">{message.user.fullName}</p>
                <Badge>{message.sender.toLowerCase()}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink/55">{message.course?.title ?? "General support"}</p>
              <p className="mt-3 text-sm leading-6 text-ink/70">{message.message}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
