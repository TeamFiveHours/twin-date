"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Chip, LikeChip } from "@/components/ui/Chip";
import { FEED_RESULT_META, type FeedItem } from "@/lib/feed-types";

type Decision = "liked" | "yes" | "no" | undefined;

export function FeedCard({ feed, decision, isNew }: { feed: FeedItem; decision: Decision; isNew: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.35 });
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [feed.video_url]);

  const meta = FEED_RESULT_META[feed.result];
  return (
    <Link href={`/watch/${feed.id}`} className="flex items-center gap-3 rounded-[20px] border border-line bg-surface p-2.5 active:bg-surface-2">
      <div className="relative h-[132px] w-[100px] shrink-0 overflow-hidden rounded-2xl bg-surface-2">
        {feed.video_url ? (
          <video
            ref={videoRef}
            src={feed.video_url}
            muted loop playsInline preload="metadata"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-ink-3">No video</div>
        )}
        {isNew && <span className="absolute left-2 top-2 rounded-md bg-accent px-2 py-1 text-[9px] font-bold text-white">NEW</span>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-ink">{feed.twin_name}</span>
          <Chip tone={meta.tone} small>{meta.label}</Chip>
          {decision === "liked" && <LikeChip state="liked" />}
          {decision === "yes" && <LikeChip state="requested" />}
          {decision === "no" && <LikeChip state="passed" />}
        </div>
        <p className="line-clamp-2 text-[13px] leading-[1.45] text-ink-2">{feed.momo_take}</p>
        <div className="text-[11px] text-ink-3">{feed.turn_count} turns</div>
      </div>
    </Link>
  );
}
