export type SubscriptionRole = "LEARNER" | "TRAINER";

export type SubscriptionPlan = {
  role: SubscriptionRole;
  name: string;
  price: number;
  billingCycle: "month";
  features: string[];
};

export type SubscriptionMetadata = {
  userRole: SubscriptionRole;
  planName: string;
  planPrice: number;
  billingCycle: "month";
  status: "ACTIVE" | "CANCELLED" | "EXPIRED" | "PAYMENT_FAILED";
  startedAt: string;
  renewalDate: string;
  cancelledAt: string | null;
  paymentStatus: "FREE" | "PAID" | "FAILED" | "CANCELLED";
  receiptId: string;
};

export type SubscriptionDisplayStatus = "Active" | "Expiring Soon" | "Cancelled" | "Expired" | "Payment Failed";

export type LearnerSubscriptionUsage = {
  monthKey: string;
  courseEnrollments: number;
  chatbotMessages: number;
};

export type LearnerPlanAccess = {
  canBrowseCourses: boolean;
  canPurchaseCourses: boolean;
  courseLimit: number;
  chatbotLimit: number;
  certificates: boolean;
  priorityReminders: boolean;
  chatbotLevel: "Limited" | "Basic" | "Full";
};

export type TrainerPlanAccess = {
  coursePublishLimit: number;
  aiMarketing: boolean;
  socialAutomation: boolean;
  advancedAnalytics: boolean;
  paymentAgent: boolean;
  fraudSupport: boolean;
  revenueInsights: "Basic" | "Better";
};

export const subscriptionStorageKey = "skillpilot_demo_subscriptions";
export const subscriptionEventName = "skillpilot-subscription-updated";
export const subscriptionReceiptStorageKey = "skillpilot_demo_subscription_receipts";
export const subscriptionUsageStorageKey = "skillpilot_demo_subscription_usage";
export const stableSubscriptionDate = "2026-07-01T00:00:00.000Z";

export const learnerSubscriptionPlans: SubscriptionPlan[] = [
  {
    role: "LEARNER",
    name: "Free Plan",
    price: 0,
    billingCycle: "month",
    features: ["Browse courses", "Buy individual courses", "Limited chatbot usage", "No certificates"]
  },
  {
    role: "LEARNER",
    name: "Starter Learner",
    price: 19,
    billingCycle: "month",
    features: ["Buy individual courses", "Access 3 subscription courses/month", "Basic certificates", "Basic chatbot support"]
  },
  {
    role: "LEARNER",
    name: "Pro Learner",
    price: 49,
    billingCycle: "month",
    features: ["Buy individual courses", "Unlimited subscription course access", "Certificates", "Full AI chatbot", "Priority session reminders"]
  }
];

export const trainerSubscriptionPlans: SubscriptionPlan[] = [
  {
    role: "TRAINER",
    name: "Free Trainer",
    price: 0,
    billingCycle: "month",
    features: ["Publish limited courses", "Basic dashboard", "Limited AI tools"]
  },
  {
    role: "TRAINER",
    name: "Trainer Pro",
    price: 79,
    billingCycle: "month",
    features: ["Publish more courses", "AI Marketing", "Social Automation", "Advanced analytics", "Payment Agent support"]
  },
  {
    role: "TRAINER",
    name: "Trainer Business",
    price: 149,
    billingCycle: "month",
    features: ["Unlimited course publishing", "Advanced AI Marketing", "Priority analytics", "Fraud/suspicious transaction support", "Better revenue insights"]
  }
];

export function getPlansForRole(role: SubscriptionRole) {
  return role === "TRAINER" ? trainerSubscriptionPlans : learnerSubscriptionPlans;
}

export function getDefaultSubscription(role: SubscriptionRole): SubscriptionMetadata {
  const plan = getPlansForRole(role)[0];
  return createStableSubscriptionMetadata(role, plan);
}

export function createSubscriptionMetadata(role: SubscriptionRole, plan: SubscriptionPlan): SubscriptionMetadata {
  const now = new Date();
  const renewal = new Date(now);
  renewal.setMonth(renewal.getMonth() + 1);

  return {
    userRole: role,
    planName: plan.name,
    planPrice: plan.price,
    billingCycle: plan.billingCycle,
    status: "ACTIVE",
    startedAt: now.toISOString(),
    renewalDate: renewal.toISOString(),
    cancelledAt: null,
    paymentStatus: plan.price === 0 ? "FREE" : "PAID",
    receiptId: `SUB-${role.slice(0, 1)}-${now.getTime()}`
  };
}

export function createStableSubscriptionMetadata(role: SubscriptionRole, plan: SubscriptionPlan): SubscriptionMetadata {
  return {
    userRole: role,
    planName: plan.name,
    planPrice: plan.price,
    billingCycle: plan.billingCycle,
    status: "ACTIVE",
    startedAt: stableSubscriptionDate,
    renewalDate: stableSubscriptionDate,
    cancelledAt: null,
    paymentStatus: plan.price === 0 ? "FREE" : "PAID",
    receiptId: `SUB-${role.slice(0, 1)}-DEMO`
  };
}

export function formatSubscriptionPrice(price: number) {
  return price === 0 ? "$0/month" : `$${price}/month`;
}

export function describeSubscription(subscription: SubscriptionMetadata, displayStatus = getSubscriptionDisplayStatus(subscription)) {
  return `${subscription.planName} (${formatSubscriptionPrice(subscription.planPrice)}), ${displayStatus}, renews ${formatShortDate(subscription.renewalDate)}, payment status ${subscription.paymentStatus.toLowerCase()}, receipt ${subscription.receiptId}`;
}

export function getSubscriptionDisplayStatus(subscription: SubscriptionMetadata): SubscriptionDisplayStatus {
  if (subscription.paymentStatus === "FAILED" || subscription.status === "PAYMENT_FAILED") return "Payment Failed";
  if (subscription.status === "CANCELLED") return "Cancelled";
  if (subscription.status === "EXPIRED") return "Expired";

  const renewalTime = new Date(subscription.renewalDate).getTime();
  const now = Date.now();

  if (Number.isFinite(renewalTime) && renewalTime < now) return "Expired";
  if (Number.isFinite(renewalTime) && renewalTime - now <= 1000 * 60 * 60 * 24 * 7) return "Expiring Soon";
  return "Active";
}

export function getStableSubscriptionDisplayStatus(subscription: SubscriptionMetadata): SubscriptionDisplayStatus {
  if (subscription.paymentStatus === "FAILED" || subscription.status === "PAYMENT_FAILED") return "Payment Failed";
  if (subscription.status === "CANCELLED") return "Cancelled";
  if (subscription.status === "EXPIRED") return "Expired";
  return "Active";
}

export function getLearnerPlanAccess(planName: string): LearnerPlanAccess {
  if (planName === "Pro Learner") {
    return {
      canBrowseCourses: true,
      canPurchaseCourses: true,
      courseLimit: Number.POSITIVE_INFINITY,
      chatbotLimit: Number.POSITIVE_INFINITY,
      certificates: true,
      priorityReminders: true,
      chatbotLevel: "Full"
    };
  }

  if (planName === "Starter Learner") {
    return {
      canBrowseCourses: true,
      canPurchaseCourses: true,
      courseLimit: 3,
      chatbotLimit: 30,
      certificates: true,
      priorityReminders: false,
      chatbotLevel: "Basic"
    };
  }

  return {
    canBrowseCourses: true,
    canPurchaseCourses: true,
    courseLimit: 0,
    chatbotLimit: 5,
    certificates: false,
    priorityReminders: false,
    chatbotLevel: "Limited"
  };
}

export function canBrowseCourses() {
  return true;
}

export function canPurchaseCourse() {
  return true;
}

export function canAccessPurchasedCourse(_planName: string, purchased: boolean) {
  return purchased;
}

export function canGetCertificate(planName: string) {
  return getLearnerPlanAccess(planName).certificates;
}

export function canUseChatbot(planName: string, usageCount: number) {
  const access = getLearnerPlanAccess(planName);
  return !Number.isFinite(access.chatbotLimit) || usageCount < access.chatbotLimit;
}

export function hasPrioritySessionReminders(planName: string) {
  return getLearnerPlanAccess(planName).priorityReminders;
}

export function getTrainerPlanAccess(planName: string): TrainerPlanAccess {
  if (planName === "Trainer Business") {
    return {
      coursePublishLimit: Number.POSITIVE_INFINITY,
      aiMarketing: true,
      socialAutomation: true,
      advancedAnalytics: true,
      paymentAgent: true,
      fraudSupport: true,
      revenueInsights: "Better"
    };
  }

  if (planName === "Trainer Pro") {
    return {
      coursePublishLimit: 10,
      aiMarketing: true,
      socialAutomation: true,
      advancedAnalytics: true,
      paymentAgent: true,
      fraudSupport: false,
      revenueInsights: "Basic"
    };
  }

  return {
    coursePublishLimit: 2,
    aiMarketing: false,
    socialAutomation: false,
    advancedAnalytics: false,
    paymentAgent: false,
    fraudSupport: false,
    revenueInsights: "Basic"
  };
}

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
