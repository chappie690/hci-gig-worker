import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { generateAdCopy } from "@/lib/huggingface";
import { assertRateLimit } from "@/lib/rate-limit";
import { hfMarketingInputSchema } from "../schema";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    assertRateLimit(`hf-ad:${user.id}`);

    const body = hfMarketingInputSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Ad inputs are required.");
    }));
    const result = await generateAdCopy(body);

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
