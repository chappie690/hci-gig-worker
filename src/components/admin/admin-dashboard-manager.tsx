"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
};

type AdminCourse = {
  id: string;
  title: string;
  trainerName: string;
  category: string;
  level: string;
  status: string;
  price: number;
  enrollments: number;
};

type AdminPayment = {
  id: string;
  learnerName: string;
  courseTitle: string;
  amount: number;
  status: string;
  receiptNumber: string;
  paymentMethod: string;
  createdAt: string;
};

type AdminEnrollment = {
  id: string;
  learnerName: string;
  courseTitle: string;
  paymentReceipt: string;
  progress: number;
  status: string;
  createdAt: string;
};

export function AdminDashboardManager({
  users,
  courses,
  payments,
  enrollments
}: {
  users: AdminUser[];
  courses: AdminCourse[];
  payments: AdminPayment[];
  enrollments: AdminEnrollment[];
}) {
  const router = useRouter();
  const [userRows, setUserRows] = useState(users);
  const [courseRows, setCourseRows] = useState(courses);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "user" | "course"; id: string; label: string } | null>(null);
  const [detail, setDetail] = useState<{ title: string; rows: Array<{ label: string; value: string }> } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const url = deleteTarget.type === "user" ? `/api/admin/users/${deleteTarget.id}` : `/api/admin/courses/${deleteTarget.id}`;
    setLoading(url);
    setMessage(null);
    const response = await fetch(url, { method: "DELETE" });
    const data = await response.json().catch(() => null);
    setLoading(null);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "Unable to delete record." });
      return;
    }

    if (deleteTarget.type === "user") {
      setUserRows((current) => current.filter((user) => user.id !== deleteTarget.id));
    } else {
      setCourseRows((current) => current.filter((course) => course.id !== deleteTarget.id));
    }

    setDeleteTarget(null);
    setMessage({ type: "success", text: data?.message ?? "Record deleted." });
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      {message ? (
        <div className={message.type === "success" ? "rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200" : "rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/60 dark:text-red-200"}>
          {message.text}
        </div>
      ) : null}

      <AdminTable
        title="All users"
        headers={["Name", "Email", "Role", "Created", "Actions"]}
        rows={userRows.map((account) => [
          account.fullName,
          account.email,
          <Badge key="role">{account.role.toLowerCase()}</Badge>,
          formatDate(account.createdAt),
          <Button key="delete" type="button" variant="secondary" onClick={() => setDeleteTarget({ type: "user", id: account.id, label: account.fullName })}>
            Delete
          </Button>
        ])}
      />

      <AdminTable
        title="All courses"
        headers={["Course", "Trainer", "Category", "Price", "Status", "Actions"]}
        rows={courseRows.map((course) => [
          `${course.title} (${course.enrollments} enrolled)`,
          course.trainerName,
          `${course.category} / ${course.level}`,
          formatCurrency(course.price),
          <Badge key="status">{course.status.toLowerCase()}</Badge>,
          <Button key="delete" type="button" variant="secondary" onClick={() => setDeleteTarget({ type: "course", id: course.id, label: course.title })}>
            Delete
          </Button>
        ])}
      />

      <AdminTable
        title="All payments"
        headers={["Receipt", "Learner", "Course", "Amount", "Status", "Details"]}
        rows={payments.map((payment) => [
          payment.receiptNumber,
          payment.learnerName,
          payment.courseTitle,
          formatCurrency(payment.amount),
          <Badge key="status">{payment.status.toLowerCase()}</Badge>,
          <Button key="details" type="button" variant="secondary" onClick={() => setDetail({
            title: `Payment ${payment.receiptNumber}`,
            rows: [
              { label: "Learner", value: payment.learnerName },
              { label: "Course", value: payment.courseTitle },
              { label: "Amount", value: formatCurrency(payment.amount) },
              { label: "Status", value: payment.status },
              { label: "Method", value: payment.paymentMethod },
              { label: "Created", value: formatDate(payment.createdAt) }
            ]
          })}>
            View
          </Button>
        ])}
      />

      <AdminTable
        title="All enrollments"
        headers={["Learner", "Course", "Progress", "Status", "Receipt", "Details"]}
        rows={enrollments.map((enrollment) => [
          enrollment.learnerName,
          enrollment.courseTitle,
          `${enrollment.progress}%`,
          <Badge key="status">{enrollment.status.toLowerCase()}</Badge>,
          enrollment.paymentReceipt,
          <Button key="details" type="button" variant="secondary" onClick={() => setDetail({
            title: `${enrollment.learnerName} enrollment`,
            rows: [
              { label: "Learner", value: enrollment.learnerName },
              { label: "Course", value: enrollment.courseTitle },
              { label: "Progress", value: `${enrollment.progress}%` },
              { label: "Status", value: enrollment.status },
              { label: "Receipt", value: enrollment.paymentReceipt },
              { label: "Created", value: formatDate(enrollment.createdAt) }
            ]
          })}>
            View
          </Button>
        ])}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft dark:border dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-ink dark:text-slate-100">Delete {deleteTarget.type}?</h2>
            <p className="mt-3 text-sm leading-6 text-ink/65 dark:text-slate-300">This action removes {deleteTarget.label}. Related records follow Prisma cascade rules.</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmDelete} disabled={loading !== null}>
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-soft dark:border dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-ink dark:text-slate-100">{detail.title}</h2>
            <div className="mt-5 grid gap-3">
              {detail.rows.map((row) => (
                <div key={row.label} className="rounded-lg bg-cloud p-3 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-400">{row.label}</p>
                  <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">{row.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminTable({ title, headers, rows }: { title: string; headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-ink/10 p-5 dark:border-slate-700">
        <h2 className="text-lg font-bold text-ink dark:text-slate-100">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-cloud text-ink/60 dark:bg-slate-950 dark:text-slate-300">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10 dark:divide-slate-700">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="dark:hover:bg-slate-950/60">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-ink/75 dark:text-slate-200">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
