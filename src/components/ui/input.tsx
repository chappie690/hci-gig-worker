import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, className, ...props }: InputProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink dark:text-slate-100">
      <span>{label}</span>
      <input
        className={cn(
          "min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:ring-4 focus:ring-limewash dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-950",
          className
        )}
        {...props}
      />
    </label>
  );
}
