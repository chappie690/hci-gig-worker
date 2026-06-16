import Link from "next/link";
import { cn } from "@/lib/cn";

type GhostButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function GhostButton({ href, children, className, ariaLabel }: GhostButtonProps) {
  return (
    <Link
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/20 backdrop-blur transition duration-200 ease-out",
        "hover:scale-[1.02] hover:border-white/40 hover:bg-white/15 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "motion-reduce:hover:scale-100 motion-reduce:transition-none",
        className
      )}
      href={href}
    >
      {children}
    </Link>
  );
}
