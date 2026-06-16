"use client";

import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

type CourseRevenue = {
  name: string;
  revenue: number;
  enrollments: number;
};

type StatusDatum = {
  name: string;
  value: number;
};

const colors = ["#2563eb", "#7c3aed", "#0f172a", "#38bdf8"];

export function PaymentAgentCharts({
  revenue,
  statuses
}: {
  revenue: CourseRevenue[];
  statuses: StatusDatum[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="h-80 rounded-lg border border-ink/10 bg-white p-5">
        <p className="mb-4 text-sm font-bold text-ink">Course revenue breakdown</p>
        <ResponsiveContainer width="100%" height="88%">
          <BarChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#475569" tickLine={false} />
            <YAxis stroke="#475569" tickLine={false} axisLine={false} />
            <Tooltip />
            <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
            <Bar dataKey="enrollments" fill="#7c3aed" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="h-80 rounded-lg border border-ink/10 bg-white p-5">
        <p className="mb-4 text-sm font-bold text-ink">Payment status mix</p>
        <ResponsiveContainer width="100%" height="88%">
          <PieChart>
            <Pie data={statuses} dataKey="value" nameKey="name" outerRadius={96} label>
              {statuses.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
