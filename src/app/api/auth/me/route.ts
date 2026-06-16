import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}
