import { cn } from "@/lib/cn";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex rounded-full bg-limewash px-2.5 py-1 text-xs font-semibold capitalize text-moss", className)}>
      {children}
    </span>
  );
}
