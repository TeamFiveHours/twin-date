"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { TwinMini } from "@/components/twin/TwinMini";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { DialogueCard } from "@/components/watch/DialogueCard";
import { useAsync } from "@/hooks/useAsync";
import { useScreenState } from "@/hooks/useScreenState";
import * as api from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Dialogue } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "spark" | "liked";
type Sort = "recommended" | "newest";

const filters: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Spark", value: "spark" },
  { label: "Liked", value: "liked" },
];

const rank: Record<Dialogue["result"], number> = { good: 0, meh: 1, bad: 2 };
/** how long a set of thumbnails previews before the window moves on */
const PREVIEW_MS = 4000;
/** how many visible cards preview at the same time */
const PREVIEW_COUNT = 2;

function WatchInner() {
  const forced = useScreenState();
  const router = useRouter();
  const twin = useStore((s) => s.twin.name);
  const seen = useStore((s) => s.seen);
  const decisions = useStore((s) => s.decisions);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recommended");
  const home = useAsync(() => api.getHome(), [], { forced });
  const { data, loading } = useAsync(() => api.listDialogues("all"), [], { forced });

  const all = useMemo(() => (forced === "empty" ? [] : (data ?? [])), [data, forced]);
  const list = useMemo(() => {
    let l = all;
    if (filter === "spark") l = l.filter((d) => d.result === "good");
    if (filter === "liked") l = l.filter((d) => ["liked", "requested", "matched"].includes(api.likeStateForDialogue(d.id) ?? ""));
    if (sort === "recommended") l = [...l].sort((a, b) => rank[a.result] - rank[b.result] || b.at.localeCompare(a.at));
    return l;
    // decisions is read inside decisionForDialogue; keep it as a dep so the filter refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, filter, sort, decisions]);

  const empty = !loading && !!data && all.length === 0;

  // Like a video site: a couple of on-screen thumbnails preview at a time; the window slides every few seconds.
  const [visible, setVisible] = useState<string[]>([]);
  const [start, setStart] = useState(0);
  const onVisible = useCallback((id: string, on: boolean) => {
    setVisible((v) => (on ? (v.includes(id) ? v : [...v, id]) : v.filter((x) => x !== id)));
  }, []);
  const order = useMemo(() => list.map((d) => d.id).filter((id) => visible.includes(id)), [list, visible]);
  useEffect(() => {
    if (order.length <= PREVIEW_COUNT) return; // everything visible already plays
    const t = setInterval(() => setStart((s) => (s + PREVIEW_COUNT) % order.length), PREVIEW_MS);
    return () => clearInterval(t);
  }, [order]);
  const playingIds = useMemo(() => {
    if (order.length === 0) return new Set<string>();
    const ids = new Set<string>();
    for (let i = 0; i < Math.min(PREVIEW_COUNT, order.length); i++) ids.add(order[(start + i) % order.length]);
    return ids;
  }, [order, start]);

  return (
    <Screen tabs>
      <div className="flex flex-col gap-[18px]">
        {home.data?.pendingSurvey && (
          <Link href={`/survey/${home.data.pendingSurvey.meetingId}`}>
            <div className="flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3.5">
              <span className="flex-1 text-[14px] font-semibold text-ink">
                How did it go with {home.data.pendingSurvey.name}?
              </span>
              <ChevronRight className="size-[18px] text-accent" />
            </div>
          </Link>
        )}

        <div className="flex items-center justify-between">
          <h1 className="font-title text-[26px] font-bold text-ink">Feed</h1>
          <Link href="/me" aria-label={`${twin}'s page`} className="rounded-full active:scale-95">
            <TwinMini who="me" mood="happy" size={40} />
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "text-[14px] transition-colors",
                  filter === f.value ? "font-bold text-ink" : "font-medium text-ink-3",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSort(sort === "recommended" ? "newest" : "recommended")}
            className="flex items-center gap-1 rounded-full border border-line bg-surface py-1.5 pl-3 pr-2.5 text-[12px] font-semibold text-ink"
          >
            <ArrowUpDown className="size-[13px] text-ink-2" />
            {sort === "recommended" ? "Recommended" : "Newest"}
            <ChevronDown className="size-[13px] text-ink-3" />
          </button>
        </div>

        {loading || !data ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[154px] rounded-[20px]" />
            ))}
          </div>
        ) : empty ? (
          <EmptyState
            mood="thinking"
            title="Nothing in your feed yet"
            body="I'll bring you the first conversation within 24 hours."
            cta="Teach me in the meantime"
            onCta={() => router.push("/tune")}
          />
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink-3">
            {filter === "spark" ? "No sparks yet" : "You haven't liked anyone yet"}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((d, i) => (
              <DialogueCard
                key={d.id}
                d={d}
                index={i}
                isNew={!seen.includes(d.id)}
                like={api.likeStateForDialogue(d.id)}
                chatId={api.chatForDialogue(d.id)?.id ?? null}
                playing={playingIds.has(d.id)}
                onVisible={onVisible}
              />
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<Screen tabs>{null}</Screen>}>
      <WatchInner />
    </Suspense>
  );
}
