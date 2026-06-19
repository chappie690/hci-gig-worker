import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TrainerChatbotPanel } from "@/components/trainer/trainer-chatbot-panel";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TrainerAIChatbotPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "TRAINER") {
    redirect("/login");
  }

  const [courses, messages] = await Promise.all([
    prisma.course.findMany({
      where: { trainerId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true }
    }),
    prisma.chatMessage.findMany({
      where: { userId: user.id },
      include: { course: true },
      orderBy: { createdAt: "desc" },
      take: 40
    })
  ]);

  return (
    <AppShell user={user} title="Pilot Pete" subtitle="Trainer workspace" activeHref="/trainer/ai-chatbot">
      <TrainerChatbotPanel
        trainer={user}
        courses={courses}
        initialMessages={messages.map((message) => ({
          id: message.id,
          sender: message.sender,
          message: message.message,
          createdAt: message.createdAt.toISOString(),
          course: message.course ? { id: message.course.id, title: message.course.title } : null
        }))}
      />
    </AppShell>
  );
}
