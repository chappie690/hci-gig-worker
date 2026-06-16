import { cn } from "@/lib/cn";

type AnimatedCardProps = React.HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "article" | "section";
};

export function AnimatedCard({ as = "div", className, ...props }: AnimatedCardProps) {
  const Component = as;

  return (
    <Component
      className={cn(
        "rounded-2xl border border-white/10 bg-white/95 shadow-2xl shadow-slate-950/20 transition duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-blue-950/30",
        "focus-within:ring-4 focus-within:ring-blue-200/70",
        className
      )}
      {...props}
    />
  );
}
