"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { TwinMini } from "@/components/twin/TwinMini";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { FeedCard } from "@/components/watch/FeedCard";
import { useAsync } from "@/hooks/useAsync";
import { getFeeds } from "@/lib/feed-client";
import { FEED_RESULT_META } from "@/lib/feed-types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Filter = "all" | "spark" | "liked";

export default function WatchPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [recommended, setRecommended] = useState(true);
  const twinName = useStore((s) => s.twin.name);
  const decisions = useStore((s) => s.decisions);
  const seen = useStore((s) => s.seen);
  const { data, loading, error, reload } = useAsync(getFeeds, []);

  const list = useMemo(() => {
    let rows = data ?? [];
    if (filter === "spark") rows = rows.filter((d) => d.result === "SPARK");
    if (filter === "liked") rows = rows.filter((d) => ["liked", "yes"].includes(decisions[d.id] ?? ""));
    return [...rows].sort((a, b) => recommended
      ? FEED_RESULT_META[a.result].rank - FEED_RESULT_META[b.result].rank || a.display_order - b.display_order
      : a.display_order - b.display_order,
    );
  }, [data, filter, recommended, decisions]);

  return (
    <Screen tabs>
      <div className="flex flex-col gap-[18px]">
        <div className="flex items-center justify-between">
          <h1 className="font-title text-[26px] font-bold text-ink">Feed</h1>
          <Link href="/me" aria-label={`${twinName}'s page`}><TwinMini who="me" mood="happy" size={40} /></Link>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(["all", "spark", "liked"] as const).map((f) => (
              <button
                key={f} type="button" onClick={() => setFilter(f)}
                className={cn("text-[14px] capitalize", filter === f ? "font-bold text-ink" : "font-medium text-ink-3")}
              >{f === "all" ? "All" : f === "spark" ? "Spark" : "Liked"}</button>
            ))}
          </div>
          <button type="button" onClick={() => setRecommended((v) => !v)} className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink">
            <ArrowUpDown className="size-[13px]" /> {recommended ? "Recommended" : "Feed order"}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[154px] rounded-[20px]" />)}</div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-ink-2">Could not load feed. Check the Supabase environment variables and API logs.</p>
            <button onClick={reload} className="mt-3 font-semibold text-accent">Retry</button>
          </div>
        ) : !data?.length ? (
          <EmptyState mood="thinking" title="No conversations in the feed" body="Check the feed_items table in Supabase." />
        ) : !list.length ? (
          <p className="py-8 text-center text-[13px] text-ink-3">{filter === "spark" ? "No sparks yet" : "You haven't liked anyone yet"}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((feed) => <FeedCard key={feed.id} feed={feed} decision={decisions[feed.id]} isNew={!seen.includes(feed.id)} />)}
          </div>
        )}
      </div>
    </Screen>
  );
}
