"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/layout/Screen";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton";
import { PersonPhoto } from "@/components/match/PersonPhoto";
import { useAsync } from "@/hooks/useAsync";
import { useScreenState } from "@/hooks/useScreenState";
import * as api from "@/lib/api";
import { clockTime, relTime } from "@/lib/utils";

function MatchInner() {
  const router = useRouter();
  const forced = useScreenState();
  const { data, loading } = useAsync(() => api.listChats(), [], { forced });

  const chats = forced === "empty" ? [] : (data ?? []);
  const isEmpty = !loading && chats.length === 0;

  return (
    <Screen tabs>
      <div className="flex items-end justify-between">
        <h1 className="font-title text-[26px] font-bold text-ink">Matches</h1>
        {!loading && (
          <span className="text-[13px] text-ink-3">
            {chats.length} mutual {chats.length === 1 ? "match" : "matches"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-5 flex flex-col gap-5">
          <Skeleton className="h-4 w-32" />
          <SkeletonRows rows={2} />
        </div>
      ) : isEmpty ? (
        <EmptyState
          mood="thinking"
          title="I haven't found anyone who clicked yet"
          body="I'm still talking to people. Check the feed in the meantime."
          cta="Open feed"
          onCta={() => router.push("/watch")}
        />
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          {chats.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-ink">You both said yes</h2>
                <span className="text-[12px] text-ink-3">Chat open</span>
              </div>
              {chats.map((c) => {
                const sameDay = new Date(c.lastAt).toDateString() === new Date().toDateString();
                return (
                  <Link
                    key={c.chat.id}
                    href={`/match/${c.chat.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 active:bg-surface-2"
                  >
                    <PersonPhoto src={c.person.photo} alt={c.person.name} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                        <span className="truncate">{c.person.name}</span>
                        {c.person.twinAlias && c.person.twinAlias !== c.person.name && (
                          <span className="shrink-0 rounded-full bg-twin-soft px-2 py-0.5 text-[11px] font-semibold text-twin">
                            {c.person.twinAlias}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[13px] text-ink-2">{c.lastMessage}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-[11px] text-ink-3">
                        {sameDay ? clockTime(c.lastAt) : relTime(c.lastAt)}
                      </span>
                      {c.meeting?.status === "confirmed" ? (
                        <Chip tone="good" small>Meeting set</Chip>
                      ) : c.unread ? (
                        <span className="size-2 rounded-full bg-accent" />
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </section>
          )}

        </div>
      )}
    </Screen>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <MatchInner />
    </Suspense>
  );
}
