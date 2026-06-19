"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { useDemoSubscription } from "@/components/settings/subscription-access";
import { AICourseBuilder } from "@/components/trainer/ai-course-builder";
import { formatCurrency } from "@/lib/format";
import { readLocalAICourses, type LocalAICourse } from "@/lib/local-ai-course-storage";
import { formatSubscriptionPrice, getTrainerPlanAccess, getPlansForRole } from "@/lib/subscriptions";

type Learner = {
  id: string;
  fullName: string;
  email: string;
  progress: number;
  status: string;
};

type Course = {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  duration: string;
  thumbnailUrl: string;
  courseVideoUrl?: string | null;
  discountActive: boolean;
  discountPercent?: number | null;
  discountLabel?: string | null;
  status: string;
  learners: Learner[];
  revenue: number;
};

type CourseFormState = {
  title: string;
  description: string;
  category: string;
  level: string;
  price: string;
  duration: string;
  thumbnailUrl: string;
  courseVideoUrl: string;
  discountActive: boolean;
  discountPercent: string;
  discountLabel: string;
  status: string;
};

const emptyForm: CourseFormState = {
  title: "",
  description: "",
  category: "",
  level: "Beginner",
  price: "",
  duration: "",
  thumbnailUrl: "/course-thumbnails/new-course.png",
  courseVideoUrl: "",
  discountActive: false,
  discountPercent: "",
  discountLabel: "",
  status: "DRAFT"
};

export function CourseManager({ courses, trainer }: { courses: Course[]; trainer: { fullName: string; email: string } }) {
  const router = useRouter();
  const [createForm, setCreateForm] = useState<CourseFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CourseFormState>(emptyForm);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [localCourses, setLocalCourses] = useState<LocalAICourse[]>([]);
  const { subscription } = useDemoSubscription(trainer.email, "TRAINER");
  const trainerAccess = getTrainerPlanAccess(subscription.planName);
  const publishedCount = courses.filter((course) => course.status === "PUBLISHED").length + localCourses.filter((course) => course.status === "PUBLISHED").length;

  useEffect(() => {
    function loadLocalCourses() {
      setLocalCourses(readLocalAICourses());
    }

    const frame = window.requestAnimationFrame(loadLocalCourses);
    window.addEventListener("storage", loadLocalCourses);
    window.addEventListener("skillpilot-local-ai-courses-updated", loadLocalCourses);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", loadLocalCourses);
      window.removeEventListener("skillpilot-local-ai-courses-updated", loadLocalCourses);
    };
  }, []);

  async function createCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createForm.status === "PUBLISHED" && isPublishLimitReached(subscription.planName, publishedCount, trainerAccess.coursePublishLimit)) {
      setMessage({ type: "error", text: publishLimitMessage(subscription.planName, trainerAccess.coursePublishLimit) });
      return;
    }
    await submitJson("/api/trainer/courses", "POST", formToPayload(createForm), () => {
      setCreateForm(emptyForm);
      setMessage({ type: "success", text: "Course created." });
      router.refresh();
    });
  }

  async function updateCourse(event: React.FormEvent<HTMLFormElement>, courseId: string) {
    event.preventDefault();
    await submitJson(`/api/trainer/courses/${courseId}`, "PATCH", formToPayload(editForm), () => {
      setEditingId(null);
      setMessage({ type: "success", text: "Course updated." });
      router.refresh();
    });
  }

  async function setStatus(course: Course, status: "DRAFT" | "PUBLISHED") {
    if (status === "PUBLISHED" && isPublishLimitReached(subscription.planName, publishedCount, trainerAccess.coursePublishLimit)) {
      setMessage({ type: "error", text: publishLimitMessage(subscription.planName, trainerAccess.coursePublishLimit) });
      return;
    }
    await submitJson(`/api/trainer/courses/${course.id}`, "PATCH", { status }, () => {
      setMessage({ type: "success", text: status === "PUBLISHED" ? "Course published." : "Course unpublished." });
      router.refresh();
    });
  }

  async function confirmDelete() {
    if (!deleteCourse) {
      return;
    }

    setLoading(deleteCourse.id);
    setMessage(null);
    const response = await fetch(`/api/trainer/courses/${deleteCourse.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to delete course." });
      return;
    }

    setDeleteCourse(null);
    setMessage({ type: "success", text: "Course deleted." });
    router.refresh();
  }

  async function submitJson(url: string, method: string, body: unknown, onSuccess: () => void) {
    setLoading(url);
    setMessage(null);
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to save course." });
      return;
    }

    onSuccess();
  }

  function startEdit(course: Course) {
    setEditingId(course.id);
    setEditForm({
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      price: String(course.price),
      duration: course.duration,
      thumbnailUrl: course.thumbnailUrl,
      courseVideoUrl: course.courseVideoUrl ?? "",
      discountActive: course.discountActive,
      discountPercent: course.discountPercent ? String(course.discountPercent) : "",
      discountLabel: course.discountLabel ?? "",
      status: course.status
    });
  }

  return (
    <div className="grid gap-6">
      {message ? (
        <div className={message.type === "success" ? "rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" : "rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"}>
          {message.text}
        </div>
      ) : null}

      {trainerAccess.aiMarketing ? (
        <AICourseBuilder trainer={trainer} />
      ) : (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">AI course builder locked</p>
            <h2 className="mt-2 text-xl font-black text-ink dark:text-slate-100">Create with AI is available in Trainer Pro.</h2>
            <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-slate-300">
              You are currently on {subscription.planName}. Upgrade to Trainer Pro at $79/month to unlock AI-assisted course publishing.
            </p>
          </CardContent>
        </Card>
      )}

      {localCourses.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Local AI-published demo courses</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm leading-6 text-ink/60 dark:text-slate-300">
              These lightweight courses were saved in this browser because database publishing was unavailable. They also appear in learner Discover on this device.
            </p>
            {localCourses.map((course) => (
              <article key={course.id} className="rounded-2xl border border-ink/10 bg-cloud p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-ink dark:text-slate-100">{course.title}</h3>
                      <Badge>local published</Badge>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-slate-300">{course.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{course.category}</span>
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">{course.level}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{course.duration}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-ink dark:text-slate-100">{formatCurrency(discountedPrice(course.price, course.discountActive ? course.discountPercent : null))}</p>
                    {course.discountActive && course.discountPercent ? (
                      <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">{course.discountLabel || `${course.discountPercent}% OFF`}</p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create course</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm form={createForm} setForm={setCreateForm} onSubmit={createCourse} submitLabel="Create course" loading={loading === "/api/trainer/courses"} />
        </CardContent>
      </Card>

      <section className="grid gap-5">
        {courses.map((course) => (
          <Card key={course.id}>
            <CardContent className="p-5">
              <div className="grid gap-5 xl:grid-cols-[1fr_0.42fr]">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-start gap-3">
                        <ProfileLogo user={trainer} className="h-12 w-12" label={`${trainer.fullName} course provider logo`} />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-bold text-ink">{course.title}</h2>
                            <Badge>{course.status.toLowerCase()}</Badge>
                          </div>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-moss">Created by {trainer.fullName}</p>
                        </div>
                      </div>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{course.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-ink">{formatCurrency(course.price)}</p>
                      {course.discountActive && course.discountPercent ? (
                        <p className="mt-1 text-sm font-bold text-emerald-700">
                          {course.discountLabel || `${course.discountPercent}% OFF`} - {formatCurrency(discountedPrice(course.price, course.discountPercent))}
                        </p>
                      ) : null}
                      <p className="text-sm text-ink/55">{course.revenue ? `${formatCurrency(course.revenue)} collected` : "No paid revenue yet"}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <Stat label="Category" value={course.category} />
                    <Stat label="Level" value={course.level} />
                    <Stat label="Duration" value={course.duration} />
                    <Stat label="Learners" value={course.learners.length} />
                  </div>
                  <p className="mt-3 rounded-lg border border-ink/10 bg-cloud px-3 py-2 text-xs font-semibold text-ink/60">
                    Course video: {course.courseVideoUrl ? "YouTube video added" : "No trainer video added yet"}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => startEdit(course)}>
                      Edit
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setStatus(course, course.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")}>
                      {course.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setDeleteCourse(course)}>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-ink/10 bg-cloud p-4">
                  <p className="text-sm font-bold text-ink">Enrolled learners</p>
                  <div className="mt-3 grid gap-2">
                    {course.learners.length ? (
                      course.learners.map((learner) => (
                        <div key={learner.id} className="rounded-lg bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-ink">{learner.fullName}</p>
                            <Badge>{learner.status.toLowerCase()}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-ink/55">{learner.email}</p>
                          <p className="mt-1 text-xs text-moss">{learner.progress}% complete</p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg bg-white p-3 text-sm text-ink/55">No learners enrolled yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {editingId === course.id ? (
                <div className="mt-5 rounded-lg border border-ink/10 bg-cloud p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">Edit course</p>
                    <button className="text-sm font-semibold text-ink/60 hover:text-ink" type="button" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                  <CourseForm form={editForm} setForm={setEditForm} onSubmit={(event) => updateCourse(event, course.id)} submitLabel="Save changes" loading={loading === `/api/trainer/courses/${course.id}`} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>

      {deleteCourse ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold text-ink">Delete course?</h2>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              This will permanently delete this course and related enrollments, payments, sessions, and chat links where cascade rules apply.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setDeleteCourse(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmDelete} disabled={loading === deleteCourse.id}>
                {loading === deleteCourse.id ? "Deleting..." : "Delete course"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CourseForm({
  form,
  setForm,
  onSubmit,
  submitLabel,
  loading
}: {
  form: CourseFormState;
  setForm: (form: CourseFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  loading: boolean;
}) {
  function update<K extends keyof CourseFormState>(field: K, value: CourseFormState[K]) {
    setForm({ ...form, [field]: value });
  }

  const price = Number(form.price) || 0;
  const percent = Number(form.discountPercent) || 0;
  const previewPrice = form.discountActive ? discountedPrice(price, percent) : price;

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <TextField label="Title" value={form.title} onChange={(value) => update("title", value)} />
        <TextField label="Category" value={form.category} onChange={(value) => update("category", value)} />
      </div>
      <label className="grid gap-2 text-sm font-medium text-ink">
        <span>Description</span>
        <textarea
          className="min-h-28 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          required
        />
      </label>
      <div className="grid gap-4 lg:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium text-ink">
          <span>Level</span>
          <select className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={form.level} onChange={(event) => update("level", event.target.value)} required>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </label>
        <TextField label="Price" type="number" value={form.price} onChange={(value) => update("price", value)} />
        <TextField label="Duration" value={form.duration} onChange={(value) => update("duration", value)} />
        <label className="grid gap-2 text-sm font-medium text-ink">
          <span>Status</span>
          <select className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={form.status} onChange={(event) => update("status", event.target.value)} required>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>
      </div>
      <TextField label="Thumbnail URL" value={form.thumbnailUrl} onChange={(value) => update("thumbnailUrl", value)} />
      <TextField label="Course YouTube Video Link" value={form.courseVideoUrl} onChange={(value) => update("courseVideoUrl", value)} required={false} placeholder="https://www.youtube.com/watch?v=..." />
      <div className="rounded-2xl border border-ink/10 bg-cloud p-4">
        <label className="flex items-center gap-3 text-sm font-bold text-ink">
          <input
            className="h-4 w-4"
            type="checkbox"
            checked={form.discountActive}
            onChange={(event) => update("discountActive", event.target.checked)}
          />
          Discount active
        </label>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <TextField label="Discount percentage" type="number" value={form.discountPercent} onChange={(value) => update("discountPercent", value)} required={false} placeholder="20" />
          <TextField label="Discount label" value={form.discountLabel} onChange={(value) => update("discountLabel", value)} required={false} placeholder="Student Deal" />
          <div className="rounded-xl border border-ink/10 bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">Discount preview</p>
            <p className="mt-2 font-black text-ink">{formatCurrency(previewPrice)}</p>
            {form.discountActive && percent > 0 ? <p className="text-xs font-semibold text-emerald-700">Original {formatCurrency(price)} - {Math.min(100, Math.max(0, percent))}% off</p> : <p className="text-xs text-ink/55">No discount applied</p>}
          </div>
        </div>
      </div>
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <input
        className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-cloud p-3">
      <p className="text-xs text-ink/50">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function formToPayload(form: CourseFormState) {
  return {
    ...form,
    price: Number(form.price),
    discountActive: form.discountActive,
    discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
    discountLabel: form.discountLabel
  };
}

function discountedPrice(price: number, percent?: number | null) {
  return Math.max(0, Math.round(price - price * Math.min(100, Math.max(0, percent ?? 0)) / 100));
}

function isPublishLimitReached(planName: string, publishedCount: number, limit: number) {
  return planName !== "Trainer Business" && Number.isFinite(limit) && publishedCount >= limit;
}

function publishLimitMessage(planName: string, limit: number) {
  const upgrade = getPlansForRole("TRAINER").find((plan) => plan.name === (planName === "Free Trainer" ? "Trainer Pro" : "Trainer Business"));
  return `Course publishing limit reached on ${planName} (${limit} published courses). Upgrade to ${upgrade?.name ?? "Trainer Business"} at ${formatSubscriptionPrice(upgrade?.price ?? 149)} to publish more courses.`;
}
