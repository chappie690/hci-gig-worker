import Link from "next/link";
import { cloneElement } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  asChild?: false;
};

type ButtonLinkProps = {
  variant?: "primary" | "secondary";
  className?: string;
  asChild: true;
  children: React.ReactElement<React.ComponentProps<typeof Link>>;
};

const variants = {
  primary: "bg-ink text-white hover:bg-ink/90 dark:bg-blue-600 dark:hover:bg-blue-500",
  secondary: "border border-ink/15 bg-white text-ink hover:bg-limewash dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
};

export function Button(props: ButtonProps | ButtonLinkProps) {
  const variant = props.variant ?? "primary";
  const className = cn(
    "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:active:scale-100",
    variants[variant],
    "className" in props ? props.className : undefined
  );

  if (props.asChild) {
    return cloneElement(props.children, {
      className: cn(className, props.children.props.className)
    });
  }

  const { asChild, ...buttonProps } = props;
  return <button {...buttonProps} className={className} />;
}
