"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { TwinAvatar } from "@/components/twin/TwinAvatar";
import { LikeChip, ResultChip, type LikeState } from "@/components/ui/Chip";
import { aliasOf } from "@/lib/api";
import { dayLabel } from "@/lib/utils";
import type { Dialogue, Mood } from "@/lib/types";

/** Tile colour behind each other Twin's thumbnail (from the Pencil list). */
const TILE: Record<string, string> = {
  o1: "#E7C9A1",
  o2: "#D7DEE4",
  o3: "#CFE0C9",
  o4: "#ECD9BE",
  o5: "#CFC5EE",
  o6: "#F2D4CF",
  o7: "#D9E7E3",
  o8: "#E3D9C8",
};

const moodOf: Record<Dialogue["result"], Mood> = { good: "talking", meh: "neutral", bad: "resting" };

/**
 * Muted looping preview of the other Twin's panel (top half of the stacked
 * dialogue video). Plays only while on screen; starts at a per-card offset so
 * the list doesn't show eight identical frames.
 */
function ThumbVideo({ src, offset, focus, play }: { src: string; offset: number; focus?: string; play: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (play) void v.play().catch(() => {});
    else v.pause();
  }, [play]);
  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (v.duration) v.currentTime = offset % v.duration;
        if (play) void v.play().catch(() => {});
      }}
      className="absolute inset-0 size-full object-cover"
      style={{ objectPosition: focus ?? "50% 30%" }}
    />
  );
}

export function DialogueCard({
  d,
  index,
  isNew,
  like,
  chatId,
  playing = false,
  onVisible,
}: {
  d: Dialogue;
  index: number;
  isNew: boolean;
  /** my action on this person; null until I like or pass */
  like?: LikeState | null;
  /** the chat id once matched; drives the "See the match" link */
  chatId?: string | null;
  /** the feed lets one visible card preview at a time, like a video site */
  playing?: boolean;
  onVisible?: (id: string, visible: boolean) => void;
}) {
  const router = useRouter();
  const alias = aliasOf(d.otherId);
  const rootRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !onVisible) return;
    const io = new IntersectionObserver(([e]) => onVisible(d.id, e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => {
      io.disconnect();
      onVisible(d.id, false);
    };
  }, [d.id, onVisible]);
  return (
    <Link
      ref={rootRef}
      href={`/watch/${d.id}`}
      className="flex items-center gap-3 rounded-[20px] border border-line bg-surface p-2.5 active:bg-surface-2"
    >
      <div
        className="relative h-[132px] w-[100px] shrink-0 overflow-hidden rounded-2xl"
        style={{ backgroundColor: TILE[d.otherId] ?? "#E7C9A1" }}
      >
        <span className="absolute -left-2 top-10 size-[116px] rounded-full bg-white/25" />
        <span className="absolute left-0.5 top-[18px]">
          <TwinAvatar who="other" mood={moodOf[d.result]} size={96} halo={false} />
        </span>
        <ThumbVideo src={d.video.url} offset={index * 2.3} focus={d.video.thumbFocus} play={playing} />
        {isNew && (
          <span className="absolute left-2 top-2 rounded-md bg-accent px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-white">
            NEW
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
        {/* nickname stays whole; when both chips don't fit beside it they wrap under it */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15px] font-semibold text-ink">{alias}</span>
          <ResultChip result={d.result} />
          {like && <LikeChip state={like} />}
        </div>
        <p className="line-clamp-2 text-[13px] leading-[1.45] text-ink-2">{d.verdict}</p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-3">
            {d.lineCount} turns · {dayLabel(d.at)}
          </span>
          {like === "matched" && chatId && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/match/${chatId}`);
              }}
              className="flex items-center gap-[3px] text-[12px] font-semibold text-accent"
            >
              See the match <ArrowRight className="size-3" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
