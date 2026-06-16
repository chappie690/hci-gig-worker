"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

type ChartDatum = {
  name: string;
  revenue: number;
  learners: number;
};

function formatTooltipValue(value: unknown, name: unknown) {
  const numericValue = Array.isArray(value) ? Number(value[0]) : Number(value);
  const seriesName = String(name);

  if (seriesName === "revenue" || seriesName === "Revenue") {
    return [formatCurrency(Number.isNaN(numericValue) ? 0 : numericValue), "Revenue"];
  }

  return [`${Number.isNaN(numericValue) ? 0 : numericValue} learners`, "Learners"];
}

export function DashboardChart({ data }: { data: ChartDatum[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 18, left: 4, bottom: 24 }} barGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            interval={0}
            minTickGap={8}
            stroke="#475569"
            tick={{ fontSize: 12 }}
            tickLine={false}
            angle={-12}
            textAnchor="end"
            height={58}
          />
          <YAxis
            yAxisId="revenue"
            stroke="#2563eb"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(Number(value)).replace(".00", "")}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="learners"
            orientation="right"
            stroke="#7c3aed"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}`}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            formatter={formatTooltipValue}
            labelStyle={{ color: "#0f172a", fontWeight: 700 }}
            contentStyle={{
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: 12,
              boxShadow: "0 18px 45px rgba(15,23,42,0.14)"
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          <Bar yAxisId="revenue" name="Revenue" dataKey="revenue" fill="#2563eb" radius={[8, 8, 0, 0]} />
          <Bar yAxisId="learners" name="Learners" dataKey="learners" fill="#7c3aed" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
