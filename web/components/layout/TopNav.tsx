"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function TopNav({
  title,
  subtitle,
  center,
  right,
  onBack,
  backHref,
  className,
}: {
  title?: string;
  subtitle?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  onBack?: () => void;
  backHref?: string;
  className?: string;
}) {
  const router = useRouter();
  const back = () => {
    if (onBack) return onBack();
    if (backHref) return router.push(backHref);
    router.back();
  };
  return (
    <div className={cn("flex h-12 items-center gap-2", className)}>
      <button
        type="button"
        onClick={back}
        aria-label="Back"
        className="-ml-2 flex size-10 items-center justify-center rounded-full text-ink active:bg-surface-2"
      >
        <ChevronLeft className="size-6" />
      </button>
      <div className="min-w-0 flex-1">
        {center ?? (
          <>
            {title && <div className="truncate text-[16px] font-semibold text-ink">{title}</div>}
            {subtitle && <div className="truncate text-[12px] text-ink-3">{subtitle}</div>}
          </>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
