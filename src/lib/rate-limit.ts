import { ValidationError } from "@/lib/errors";

const hits = new Map<string, number[]>();

export function assertRateLimit(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= limit) {
    throw new ValidationError("Please wait a moment before asking SkillPilot AI again.");
  }

  hits.set(key, [...recent, now]);
}
