"use client";

export const localAICourseStorageKey = "skillpilot_trainer_ai_course_fallbacks";

export type LocalAICourse = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  duration: string;
  thumbnailUrl: string;
  discountActive: boolean;
  discountPercent: number | null;
  discountLabel: string | null;
  trainerName: string;
  trainerEmail: string;
  prompt: string;
  status: "PUBLISHED";
};

type LocalAICourseRecord = {
  id?: string;
  createdAt?: string;
  course?: Partial<LocalAICourse> & {
    reason?: string;
    draft?: unknown;
  };
};

export function readLocalAICourses() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(localAICourseStorageKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.map(coerceLocalCourse).filter(Boolean) as LocalAICourse[] : [];
  } catch {
    window.localStorage.removeItem(localAICourseStorageKey);
    return [];
  }
}

export function saveLocalAICourse(input: Omit<LocalAICourse, "id" | "createdAt" | "status"> & { reason?: string }) {
  const course: LocalAICourse = {
    ...input,
    id: `ai-local-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "PUBLISHED"
  };
  const current = readLocalAICourses();
  window.localStorage.setItem(localAICourseStorageKey, JSON.stringify([{ id: course.id, createdAt: course.createdAt, course }, ...current].slice(0, 8)));
  window.dispatchEvent(new Event("skillpilot-local-ai-courses-updated"));
  return course;
}

function coerceLocalCourse(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as LocalAICourseRecord;
  const source = (record.course ?? record) as Partial<LocalAICourse>;
  const title = String(source.title ?? "").trim();
  const description = String(source.description ?? "").trim();
  const category = String(source.category ?? "").trim();
  const level = String(source.level ?? "").trim();
  const duration = String(source.duration ?? "").trim();

  if (!title || !description || !category || !level || !duration) {
    return null;
  }

  const percent = source.discountPercent === null || source.discountPercent === undefined ? null : Math.min(100, Math.max(0, Number(source.discountPercent) || 0));

  return {
    id: String(record.id ?? source.id ?? `ai-local-${Date.now()}`),
    createdAt: String(record.createdAt ?? source.createdAt ?? new Date().toISOString()),
    title,
    description,
    category,
    level,
    price: Math.max(0, Number(source.price) || 0),
    duration,
    thumbnailUrl: String(source.thumbnailUrl ?? "/course-thumbnails/ai-generated-course.png"),
    discountActive: Boolean(source.discountActive && percent),
    discountPercent: percent,
    discountLabel: source.discountLabel ? String(source.discountLabel).slice(0, 40) : null,
    trainerName: String(source.trainerName ?? "SkillPilot Trainer"),
    trainerEmail: String(source.trainerEmail ?? "trainer@skillpilot.ai"),
    prompt: String(source.prompt ?? ""),
    status: "PUBLISHED" as const
  };
}
