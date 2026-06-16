export const paymentMethods = ["Mock Card", "Online Banking", "E-Wallet"] as const;

export function calculateDiscount(course: { price: number; level: string; enrollments?: unknown[]; discountActive?: boolean | null; discountPercent?: number | null; discountLabel?: string | null }) {
  if (course.discountActive && course.discountPercent && course.discountPercent > 0) {
    return {
      label: course.discountLabel || `${Math.round(course.discountPercent)}% OFF`,
      amount: Math.round(course.price * Math.min(100, Math.max(0, course.discountPercent)) / 100)
    };
  }

  const enrollmentCount = course.enrollments?.length ?? 0;

  if (enrollmentCount <= 1) {
    return {
      label: "Early cohort discount",
      amount: Math.round(course.price * 0.15)
    };
  }

  if (course.level.toLowerCase() === "beginner") {
    return {
      label: "Starter learner discount",
      amount: Math.round(course.price * 0.1)
    };
  }

  return {
    label: "No active discount",
    amount: 0
  };
}

export function calculateFinalAmount(course: { price: number; level: string; enrollments?: unknown[]; discountActive?: boolean | null; discountPercent?: number | null; discountLabel?: string | null }) {
  const discount = calculateDiscount(course);

  return {
    originalAmount: course.price,
    discount,
    finalAmount: Math.max(0, course.price - discount.amount)
  };
}

export function generateReceiptNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `SP-${timestamp}-${suffix}`;
}
