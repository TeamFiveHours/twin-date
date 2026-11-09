"use client";

import { useCallback, useRef } from "react";
import type { Tag } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Marker = { time: number; tag: Tag; cueId: string };

const markerColor: Record<Tag, string> = {
  good: "bg-good",
  bad: "bg-warn",
  odd: "bg-white",
};

/**
 * Scrubbable progress rail with highlight markers.
 * `overlay` is the dark-stage styling from the Pencil player (white rail, accent played).
 */
export function Timeline({
  duration,
  current,
  buffered,
  markers,
  onSeek,
  onScrub,
  overlay,
}: {
  duration: number;
  current: number;
  buffered: number;
  markers: Marker[];
  onSeek: (t: number) => void;
  onScrub: (dragging: boolean) => void;
  overlay?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const safeDur = duration > 0 ? duration : 1;
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / safeDur) * 100))}%`;

  const timeFromEvent = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const x = Math.min(r.width, Math.max(0, clientX - r.left));
      return (x / r.width) * safeDur;
    },
    [safeDur],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    onScrub(true);
    onSeek(timeFromEvent(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    onSeek(timeFromEvent(e.clientX));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    onScrub(false);
  };

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Timeline"
      aria-valuemin={0}
      aria-valuemax={Math.round(safeDur)}
      aria-valuenow={Math.round(current)}
      className={cn("relative w-full touch-none select-none", overlay ? "h-6" : "h-7")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className={cn("absolute left-0 w-full rounded-full", overlay ? "top-[9px] h-1.5 bg-white/40" : "top-3 h-1 bg-line")} />
      <div
        className={cn("absolute left-0 rounded-full", overlay ? "top-[9px] h-1.5 bg-white/35" : "top-3 h-1 bg-ink-3/30")}
        style={{ width: pct(buffered) }}
      />
      <div
        className={cn("absolute left-0 rounded-full", overlay ? "top-[9px] h-1.5 bg-accent" : "top-3 h-1 bg-ink")}
        style={{ width: pct(current) }}
      />
      {markers.map((m) => (
        <button
          key={m.cueId}
          type="button"
          aria-label={`Jump to ${m.tag} moment`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onSeek(m.time)}
          className={cn(
            "absolute -translate-x-1/2 rounded-full border-2",
            overlay ? "top-[6px] size-3 border-[#0B0908]" : "top-2 size-3 border-bg",
            !overlay && m.tag === "odd" ? "bg-ink-3" : markerColor[m.tag],
          )}
          style={{ left: pct(m.time) }}
        />
      ))}
      <div
        className={cn(
          "pointer-events-none absolute -translate-x-1/2 rounded-full border-2 bg-white",
          overlay ? "top-1 size-4 border-accent shadow-md" : "top-1 size-5 border-ink",
        )}
        style={{ left: pct(current) }}
      />
    </div>
  );
}
