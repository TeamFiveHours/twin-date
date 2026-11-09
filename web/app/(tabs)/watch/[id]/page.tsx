"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Heart, X, User } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { TopNav } from "@/components/layout/TopNav";
import { TwinMini } from "@/components/twin/TwinMini";
import { Button } from "@/components/ui/Button";
import { Chip, LikeChip, type ChipTone } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { StagePlayer } from "@/components/player/StagePlayer";
import { useAsync } from "@/hooks/useAsync";
import { useScreenState } from "@/hooks/useScreenState";
import * as api from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Result } from "@/lib/types";
import { cn, dayLabel } from "@/lib/utils";

const tag: Record<Result, { label: string; tone: ChipTone; box: string; text: string }> = {
  good: { label: "Spark", tone: "good", box: "bg-good-soft", text: "text-good" },
  meh: { label: "Mixed", tone: "warn", box: "bg-warn-soft", text: "text-warn" },
  bad: { label: "No spark", tone: "bad", box: "bg-surface-2", text: "text-ink-2" },
};

const LIVE_WINDOW_MS = 30 * 60 * 1000;

function WatchDetailInner() {
  const { id } = useParams<{ id: string }>();
  const forced = useScreenState();
  const router = useRouter();
  const twin = useStore((s) => s.twin.name);
  const setStore = useStore((s) => s.set);
  const { data, loading } = useAsync(() => api.getDialogue(id), [id], { forced });
  const [passed, setPassed] = useState(false);
  const [passing, setPassing] = useState(false);
  const [liking, setLiking] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // opening a conversation clears its NEW badge on the list
  useEffect(() => {
    if (!id) return;
    setStore((s) => (s.seen.includes(id) ? {} : { seen: [...s.seen, id] }));
  }, [id, setStore]);

  if (loading || (!data && forced === "loading")) {
    return (
      <Screen>
        <TopNav backHref="/watch" title=" " />
        <Skeleton className="aspect-[720/1120] rounded-3xl" />
        <Skeleton className="mt-4 h-24 rounded-2xl" />
      </Screen>
    );
  }
  if (!data || forced === "empty" || forced === "error") {
    return (
      <Screen>
        <TopNav backHref="/watch" />
        <EmptyState
          mood="awkward"
          title="I couldn't find that conversation"
          cta="Back to conversations"
          onCta={() => router.push("/watch")}
        />
      </Screen>
    );
  }

  const alias = api.aliasOf(data.otherId);
  const cand = api.candidateForDialogue(data.id, true);
  const decision = passed ? "no" : api.decisionForDialogue(data.id);
  const chat = cand ? api.chatForCandidate(cand.id) : null;
  const like = passed ? "passed" : api.likeStateForDialogue(data.id);

  /** "Match" here records a like and opens the profile, where the Match is confirmed. */
  const likeAndSee = async () => {
    if (!cand || liking) return;
    setLiking(true);
    await api.decide(cand.id, "liked");
    router.push(`/match/pick?c=${cand.id}`);
  };
  const live = Date.now() - new Date(data.at).getTime() < LIVE_WINDOW_MS;
  const t = tag[data.result];

  return (
    <Screen>
      <TopNav
        backHref="/watch"
        center={
          <div>
            <div className="truncate text-[15px] font-semibold text-ink">
              {twin} ↔ {alias}
            </div>
            <div className="text-[11px] text-ink-3">
              {live ? `Live · ${data.lineCount} turns in` : `${dayLabel(data.at)} · ${data.lineCount} turns`}
            </div>
          </div>
        }
        right={
          <div className="flex items-center gap-1.5">
            {like && <LikeChip state={like} small={false} />}
            <Chip tone={t.tone}>{t.label}</Chip>
          </div>
        }
      />

      <div className="mt-2 flex flex-col gap-4">
        <StagePlayer
          dialogue={data}
          alias={alias}
          twin={twin}
          onEnded={() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
        />

        <div ref={summaryRef} className={cn("flex flex-col gap-2 rounded-2xl p-4", t.box)}>
          <div className="flex items-center gap-2">
            <TwinMini who="me" size={24} />
            <span className={cn("text-[12px] font-semibold", t.text)}>{twin}&apos;s take</span>
          </div>
          <p className="text-[14px] leading-[1.5] text-ink">{data.verdict}</p>
        </div>

        {cand && (
          <div className="flex flex-col items-center gap-3">
            {!decision ? (
              <div className="flex w-full gap-3">
                <Button
                  variant="secondary"
                  loading={passing}
                  disabled={liking}
                  icon={<X className="size-4" />}
                  onClick={async () => {
                    setPassing(true);
                    await api.decide(cand.id, "no");
                    setPassing(false);
                    setPassed(true);
                    toast("Okay, passing");
                  }}
                  className="flex-1"
                >
                  Pass
                </Button>
                <Button
                  loading={liking}
                  disabled={passing}
                  icon={<Heart className="size-4" fill="currentColor" />}
                  onClick={likeAndSee}
                  className="flex-[1.4]"
                >
                  Match
                </Button>
              </div>
            ) : decision === "yes" && chat ? (
              <Button full icon={<ArrowRight className="size-4" />} onClick={() => router.push(`/match/${chat.id}`)}>
                Open chat with {cand.name}
              </Button>
            ) : decision === "no" ? (
              <Button
                full
                variant="secondary"
                icon={<User className="size-4" />}
                onClick={() => router.push(`/match/pick?c=${cand.id}`)}
              >
                Open profile
              </Button>
            ) : (
              // liked / match sent: the button itself says where I stand
              <Button
                full
                variant="liked"
                icon={<Heart className="size-4" fill="currentColor" />}
                onClick={() => router.push(`/match/pick?c=${cand.id}`)}
              >
                {decision === "liked" ? "Liked · Open profile" : "Match sent · Open profile"}
              </Button>
            )}
            {decision === "liked" && (
              <span className="text-[13px] font-semibold text-ink-3">Tap Match on {cand.name}&apos;s profile to open a chat</span>
            )}
            {decision === "yes" && !chat && (
              <span className="text-[13px] font-semibold text-ink-3">Waiting for {cand.name} to answer</span>
            )}
            {decision === "yes" && chat && (
              <button
                type="button"
                onClick={() => router.push(`/match/pick?c=${cand.id}`)}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-3"
              >
                <User className="size-3.5" />
                See {cand.name}&apos;s profile
              </button>
            )}
            {decision === "no" && <span className="text-[13px] font-semibold text-ink-3">You passed</span>}
          </div>
        )}
      </div>
    </Screen>
  );
}

export default function WatchDetailPage() {
  return (
    <Suspense fallback={<Screen>{null}</Screen>}>
      <WatchDetailInner />
    </Suspense>
  );
}
