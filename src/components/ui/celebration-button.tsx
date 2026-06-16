"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";

type CelebrationButtonProps = {
  href?: string;
  children: React.ReactNode;
  intensity?: "small" | "milestone";
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  onCelebrate?: () => void;
};

export function CelebrationButton({ href, children, intensity = "small", className, ariaLabel, disabled, onCelebrate }: CelebrationButtonProps) {
  const [celebrating, setCelebrating] = useState(false);

  function celebrate() {
    onCelebrate?.();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), intensity === "milestone" ? 900 : 600);
  }

  const sparkles = intensity === "milestone" ? ["AI", "01", "$", "GO", "*"] : ["AI", "GO", "*"];
  const burstOffsets = intensity === "milestone" ? ["-62px", "-30px", "0px", "30px", "62px"] : ["-34px", "0px", "34px"];
  const classes = cn(
    "inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950 shadow-xl shadow-white/20 transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60",
    "hover:scale-[1.02] hover:bg-blue-50 active:scale-[0.99]",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    "motion-reduce:hover:scale-100 motion-reduce:transition-none",
    className
  );

  return (
    <span className="relative inline-flex">
      {href ? (
        <Link aria-label={ariaLabel} className={classes} href={href} onClick={celebrate}>
          {children}
        </Link>
      ) : (
        <button aria-label={ariaLabel} className={classes} disabled={disabled} type="button" onClick={celebrate}>
          {children}
        </button>
      )}
      {celebrating ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          {sparkles.map((sparkle, index) => (
            <span
              key={`${sparkle}-${index}`}
              className="skillpilot-confetti absolute left-1/2 top-1/2 rounded-full bg-cyan-200 px-1.5 py-0.5 text-[10px] font-black text-slate-950 shadow-lg"
              style={
                {
                  "--burst-x": burstOffsets[index],
                  "--burst-y": intensity === "milestone" ? "-84px" : "-68px"
                } as React.CSSProperties
              }
            >
              {sparkle}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
