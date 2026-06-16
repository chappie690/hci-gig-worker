import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { generatePaymentAgentAdvice } from "@/lib/ai";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  paymentId: z.string()
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    assertRateLimit(`payment-agent:${user.id}`);

    const { paymentId } = schema.parse(await request.json());
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, course: { trainerId: user.id } },
      include: { learner: true, course: true }
    });

    if (!payment) {
      return NextResponse.json({ message: "Payment not found." }, { status: 404 });
    }

    const advice = await generatePaymentAgentAdvice({
      description: payment.course.title,
      learnerName: payment.learner.fullName,
      amount: payment.amount,
      status: payment.status,
      receiptNumber: payment.receiptNumber,
      paymentMethod: payment.paymentMethod
    });

    return NextResponse.json(advice);
  } catch (error) {
    return handleRouteError(error);
  }
}
