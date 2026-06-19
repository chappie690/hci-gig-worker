import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const cookieName = "skillpilot_session";
const sessionDurationSeconds = 60 * 60 * 24;

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET ?? "development-only-skillpilot-secret-change-me";
  return new TextEncoder().encode(secret);
}

export function getRoleDashboardPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "TRAINER") {
    return "/trainer/dashboard";
  }

  return "/learner/dashboard";
}

export async function createSessionCookie(response: NextResponse, user: { id: string; role: string }) {
  const token = await new SignJWT({ userId: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${sessionDurationSeconds}s`)
    .sign(getSessionSecret());

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, getSessionSecret());
    const userId = verified.payload.userId;

    if (typeof userId !== "string") {
      return null;
    }

    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, role: true }
    });
  } catch {
    return null;
  }
}
