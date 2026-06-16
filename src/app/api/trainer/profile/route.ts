import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { trainerProfileSchema } from "@/lib/profile-validation";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.role !== "TRAINER") {
      throw new ForbiddenError();
    }

    const body = trainerProfileSchema.parse(await request.json().catch(() => {
      throw new ValidationError("Profile fields are required.");
    }));

    const profile = await prisma.trainerProfile.upsert({
      where: { userId: user.id },
      update: body,
      create: {
        userId: user.id,
        ...body
      }
    });

    return NextResponse.json({ profile, message: "Profile saved." });
  } catch (error) {
    return handleRouteError(error);
  }
}
