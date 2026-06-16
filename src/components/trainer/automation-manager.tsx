"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AutomationTask = {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  scheduledAt: string;
  createdAt: string;
};

type TaskForm = {
  type: string;
  title: string;
  description: string;
  status: string;
  scheduledAt: string;
};

const taskTypes = ["COURSE_PUBLISHING", "SOCIAL_POST", "EMAIL_REMINDER", "CHATBOT_REPLY", "SESSION_REMINDER"];
const statuses = ["PENDING", "RUNNING", "COMPLETED", "FAILED"];

const emptyForm: TaskForm = {
  type: "SOCIAL_POST",
  title: "",
  description: "",
  status: "PENDING",
  scheduledAt: defaultScheduleTime()
};

export function AutomationManager({ initialTasks }: { initialTasks: AutomationTask[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [createForm, setCreateForm] = useState<TaskForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskForm>(emptyForm);
  const [deleteTask, setDeleteTask] = useState<AutomationTask | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitJson("/api/trainer/automation", "POST", createForm, (data) => {
      setTasks((current) => [data.task, ...current]);
      setCreateForm({ ...emptyForm, scheduledAt: defaultScheduleTime() });
      setMessage({ type: "success", text: data.message ?? "Automation task created." });
      router.refresh();
    });
  }

  async function updateTask(event: React.FormEvent<HTMLFormElement>, taskId: string) {
    event.preventDefault();
    await submitJson(`/api/trainer/automation/${taskId}`, "PATCH", editForm, (data) => {
      setTasks((current) => current.map((task) => (task.id === taskId ? data.task : task)));
      setEditingId(null);
      setMessage({ type: "success", text: data.message ?? "Automation task updated." });
      router.refresh();
    });
  }

  async function updateStatus(task: AutomationTask, status: string) {
    await submitJson(`/api/trainer/automation/${task.id}`, "PATCH", { status }, (data) => {
      setTasks((current) => current.map((item) => (item.id === task.id ? data.task : item)));
      setMessage({ type: "success", text: `Task marked ${status.toLowerCase()}.` });
      router.refresh();
    });
  }

  async function confirmDelete() {
    if (!deleteTask) {
      return;
    }

    setLoading(`DELETE-${deleteTask.id}`);
    setMessage(null);
    const response = await fetch(`/api/trainer/automation/${deleteTask.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to delete automation task." });
      return;
    }

    setTasks((current) => current.filter((task) => task.id !== deleteTask.id));
    setDeleteTask(null);
    setMessage({ type: "success", text: data?.message ?? "Automation task deleted." });
    router.refresh();
  }

  async function submitJson(url: string, method: string, body: unknown, onSuccess: (data: { task: AutomationTask; message?: string }) => void) {
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
      setMessage({ type: "error", text: data?.message ?? "Unable to save automation task." });
      return;
    }

    onSuccess(data);
  }

  function startEdit(task: AutomationTask) {
    setEditingId(task.id);
    setEditForm({
      type: task.type,
      title: task.title,
      description: task.description,
      status: task.status,
      scheduledAt: toDatetimeLocal(task.scheduledAt)
    });
  }

  return (
    <div className="grid gap-6">
      {message ? (
        <div className={message.type === "success" ? "rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" : "rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"}>
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-5">
        {taskTypes.map((type) => {
          const typeTasks = tasks.filter((task) => task.type === type);
          const activeCount = typeTasks.filter((task) => task.status === "PENDING" || task.status === "RUNNING").length;

          return (
            <div key={type} className="rounded-lg border border-ink/10 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{typeLabel(type)}</p>
              <p className="mt-3 text-2xl font-bold text-ink">{typeTasks.length}</p>
              <p className="mt-1 text-sm text-ink/55">{activeCount} active workflow{activeCount === 1 ? "" : "s"}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.75fr_1.35fr]">
        <div className="rounded-lg border border-ink/10 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Create workflow</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Add automation task</h2>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            Create manual automations or track tasks generated by course publishing, social scheduling, sessions, and chatbot replies.
          </p>
          <TaskFormView form={createForm} setForm={setCreateForm} onSubmit={createTask} submitLabel="Create task" loading={loading === "/api/trainer/automation"} />
        </div>

        <div className="rounded-lg border border-ink/10 bg-white">
          <div className="border-b border-ink/10 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Workflow board</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Automation task queue</h2>
          </div>
          <div className="divide-y divide-ink/10">
            {tasks.map((task) => (
              <article key={task.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{typeLabel(task.type)}</Badge>
                      <Badge className={statusClass(task.status)}>{task.status.toLowerCase()}</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-ink">{task.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/65">{task.description}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-moss">{formatDate(task.scheduledAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
                      value={task.status}
                      onChange={(event) => updateStatus(task, event.target.value)}
                      disabled={loading !== null}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <Button type="button" variant="secondary" onClick={() => startEdit(task)}>
                      Edit
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setDeleteTask(task)}>
                      Delete
                    </Button>
                  </div>
                </div>

                {editingId === task.id ? (
                  <div className="mt-5 rounded-lg border border-ink/10 bg-cloud p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="font-semibold text-ink">Edit workflow task</p>
                      <button className="text-sm font-semibold text-ink/60 hover:text-ink" type="button" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                    <TaskFormView form={editForm} setForm={setEditForm} onSubmit={(event) => updateTask(event, task.id)} submitLabel="Save changes" loading={loading === `/api/trainer/automation/${task.id}`} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {deleteTask ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold text-ink">Delete automation task?</h2>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              This removes the workflow task from your automation board. Related courses, sessions, or content records are not deleted.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setDeleteTask(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmDelete} disabled={loading === `DELETE-${deleteTask.id}`}>
                {loading === `DELETE-${deleteTask.id}` ? "Deleting..." : "Delete task"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TaskFormView({
  form,
  setForm,
  onSubmit,
  submitLabel,
  loading
}: {
  form: TaskForm;
  setForm: (form: TaskForm) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  loading: boolean;
}) {
  function update(field: keyof TaskForm, value: string) {
    setForm({ ...form, [field]: value });
  }

  return (
    <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-ink">
          <span>Type</span>
          <select className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={form.type} onChange={(event) => update("type", event.target.value)} required>
            {taskTypes.map((type) => (
              <option key={type} value={type}>
                {typeLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          <span>Status</span>
          <select className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={form.status} onChange={(event) => update("status", event.target.value)} required>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TextField label="Title" value={form.title} onChange={(value) => update("title", value)} />
      <label className="grid gap-2 text-sm font-medium text-ink">
        <span>Description</span>
        <textarea
          className="min-h-28 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          required
        />
      </label>
      <TextField label="Scheduled date and time" type="datetime-local" value={form.scheduledAt} onChange={(value) => update("scheduledAt", value)} />
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
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <input
        className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}

function typeLabel(type: string) {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function statusClass(status: string) {
  if (status === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "RUNNING") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "FAILED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-cloud text-ink/70";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return defaultScheduleTime();
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function defaultScheduleTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setMinutes(0, 0, 0);

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
