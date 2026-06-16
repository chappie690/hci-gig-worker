import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 500
  ) {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in to continue.") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Please check the submitted details.") {
    super(message, 400);
  }
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ message: error.errors[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  if (error instanceof AppError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ message: "Pilot Pete hit some turbulence. Please try again." }, { status: 500 });
}
