import { redirect } from "next/navigation";
import { ChatbotPanel } from "@/components/learner/chatbot-panel";
import { RoleShell } from "@/components/layout/role-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LearnerChatbotPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [enrollments, messages] = await Promise.all([
    prisma.enrollment.findMany({
      where: { learnerId: user.id },
      include: { course: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.chatMessage.findMany({
      where: { userId: user.id },
      include: { course: true },
      orderBy: { createdAt: "desc" },
      take: 40
    })
  ]);

  const courses = enrollments.map((enrollment) => ({
    id: enrollment.course.id,
    title: enrollment.course.title
  }));

  return (
    <RoleShell user={user} label="Learner workspace" title="AI Chatbot" activeHref="/learner/chatbot">
      <ChatbotPanel
        learner={user}
        courses={courses}
        initialMessages={messages.map((message) => ({
          id: message.id,
          sender: message.sender,
          message: message.message,
          createdAt: message.createdAt.toISOString(),
          course: message.course ? { id: message.course.id, title: message.course.title } : null
        }))}
      />
    </RoleShell>
  );
}
