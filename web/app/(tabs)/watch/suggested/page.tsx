"use client";

import { Suspense, useState } from "react";
import { Screen } from "@/components/layout/Screen";
import { TopNav } from "@/components/layout/TopNav";
import { TwinMini } from "@/components/twin/TwinMini";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useAsync } from "@/hooks/useAsync";
import { useScreenState } from "@/hooks/useScreenState";
import * as api from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Suggested } from "@/lib/types";

const filters = ["All", "Nearby", "Shared interests", "New here"] as const;
type Filter = (typeof filters)[number];

function apply(list: Suggested[], f: Filter) {
  if (f === "Nearby") return list.filter((s) => s.distanceMi < 1);
  return list;
}

function SuggestedInner() {
  const forced = useScreenState();
  const twin = useStore((s) => s.twin.name);
  const [filter, setFilter] = useState<Filter>("All");
  const { data, loading } = useAsync(() => api.getSuggested(), [], { forced });
  const rows = forced === "empty" ? [] : apply(data ?? [], filter);

  return (
    <Screen tabs>
      <TopNav backHref="/watch" title="Suggested for you" subtitle={`People ${twin} can strike up a conversation with first`} />
      <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
        {filters.map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>
      <div className="mt-4">
        {loading || !data ? (
          <SkeletonRows rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState mood="thinking" title="No one here yet" body="I'll keep looking and let you know." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {rows.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3">
                <TwinMini who="other" size={44} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-ink">
                    {s.alias} · {s.age}
                  </div>
                  <div className="truncate text-[12px] text-ink-2">{s.bio}</div>
                </div>
                {s.twinActive ? (
                  <Chip tone="good" small icon={<span className="size-1.5 rounded-full bg-good" />}>
                    Twin active
                  </Chip>
                ) : (
                  <Chip small>{s.distanceMi} mi</Chip>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}

export default function SuggestedPage() {
  return (
    <Suspense fallback={<Screen tabs>{null}</Screen>}>
      <SuggestedInner />
    </Suspense>
  );
}
