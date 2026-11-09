"use client";

import { useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Heart, UserRound } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { TopNav } from "@/components/layout/TopNav";
import { TwinMini } from "@/components/twin/TwinMini";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { StagePlayer } from "@/components/player/StagePlayer";
import { useAsync } from "@/hooks/useAsync";
import { chatForCandidate } from "@/lib/api";
import { mockCuesFor } from "@/lib/feed-cues";
import { getFeed } from "@/lib/feed-client";
import { FEED_RESULT_META } from "@/lib/feed-types";
import { useStore } from "@/lib/store";
import type { Dialogue, Result } from "@/lib/types";

const legacyResult: Record<string, Result> = { SPARK: "good", MIXED: "meh", NO_SPARK: "bad" };

export default function WatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const twinName = useStore((s) => s.twin.name);
  const setStore = useStore((s) => s.set);
  const decision = useStore((s) => s.decisions[id]);
  const summaryRef = useRef<HTMLDivElement>(null);
  const { data, loading, error, reload } = useAsync(() => getFeed(id), [id]);

  useEffect(() => {
    setStore((s) => s.seen.includes(id) ? {} : { seen: [...s.seen, id] });
  }, [id, setStore]);

  const dialogue = useMemo<Dialogue | null>(() => {
    if (!data?.video_url) return null;
    // captions and highlight markers come from the mock transcripts of the same videos
    const { cues, highlights, durationSec } = mockCuesFor(data.result);
    return {
      id: data.id, otherId: data.profile_id, at: new Date(0).toISOString(),
      result: legacyResult[data.result], verdict: data.momo_take,
      video: { url: data.video_url, durationSec, aspect: "1080 / 1920", native: true },
      cues, highlights, durationSec, lineCount: data.turn_count,
    };
  }, [data]);

  if (loading) return (
    <Screen><TopNav backHref="/watch" /><Skeleton className="mt-4 aspect-[9/16] rounded-3xl" /><Skeleton className="mt-4 h-24 rounded-2xl" /></Screen>
  );
  if (error || !data) return (
    <Screen><TopNav backHref="/watch" />
      <div className="py-10 text-center text-sm text-ink-2">{error ? "Could not load conversation." : "Conversation not found."}</div>
      {error && <button onClick={reload} className="block w-full text-center font-semibold text-accent">Retry</button>}
    </Screen>
  );

  const meta = FEED_RESULT_META[data.result];
  const goProfile = () => router.push(`/profile/${data.id}`);
  const like = () => {
    setStore((s) => ({ decisions: { ...s.decisions, [id]: "liked" } }));
    goProfile();
  };
  const chat = decision === "yes" ? chatForCandidate(id) : null;

  return (
    <Screen>
      <TopNav
        backHref="/watch"
        center={<div><div className="font-semibold text-ink">{twinName} ↔ {data.twin_name}</div><div className="text-[11px] text-ink-3">{data.turn_count} turns</div></div>}
        right={<Chip tone={meta.tone}>{meta.label}</Chip>}
      />
      <div className="mt-3 flex flex-col gap-4">
        {dialogue ? (
          <StagePlayer dialogue={dialogue} alias={data.twin_name} twin={twinName} onEnded={() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} />
        ) : (
          <div className="rounded-2xl bg-surface-2 p-5 text-center text-sm text-ink-3">Video not uploaded yet</div>
        )}
        <div ref={summaryRef} className={`rounded-2xl p-4 ${data.result === "SPARK" ? "bg-good-soft" : data.result === "MIXED" ? "bg-warn-soft" : "bg-surface-2"}`}>

          <div className="mb-2 flex items-center gap-2"><TwinMini who="me" size={24} /><span className="text-[13px] font-semibold text-twin">{twinName}&apos;s take</span></div>
          <p className="text-[14px] leading-[1.5] text-ink">{data.momo_take}</p>
        </div>
        {decision === "yes" && chat ? (
          <Button full size="lg" icon={<ArrowRight className="size-5" />} onClick={() => router.push(`/match/${chat.id}`)}>
            Open chat with {data.profiles.name}
          </Button>
        ) : decision === "liked" || decision === "yes" ? (
          <Button full variant="liked" icon={<Heart className="size-4" fill="currentColor" />} onClick={goProfile}>
            {decision === "liked" ? "Liked · Open profile" : "Match · Open profile"}
          </Button>
        ) : decision === "no" ? (
          <Button full variant="secondary" icon={<UserRound className="size-4" />} onClick={goProfile}>Passed · Open profile</Button>
        ) : (
          // Pass / Match are decided on the profile; this just records the like and opens it
          <Button full size="lg" icon={<Heart className="size-5" fill="currentColor" />} onClick={like}>Like &amp; Open Profile</Button>
        )}
      </div>
    </Screen>
  );
}
