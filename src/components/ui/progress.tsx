import { cn } from "@/lib/cn";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-ink/10", className)}>
      <div
        className="h-full rounded-full bg-moss transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
