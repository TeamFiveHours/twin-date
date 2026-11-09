"use client";

import type { Mood } from "@/lib/types";
import { TwinAvatar } from "@/components/twin/TwinAvatar";
import { Button } from "./Button";

export function EmptyState({
  mood = "thinking",
  title,
  body,
  cta,
  onCta,
  ctaVariant = "secondary",
}: {
  mood?: Mood;
  title: string;
  body?: string;
  cta?: string;
  onCta?: () => void;
  ctaVariant?: "primary" | "secondary" | "twin" | "ink";
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <TwinAvatar who="me" mood={mood} size={96} />
      <h3 className="font-title mt-4 text-[18px] font-bold leading-snug text-ink">{title}</h3>
      {body && <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{body}</p>}
      {cta && onCta && (
        <Button variant={ctaVariant} size="sm" className="mt-5" onClick={onCta}>
          {cta}
        </Button>
      )}
    </div>
  );
}
