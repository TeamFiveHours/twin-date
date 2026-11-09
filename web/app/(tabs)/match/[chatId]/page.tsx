"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ChevronRight, Coffee, Heart, Image as ImageIcon } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { TopNav } from "@/components/layout/TopNav";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { PersonPhoto } from "@/components/match/PersonPhoto";
import { useAsync } from "@/hooks/useAsync";
import { useScreenState } from "@/hooks/useScreenState";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";
import { cn, dayLabel, relTime } from "@/lib/utils";

function ChatInner({ chatId }: { chatId: string }) {
  const router = useRouter();
  const forced = useScreenState();
  const twinName = useStore((s) => s.twin.name);
  const { data, setData, loading } = useAsync(() => api.getChat(chatId), [chatId], { forced });
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const chat = data?.chat;
  const dialogueId = chat ? api.dialogueForCandidate(chat.candidateId) : null;
  const messages = forced === "empty" ? [] : (chat?.messages ?? []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typing]);

  useEffect(() => {
    if (!loading && data === null) router.replace("/match");
  }, [loading, data, router]);

  const send = async () => {
    const t = text.trim();
    if (!t || !chat || typing) return;
    setText("");
    const next = await api.sendMessage(chat.id, t);
    setData((d) => (d ? { ...d, chat: next } : d));
    setTyping(true);
    const withReply = await api.awaitReply(chat.id);
    setTyping(false);
    setData((d) => (d ? { ...d, chat: withReply } : d));
  };

  if (loading || !data) {
    return (
      <Screen tabs>
        <TopNav backHref="/match" center={<Skeleton className="h-9 w-40" />} />
        <Skeleton className="mt-2 h-16" />
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-10 w-3/5" />
          <Skeleton className="ml-auto h-10 w-1/2" />
          <Skeleton className="h-10 w-2/5" />
        </div>
      </Screen>
    );
  }

  const { person, meeting } = data;
  const confirmed = meeting?.status === "confirmed" && meeting.chosen !== undefined
    ? meeting.proposals[meeting.chosen]
    : null;
  const showOpener = !chat?.openerUsed && chat && chat.opener.length > 0;

  // group messages by day
  const groups: { day: string; items: typeof messages }[] = [];
  for (const m of messages) {
    const day = dayLabel(m.at);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(m);
    else groups.push({ day, items: [m] });
  }

  return (
    <Screen noPad className="px-5 pt-2 pb-[176px]">
      <TopNav
        backHref="/match"
        center={
          <button
            type="button"
            aria-label={`See ${person.name}'s profile`}
            onClick={() => chat && router.push(`/profile/${chat.candidateId}`)}
            className="flex min-w-0 items-center gap-2.5 text-left active:opacity-80"
          >
            <PersonPhoto src={person.photo} alt={person.name} size={36} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                <span className="truncate">{person.name}</span>
                {person.twinAlias && person.twinAlias !== person.name && (
                  <span className="shrink-0 rounded-full bg-twin-soft px-1.5 py-px text-[10px] font-semibold text-twin">
                    {person.twinAlias}
                  </span>
                )}
              </div>
              <div className="truncate text-[11px] text-good">
                Matched {chat ? relTime(chat.matchedAt) : ""}
              </div>
            </div>
          </button>
        }
        right={
          confirmed ? (
            <Chip tone="good" small>
              {confirmed.when} · {confirmed.place}
            </Chip>
          ) : (
            <Chip tone="accent" icon={<Coffee className="size-3.5" />} onClick={() => router.push(`/match/${chatId}/plan`)}>
              Meet up?
            </Chip>
          )
        }
      />

      {/* what the Twins talked about: opens the dialogue replay when there is one */}
      <button
        type="button"
        disabled={!dialogueId}
        onClick={() => dialogueId && router.push(`/watch/${dialogueId}`)}
        className="mt-1 flex w-full items-center gap-2.5 rounded-[14px] bg-twin-soft px-3.5 py-3 text-left active:opacity-80 disabled:active:opacity-100"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface">
          <Heart className="size-4 text-accent" fill="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-twin">Here&apos;s what your Twins talked about</div>
          <div className="truncate text-[12px] text-ink-2">{chat?.pinnedKeywords}</div>
        </div>
        {dialogueId && <ChevronRight className="size-4 shrink-0 text-twin" />}
      </button>

      <div className="mt-4 flex flex-col gap-2.5">
        {groups.map((g) => (
          <div key={g.day} className="flex flex-col gap-2.5">
            <div className="text-center text-[11px] text-ink-3">{g.day}</div>
            {g.items.map((m) => (
              <div key={m.id} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[240px] px-3.5 py-2.5 text-[14px] leading-[1.45]",
                    m.from === "me"
                      ? "rounded-[18px_18px_4px_18px] bg-accent text-white"
                      : "rounded-[18px_18px_18px_4px] border border-line bg-surface text-ink",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-[18px_18px_18px_4px] border border-line bg-surface px-3.5 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot size-1.5 rounded-full bg-ink-3" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="app-fixed fixed inset-x-0 bottom-[88px] z-30 flex justify-center">
        <div className="w-full min-[480px]:max-w-[390px] bg-bg px-5 pb-2 pt-2">
          {showOpener && (
            <div className="mb-2.5">
              <div className="mb-2 text-[11px] font-semibold text-ink-3">
                {twinName}&apos;s icebreaker ideas · one time only
              </div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {chat.opener.map((o) => (
                  <Chip key={o} outline="twin" onClick={() => setText(o)}>
                    {o}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          <form
            className="flex items-center gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label className="flex h-12 flex-1 items-center gap-2.5 rounded-full border border-line bg-surface px-4">
              <ImageIcon className="size-[18px] shrink-0 text-ink-3" />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Message"
                className="h-full w-full bg-transparent text-[14px] text-ink outline-none"
              />
            </label>
            <button
              type="submit"
              aria-label="Send"
              disabled={!text.trim() || typing}
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-white disabled:opacity-40"
            >
              <ArrowUp className="size-5" />
            </button>
          </form>
        </div>
      </div>
    </Screen>
  );
}

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <ChatInner chatId={chatId} />
    </Suspense>
  );
}
