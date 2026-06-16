import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { calculateFinalAmount, generateReceiptNumber, paymentMethods } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

const checkoutSchema = z.object({
  courseId: z.string({ required_error: "Course is required." }).trim().min(1, "Course is required."),
  paymentMethod: z.enum(paymentMethods, { required_error: "Select a payment method." })
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError("Sign in as a learner to complete checkout.");
    }

    if (user.role !== "LEARNER") {
      throw new ForbiddenError("Only learner accounts can enroll in courses.");
    }

    const body = checkoutSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Checkout details are required.");
    }));

    const course = await prisma.course.findFirst({
      where: { id: body.courseId, status: "PUBLISHED" },
      include: { enrollments: true }
    });

    if (!course) {
      throw new ValidationError("Course is not available for enrollment.");
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        learnerId_courseId: {
          learnerId: user.id,
          courseId: course.id
        }
      }
    });

    if (existingEnrollment) {
      return NextResponse.json(
        {
          message: "You are already enrolled in this course.",
          alreadyEnrolled: true,
          dashboardUrl: "/learner/dashboard"
        },
        { status: 409 }
      );
    }

    const { finalAmount } = calculateFinalAmount(course);
    const receiptNumber = generateReceiptNumber();

    const [payment, enrollment] = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          learnerId: user.id,
          courseId: course.id,
          amount: finalAmount,
          status: "PAID",
          receiptNumber,
          paymentMethod: body.paymentMethod
        }
      });

      const createdEnrollment = await tx.enrollment.create({
        data: {
          learnerId: user.id,
          courseId: course.id,
          paymentId: createdPayment.id,
          progress: 0,
          status: "ACTIVE"
        }
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Enrollment confirmed",
          message: `Payment ${receiptNumber} confirmed. You are enrolled in ${course.title}.`,
          type: "PAYMENT_SUCCESS"
        }
      });

      await tx.notification.create({
        data: {
          userId: course.trainerId,
          title: "New learner enrolled",
          message: `${user.fullName} enrolled in ${course.title}.`,
          type: "TRAINER_ENROLLMENT"
        }
      });

      return [createdPayment, createdEnrollment];
    });

    return NextResponse.json({
      paymentId: payment.id,
      enrollmentId: enrollment.id,
      receiptNumber: payment.receiptNumber,
      redirectUrl: `/payment/success/${payment.id}`
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
