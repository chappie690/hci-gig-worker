"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, className, ...props }: InputProps) {
  const isPassword = props.type === "password";
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-2 text-sm font-medium text-ink dark:text-slate-100">
      <span>{label}</span>
      <span className="relative block">
        <input
          className={cn(
            "min-h-11 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:ring-4 focus:ring-limewash dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-950",
            isPassword && "pr-12",
            className
          )}
          {...props}
          type={isPassword ? (visible ? "text" : "password") : props.type}
        />
        {isPassword ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink/65 transition hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.8" />
      <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.7 4.1" />
      <path d="M6.1 6.1C3.4 8 2 12 2 12s3.5 8 10 8a10.8 10.8 0 0 0 5.9-1.7" />
    </svg>
  );
}
