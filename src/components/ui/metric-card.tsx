import { cn } from "@/lib/cn";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  className?: string;
};

export function MetricCard({ label, value, detail, className }: MetricCardProps) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60", className)}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}
