"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Heart, X } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { MatchOverlay } from "@/components/match/MatchOverlay";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";
import type { Candidate } from "@/lib/types";
import { cn } from "@/lib/utils";

const NO_REASONS = ["Photos", "The conversation", "Dealbreaker", "Just not it"];

function PhotoCarousel({ photos, name, age, school }: { photos: string[]; name: string; age: number; school: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <div className="relative h-[340px] w-full bg-surface-2">
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto"
      >
        {photos.map((p, i) => (
          <div key={p} className="relative h-full w-full shrink-0 snap-center">
            <Image src={p} alt={`${name} photo ${i + 1}`} fill sizes="(min-width: 480px) 390px, 100vw" className="object-cover" priority={i === 0} />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[140px] bg-gradient-to-b from-transparent to-[#000000A6]" />
      <div className="pointer-events-none absolute bottom-4 left-4 right-4">
        <div className="font-title text-[24px] font-bold text-white">
          {name}, {age}
        </div>
        <div className="text-[13px] text-white/85">{school}</div>
      </div>
      {photos.length > 1 && (
        <div className="pointer-events-none absolute right-4 top-3 flex gap-1.5">
          {photos.map((_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full bg-white/90 transition-all", i === idx ? "w-4" : "w-1.5 opacity-60")} />
          ))}
        </div>
      )}
    </div>
  );
}

function PickInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const requested = sp.get("c");
  const twinName = useStore((s) => s.twin.name);
  const decisions = useStore((s) => s.decisions);

  const [cand, setCand] = useState<Candidate | null>(null);
  const [left, setLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noSheet, setNoSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [matched, setMatched] = useState<{ photo: string; name: string } | null>(null);
  /** set when the requested candidate was already decided: the card is read-only */
  const decided = requested ? (decisions[requested] ?? null) : null;
  const decidedChat = decided && requested ? api.chatForCandidate(requested) : null;

  const loadNext = useCallback(async (preferId?: string | null) => {
    setLoading(true);
    const list = await api.getCandidates();
    setLeft(list.length);
    const pick = (preferId && list.find((c) => c.id === preferId)) || list[0] || null;
    if (!pick) {
      router.replace("/match");
      return;
    }
    setCand(pick);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (requested && decided) {
      const c = api.candidateById(requested);
      if (!c) {
        router.replace("/match");
        return;
      }
      setCand(c);
      setLoading(false);
      return;
    }
    void loadNext(requested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  const sayNo = async (reason?: string) => {
    if (!cand) return;
    setNoSheet(false);
    setBusy(true);
    await api.decide(cand.id, "no", reason);
    setBusy(false);
    toast("Okay, passing");
    await loadNext();
  };

  const sayYes = async () => {
    if (!cand) return;
    setBusy(true);
    const res = await api.decide(cand.id, "yes");
    if (res.matched && res.chatId) {
      setMatched({ photo: cand.photos[0], name: cand.name });
      setTimeout(() => router.replace(`/match/${res.chatId}`), 1500);
      return;
    }
    if (decided) {
      // re-liking from the read-only card: stay on this person, the store flips the card to "Liked · waiting"
      setBusy(false);
      toast(`Match sent. I'll tell you when ${cand.name} answers`);
      return;
    }
    setWaiting(true);
    toast("Sent. I'll tell you when they answer");
    setTimeout(async () => {
      setWaiting(false);
      setBusy(false);
      await loadNext();
    }, 1200);
  };

  return (
    <Screen>
      <TopNav onBack={() => router.back()} />
      <div className="flex items-end justify-between">
        <h1 className="font-title text-[26px] font-bold text-ink">Your pick</h1>
        {!loading && !decided && (
          <span className="text-[13px] text-ink-3">
            {left} {left === 1 ? "candidate" : "candidates"} left today
          </span>
        )}
      </div>

      {loading || !cand ? (
        <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-surface">
          <Skeleton className="h-[340px] rounded-none" />
          <div className="flex flex-col gap-3 p-[18px]">
            <Skeleton className="h-16" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      ) : (
        <>
          <div className="relative mt-4 overflow-hidden rounded-3xl border border-line bg-surface">
            <PhotoCarousel photos={cand.photos} name={cand.name} age={cand.age} school={cand.school} />
            {waiting && (
              <div className="absolute left-4 top-3 animate-fade-in">
                <Chip tone="warn">Waiting for their answer</Chip>
              </div>
            )}
            <div className="flex flex-col gap-3.5 p-[18px]">
              <div className="rounded-[14px] bg-good-soft p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-twin" />
                  <span className="text-[12px] font-semibold text-twin">{twinName}&apos;s one-liner</span>
                </div>
                <p className="text-[14px] font-semibold leading-[1.45] text-ink">{cand.whyLine}</p>
              </div>
              <div className="h-px bg-line" />
              <p className="text-[14px] leading-relaxed text-ink-2">{cand.bio}</p>
            </div>
          </div>

          {decided ? (
            <div className="mt-4 flex flex-col items-center gap-3">
              {decided === "yes" && decidedChat ? (
                <Button full size="lg" icon={<ArrowRight className="size-5" />} onClick={() => router.push(`/match/${decidedChat.id}`)}>
                  Open chat with {cand.name}
                </Button>
              ) : decided === "liked" ? (
                <>
                  <Button
                    full
                    size="lg"
                    icon={<Heart className="size-5" fill="currentColor" />}
                    loading={busy}
                    onClick={sayYes}
                  >
                    Match with {cand.name}
                  </Button>
                  <p className="text-center text-[12px] text-ink-3">
                    A chat opens the moment you both say yes. {cand.name} is never told about a No.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      await api.decide(cand.id, "no");
                      setBusy(false);
                      toast("Okay, passing");
                      router.back();
                    }}
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                    Doesn&apos;t seem like a match
                  </button>
                </>
              ) : decided === "yes" ? (
                <>
                  <Chip tone="accent" icon={<Heart className="size-3" fill="currentColor" />}>
                    Match sent · waiting for {cand.name}
                  </Chip>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      await api.decide(cand.id, "no");
                      setBusy(false);
                      toast("Okay, passing");
                      router.back();
                    }}
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                    Doesn&apos;t seem like a match
                  </button>
                </>
              ) : (
                <>
                  <Chip>You passed on {cand.name}</Chip>
                  <Button
                    full
                    size="lg"
                    icon={<Heart className="size-5" fill="currentColor" />}
                    loading={busy}
                    onClick={sayYes}
                  >
                    Changed my mind—Match with {cand.name}
                  </Button>
                  <p className="text-center text-[12px] text-ink-3">
                    A chat opens the moment you both say yes.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="mt-4 flex gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  full
                  className="text-ink-2"
                  icon={<X className="size-5" />}
                  disabled={busy}
                  onClick={() => setNoSheet(true)}
                >
                  No
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  full
                  icon={<Heart className="size-5" />}
                  loading={busy && !waiting}
                  disabled={waiting}
                  onClick={sayYes}
                >
                  Match
                </Button>
              </div>
              <p className="mt-3 text-center text-[12px] text-ink-3">
                A chat only opens when you both say Yes. {cand.name} is never told about a No.
              </p>
            </>
          )}
        </>
      )}

      <BottomSheet open={noSheet} onClose={() => setNoSheet(false)}>
        <h3 className="font-title text-[20px] font-bold text-ink">What was it?</h3>
        <p className="mt-1 text-[13px] text-ink-2">Only I see this. It helps me pick better next time.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {NO_REASONS.map((r) => (
            <Chip key={r} onClick={() => sayNo(r)}>
              {r}
            </Chip>
          ))}
        </div>
        <button type="button" onClick={() => sayNo()} className="mt-5 w-full py-2 text-center text-[13px] font-semibold text-ink-3">
          Skip
        </button>
      </BottomSheet>

      {matched && <MatchOverlay photo={matched.photo} name={matched.name} />}
    </Screen>
  );
}

export default function PickPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <PickInner />
    </Suspense>
  );
}
