"use client";

import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ink" | "twin" | "ghost" | "liked";
type Size = "md" | "lg" | "sm";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  full?: boolean;
  icon?: React.ReactNode;
};

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white",
  secondary: "bg-surface text-ink border border-line",
  ink: "bg-ink text-white",
  twin: "bg-twin text-white",
  ghost: "bg-transparent text-ink-2",
  /** a human decision already made (liked / match sent): accent, but quieter than primary */
  liked: "bg-accent-soft text-accent border border-accent",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-[13px] rounded-full",
  md: "h-14 px-6 text-[15px] rounded-[28px]",
  lg: "h-[60px] px-6 text-[16px] rounded-[28px]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  full,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-[transform,opacity,background-color] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        full && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-5" light={variant !== "secondary" && variant !== "ghost" && variant !== "liked"} /> : icon}
      {children}
    </button>
  );
}
