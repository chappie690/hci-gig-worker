import Link from "next/link";
import { cn } from "@/lib/cn";

type GlowButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function GlowButton({ href, children, className, ariaLabel }: GlowButtonProps) {
  return (
    <Link
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-xl border border-cyan-200/70 bg-cyan-300 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-[0_0_30px_rgba(103,232,249,0.45)] transition duration-200 ease-out",
        "hover:scale-[1.02] hover:bg-cyan-200 hover:shadow-[0_0_42px_rgba(103,232,249,0.62)] active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "motion-reduce:hover:scale-100 motion-reduce:transition-none",
        className
      )}
      href={href}
    >
      {children}
    </Link>
  );
}
