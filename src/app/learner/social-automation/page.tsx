import { redirect } from "next/navigation";
import { LearnerSocialAutomation } from "@/components/learner/learner-social-automation";
import { RoleShell } from "@/components/layout/role-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LearnerSocialAutomationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LEARNER") {
    redirect("/login");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { learnerId: user.id },
    include: { course: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <RoleShell user={user} label="Learner workspace" title="Social Automation" activeHref="/learner/social-automation">
      <LearnerSocialAutomation
        learner={user}
        courses={enrollments.map((enrollment) => ({
          id: enrollment.course.id,
          title: enrollment.course.title
        }))}
      />
    </RoleShell>
  );
}
