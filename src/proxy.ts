import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const roleRules = [
  { prefix: "/learner", role: "LEARNER" },
  { prefix: "/trainer", role: "TRAINER" },
  { prefix: "/admin", role: "ADMIN" }
];

const sessionCookieName = "skillpilot_session";

function getSecret() {
  const secret = process.env.SESSION_SECRET ?? "development-only-skillpilot-secret-change-me";
  return new TextEncoder().encode(secret);
}

function dashboardForRole(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "TRAINER") {
    return "/trainer/dashboard";
  }

  return "/learner/dashboard";
}

export async function proxy(request: NextRequest) {
  const rule = roleRules.find((item) => request.nextUrl.pathname.startsWith(item.prefix));

  if (!rule) {
    return NextResponse.next();
  }

  const token = request.cookies.get(sessionCookieName)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const verified = await jwtVerify(token, getSecret());
    const role = verified.payload.role;

    if (role !== rule.role) {
      return NextResponse.redirect(new URL(dashboardForRole(String(role ?? "LEARNER")), request.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/learner/:path*", "/trainer/:path*", "/admin/:path*"]
};
