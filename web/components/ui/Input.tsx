"use client";

import { cn } from "@/lib/utils";

export function Input({
  label,
  className,
  invalid,
  shake,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  invalid?: boolean;
  shake?: boolean;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[12px] font-semibold text-ink-3">{label}</span>}
      <input
        className={cn(
          "h-14 w-full rounded-2xl border bg-surface px-4 text-[15px] text-ink outline-none transition-[border-color,box-shadow]",
          invalid ? "border-accent" : "border-line focus:border-accent focus:shadow-[0_0_0_0.5px_var(--accent)]",
          shake && "animate-shake",
          className,
        )}
        {...rest}
      />
    </label>
  );
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-accent focus:shadow-[0_0_0_0.5px_var(--accent)]",
        className,
      )}
      {...rest}
    />
  );
}
