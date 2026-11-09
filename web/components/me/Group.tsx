"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 text-[12px] font-semibold text-ink-3">{label}</div>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
    </section>
  );
}

export function Row({
  title,
  value,
  onClick,
  danger,
}: {
  title: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2"
    >
      <span className={cn("flex-1 text-[14px] font-medium", danger ? "text-accent" : "text-ink")}>{title}</span>
      {value && <span className="text-[12px] text-ink-3">{value}</span>}
      <ChevronRight className="size-4 shrink-0 text-ink-3" />
    </button>
  );
}
