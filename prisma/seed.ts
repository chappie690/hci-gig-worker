import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const password = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  await resetDatabase();

  const admin = await prisma.user.create({
    data: {
      id: "seed-admin",
      fullName: "Avery Stone",
      email: "admin@skillpilot.ai",
      passwordHash,
      role: "ADMIN"
    }
  });

  const trainerOne = await prisma.user.create({
    data: {
      id: "seed-trainer-maya",
      fullName: "Maya Chen",
      email: "trainer@skillpilot.ai",
      passwordHash,
      role: "TRAINER"
    }
  });

  const trainerTwo = await prisma.user.create({
    data: {
      id: "seed-trainer-eli",
      fullName: "Eli Morgan",
      email: "eli@skillpilot.ai",
      passwordHash,
      role: "TRAINER"
    }
  });

  const learners = await Promise.all(
    [
      ["seed-learner-primary", "Lena Ortiz", "learner@skillpilot.ai"],
      ["seed-learner-amelia", "Amelia Grant", "amelia@example.com"],
      ["seed-learner-sofia", "Sofia Patel", "sofia@example.com"],
      ["seed-learner-jonah", "Jonah Brooks", "jonah@example.com"]
    ].map(([id, fullName, email]) =>
      prisma.user.create({
        data: {
          id,
          fullName,
          email,
          passwordHash,
          role: "LEARNER"
        }
      })
    )
  );

  await prisma.trainerProfile.createMany({
    data: [
      {
        id: "seed-profile-maya",
        userId: trainerOne.id,
        brandName: "Maya AI Studio",
        tagline: "Practical AI systems for non-technical teams",
        bio: "Maya helps small business teams adopt AI safely through focused, hands-on training sprints.",
        skills: "Prompt systems, AI operations, workflow automation, learner coaching",
        portfolioSummary: "Built AI onboarding programs, prompt libraries, internal automation playbooks, and payment follow-up systems for service teams.",
        logoPrompt: "A clean compass mark with a subtle neural path, moss green and warm apricot accents.",
        socialLinks: JSON.stringify({
          linkedin: "https://linkedin.com/in/maya-ai-studio",
          website: "https://skillpilot.ai/maya",
          instagram: "https://instagram.com/maya-ai-studio"
        })
      },
      {
        id: "seed-profile-eli",
        userId: trainerTwo.id,
        brandName: "Eli Morgan AI Labs",
        tagline: "Agent workflows for support and operations teams",
        bio: "Eli trains support leaders to design AI agents, escalation rules, QA loops, and reliable team adoption rituals.",
        skills: "AI agents, customer support automation, analytics, team enablement",
        portfolioSummary: "Delivered agent operations workshops for SaaS support teams, agencies, and service businesses.",
        logoPrompt: "A sharp monogram with signal lines and a structured grid, deep ink and electric green details.",
        socialLinks: JSON.stringify({
          linkedin: "https://linkedin.com/in/eli-ai-labs",
          website: "https://skillpilot.ai/eli",
          email: "eli@skillpilot.ai"
        })
      }
    ]
  });

  const courses = await Promise.all(
    [
      ["seed-course-promptops", trainerOne.id, "PromptOps Sprint", "A 5-day micro-course for building reusable prompt workflows across daily business tasks.", "AI Productivity", "Beginner", 149, "5 days", "/course-thumbnails/promptops-sprint.png", "PUBLISHED"],
      ["seed-course-content-lab", trainerOne.id, "AI Marketing Content Lab", "Create a campaign workflow for captions, ads, emails, and portfolio updates without losing brand voice.", "Marketing", "Beginner", 199, "7 days", "/course-thumbnails/content-lab.png", "PUBLISHED"],
      ["seed-course-payment-agent", trainerOne.id, "AI Payment Agent Blueprint", "Design payment reminders, receipt workflows, and risk flags for freelance training businesses.", "Business Automation", "Intermediate", 179, "4 days", "/course-thumbnails/payment-agent.png", "PUBLISHED"],
      ["seed-course-agentops", trainerTwo.id, "AI Agent Ops for Service Teams", "Design intake bots, escalation rules, and quality checks for customer-facing teams.", "Automation", "Intermediate", 249, "2 weeks", "/course-thumbnails/agentops.png", "PUBLISHED"],
      ["seed-course-support-analytics", trainerTwo.id, "Support Analytics with AI", "Use AI to summarize customer themes, quality issues, and weekly support performance signals.", "Analytics", "Intermediate", 229, "10 days", "/course-thumbnails/support-analytics.png", "PUBLISHED"],
      ["seed-course-ai-onboarding", trainerOne.id, "AI Team Onboarding Kit", "A draft course for onboarding teams into safe AI practices and shared prompt standards.", "Enablement", "Beginner", 129, "3 days", "/course-thumbnails/onboarding-kit.png", "DRAFT"],
      ["seed-course-agent-audit", trainerTwo.id, "Agent Audit Workshop", "A draft workshop for reviewing chatbot quality, escalation behavior, and compliance readiness.", "Automation", "Advanced", 299, "1 week", "/course-thumbnails/agent-audit.png", "DRAFT"],
      ["seed-course-portfolio-builder", trainerOne.id, "AI Trainer Portfolio Builder", "A draft course for turning gig work into a clear trainer portfolio and service catalog.", "Branding", "Beginner", 159, "6 days", "/course-thumbnails/portfolio-builder.png", "DRAFT"]
    ].map(([id, trainerId, title, description, category, level, price, duration, thumbnailUrl, status]) =>
      prisma.course.create({
        data: {
          id: String(id),
          trainerId: String(trainerId),
          title: String(title),
          description: String(description),
          category: String(category),
          level: String(level),
          price: Number(price),
          duration: String(duration),
          thumbnailUrl: String(thumbnailUrl),
          status: String(status)
        }
      })
    )
  );

  const payments = await Promise.all(
    [
      ["seed-payment-1001", learners[0].id, "seed-course-promptops", 149, "PAID", "SP-1001", "Card"],
      ["seed-payment-1002", learners[1].id, "seed-course-content-lab", 199, "PAID", "SP-1002", "Stripe"],
      ["seed-payment-1003", learners[2].id, "seed-course-agentops", 249, "PENDING", "SP-1003", "Bank Transfer"],
      ["seed-payment-1004", learners[3].id, "seed-course-support-analytics", 229, "FAILED", "SP-1004", "Card"],
      ["seed-payment-1005", learners[0].id, "seed-course-payment-agent", 179, "PENDING", "SP-1005", "Bank Transfer"],
      ["seed-payment-1006", learners[1].id, "seed-course-agentops", 249, "PAID", "SP-1006", "Card"],
      ["seed-payment-1007", learners[2].id, "seed-course-promptops", 149, "FAILED", "SP-1007", "Stripe"]
    ].map(([id, learnerId, courseId, amount, status, receiptNumber, paymentMethod]) =>
      prisma.payment.create({
        data: {
          id: String(id),
          learnerId: String(learnerId),
          courseId: String(courseId),
          amount: Number(amount),
          status: String(status),
          receiptNumber: String(receiptNumber),
          paymentMethod: String(paymentMethod)
        }
      })
    )
  );

  await prisma.enrollment.createMany({
    data: [
      {
        id: "seed-enrollment-1001",
        learnerId: learners[0].id,
        courseId: "seed-course-promptops",
        paymentId: payments[0].id,
        progress: 78,
        status: "ACTIVE"
      },
      {
        id: "seed-enrollment-1002",
        learnerId: learners[1].id,
        courseId: "seed-course-content-lab",
        paymentId: payments[1].id,
        progress: 100,
        status: "COMPLETED"
      },
      {
        id: "seed-enrollment-1003",
        learnerId: learners[2].id,
        courseId: "seed-course-agentops",
        paymentId: payments[2].id,
        progress: 34,
        status: "ACTIVE"
      },
      {
        id: "seed-enrollment-1004",
        learnerId: learners[3].id,
        courseId: "seed-course-support-analytics",
        paymentId: payments[3].id,
        progress: 12,
        status: "CANCELLED"
      },
      {
        id: "seed-enrollment-1005",
        learnerId: learners[0].id,
        courseId: "seed-course-payment-agent",
        paymentId: payments[4].id,
        progress: 42,
        status: "ACTIVE"
      },
      {
        id: "seed-enrollment-1006",
        learnerId: learners[1].id,
        courseId: "seed-course-agentops",
        paymentId: payments[5].id,
        progress: 61,
        status: "ACTIVE"
      },
      {
        id: "seed-enrollment-1007",
        learnerId: learners[2].id,
        courseId: "seed-course-promptops",
        paymentId: payments[6].id,
        progress: 0,
        status: "CANCELLED"
      }
    ]
  });

  await prisma.marketingContent.createMany({
    data: [
      {
        id: "seed-content-1001",
        trainerId: trainerOne.id,
        courseId: "seed-course-promptops",
        type: "AD",
        prompt: "Promote a practical AI workflow course for operations teams.",
        generatedText: "Turn scattered AI experiments into reusable team workflows in five focused days.",
        platform: "LINKEDIN",
        status: "POSTED"
      },
      {
        id: "seed-content-1002",
        trainerId: trainerOne.id,
        courseId: "seed-course-content-lab",
        type: "CAPTION",
        prompt: "Write a punchy carousel caption for AI marketing beginners.",
        generatedText: "Your first AI content system should not start with prompts. It should start with reusable campaign decisions.",
        platform: "INSTAGRAM",
        status: "SCHEDULED",
        scheduledAt: hoursFromNow(30)
      },
      {
        id: "seed-content-1003",
        trainerId: trainerTwo.id,
        courseId: "seed-course-agentops",
        type: "AD",
        prompt: "Draft a warm email for service leaders curious about agent ops.",
        generatedText: "Your support team does not need another chatbot experiment. It needs an operating model for AI-assisted replies.",
        platform: "EMAIL",
        status: "DRAFT"
      },
      {
        id: "seed-content-1004",
        trainerId: trainerTwo.id,
        courseId: null,
        type: "BIO",
        prompt: "Refresh Eli's LinkedIn bio for consulting leads.",
        generatedText: "I help support teams move from AI experiments to reliable agent workflows, escalation rules, and QA loops.",
        platform: "LINKEDIN",
        status: "DRAFT"
      },
      {
        id: "seed-content-1005",
        trainerId: trainerOne.id,
        courseId: "seed-course-payment-agent",
        type: "TAGLINE",
        prompt: "Create a short tagline for the payment agent course.",
        generatedText: "Protect your trainer revenue with AI-assisted follow-up workflows.",
        platform: "FACEBOOK",
        status: "SCHEDULED",
        scheduledAt: hoursFromNow(54)
      }
    ]
  });

  await prisma.automationTask.createMany({
    data: [
      {
        id: "seed-task-1001",
        trainerId: trainerOne.id,
        type: "SESSION_REMINDER",
        title: "Send PromptOps session reminder",
        description: "Remind active learners 24 hours before the PromptOps onboarding session.",
        status: "PENDING",
        scheduledAt: hoursFromNow(6)
      },
      {
        id: "seed-task-1002",
        trainerId: trainerOne.id,
        type: "SOCIAL_POST",
        title: "Publish payment agent teaser",
        description: "Post the AI Payment Agent course teaser and route replies into the learner CRM.",
        status: "RUNNING",
        scheduledAt: hoursFromNow(12)
      },
      {
        id: "seed-task-1003",
        trainerId: trainerTwo.id,
        type: "EMAIL_REMINDER",
        title: "Follow up with pending bank transfer learners",
        description: "Send concise reminders to learners with pending bank transfer receipts.",
        status: "PENDING",
        scheduledAt: hoursFromNow(24)
      },
      {
        id: "seed-task-1004",
        trainerId: trainerTwo.id,
        type: "CHATBOT_REPLY",
        title: "Answer Agent Ops FAQs",
        description: "Prepare chatbot replies for pricing, session times, certificates, and team licenses.",
        status: "COMPLETED",
        scheduledAt: hoursFromNow(-8)
      },
      {
        id: "seed-task-1005",
        trainerId: trainerOne.id,
        type: "COURSE_PUBLISHING",
        title: "Prepare portfolio builder draft",
        description: "Review modules, thumbnail prompt, and checkout copy before publishing the draft course.",
        status: "FAILED",
        scheduledAt: hoursFromNow(72)
      }
    ]
  });

  await prisma.trainingSession.createMany({
    data: [
      {
        id: "seed-session-1001",
        trainerId: trainerOne.id,
        courseId: "seed-course-promptops",
        title: "PromptOps onboarding",
        startTime: hoursFromNow(24),
        endTime: hoursFromNow(25),
        meetingLink: "https://meet.example.com/promptops-onboarding",
        status: "SCHEDULED"
      },
      {
        id: "seed-session-1002",
        trainerId: trainerTwo.id,
        courseId: "seed-course-agentops",
        title: "Agent escalation workshop",
        startTime: hoursFromNow(48),
        endTime: hoursFromNow(49.5),
        meetingLink: "https://meet.example.com/agent-escalation",
        status: "SCHEDULED"
      },
      {
        id: "seed-session-1003",
        trainerId: trainerOne.id,
        courseId: "seed-course-content-lab",
        title: "Campaign workflow critique",
        startTime: hoursFromNow(96),
        endTime: hoursFromNow(97),
        meetingLink: "https://meet.example.com/content-lab-critique",
        status: "SCHEDULED"
      },
      {
        id: "seed-session-1004",
        trainerId: trainerTwo.id,
        courseId: "seed-course-support-analytics",
        title: "Support insights review",
        startTime: hoursFromNow(120),
        endTime: hoursFromNow(121),
        meetingLink: "https://meet.example.com/support-insights",
        status: "SCHEDULED"
      },
      {
        id: "seed-session-1005",
        trainerId: trainerOne.id,
        courseId: "seed-course-promptops",
        title: "Prompt library review",
        startTime: hoursFromNow(-48),
        endTime: hoursFromNow(-47),
        meetingLink: "https://meet.example.com/prompt-library-review",
        status: "COMPLETED"
      },
      {
        id: "seed-session-1006",
        trainerId: trainerOne.id,
        courseId: "seed-course-payment-agent",
        title: "Payment follow-up clinic",
        startTime: hoursFromNow(-12),
        endTime: hoursFromNow(-11),
        meetingLink: "https://meet.example.com/payment-clinic",
        status: "CANCELLED"
      }
    ]
  });

  await prisma.notification.createMany({
    data: [
      {
        id: "seed-notification-1001",
        userId: trainerOne.id,
        title: "Payment follow-up ready",
        message: "The AI Payment Agent found two pending payments to review.",
        type: "PAYMENT",
        isRead: false
      },
      {
        id: "seed-notification-1002",
        userId: trainerOne.id,
        title: "Session prep window",
        message: "PromptOps onboarding starts tomorrow with active learners enrolled.",
        type: "SESSION",
        isRead: false
      },
      {
        id: "seed-notification-1003",
        userId: trainerTwo.id,
        title: "Draft campaign ready",
        message: "Your Agent Ops email draft is ready for review.",
        type: "MARKETING",
        isRead: true
      },
      {
        id: "seed-notification-1004",
        userId: admin.id,
        title: "New trainer profile created",
        message: "Two trainer profiles are available for platform review.",
        type: "ADMIN",
        isRead: false
      },
      {
        id: "seed-notification-1005",
        userId: learners[0].id,
        title: "Lesson unlocked",
        message: "Your PromptOps Sprint lesson on reusable workflows is ready.",
        type: "COURSE",
        isRead: false
      }
    ]
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        id: "seed-chat-1001",
        userId: learners[0].id,
        courseId: "seed-course-promptops",
        sender: "AI_BOT",
        message: "Welcome to PromptOps Sprint. Your first lesson is ready."
      },
      {
        id: "seed-chat-1002",
        userId: learners[1].id,
        courseId: "seed-course-content-lab",
        sender: "USER",
        message: "Can I reuse the campaign workflow for client newsletters?"
      },
      {
        id: "seed-chat-1003",
        userId: learners[1].id,
        courseId: "seed-course-content-lab",
        sender: "AI_BOT",
        message: "Yes. Start with the audience, offer, and proof points before generating newsletter sections."
      },
      {
        id: "seed-chat-1004",
        userId: learners[2].id,
        courseId: "seed-course-agentops",
        sender: "USER",
        message: "Can this agent workflow support onboarding inboxes?"
      },
      {
        id: "seed-chat-1005",
        userId: learners[2].id,
        courseId: "seed-course-agentops",
        sender: "AI_BOT",
        message: "Yes. Map inbox intents, approval rules, and escalation criteria before writing automated replies."
      }
    ]
  });

  console.log("Seed complete");
  console.log("Admin: admin@skillpilot.ai / password123");
  console.log("Trainer: trainer@skillpilot.ai / password123");
  console.log("Learner: learner@skillpilot.ai / password123");
}

async function resetDatabase() {
  await prisma.chatMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.automationTask.deleteMany();
  await prisma.marketingContent.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.trainerProfile.deleteMany();
  await prisma.user.deleteMany();
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + 1000 * 60 * 60 * hours);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
