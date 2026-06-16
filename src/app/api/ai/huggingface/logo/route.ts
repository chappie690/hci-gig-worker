import { NextResponse } from "next/server";
import { z } from "zod";
import { generateLogoImage } from "@/lib/huggingface";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { assertRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  brandName: z.string({ required_error: "Brand name is required." }).trim().min(2, "Brand name is required."),
  tagline: z.string({ required_error: "Tagline is required." }).trim().min(2, "Tagline is required."),
  niche: z.string({ required_error: "Niche is required." }).trim().min(2, "Niche is required."),
  tone: z.string({ required_error: "Tone is required." }).trim().min(2, "Tone is required."),
  logoStyle: z.string({ required_error: "Logo style is required." }).trim().min(2, "Logo style is required."),
  colorPalette: z.string().trim().optional(),
  audience: z.string().trim().optional()
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    assertRateLimit(`hf-logo:${user.id}`);

    const body = schema.parse(await request.json().catch(() => {
      throw new ValidationError("Logo fields are required.");
    }));
    const result = await generateLogoImage(body);

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
