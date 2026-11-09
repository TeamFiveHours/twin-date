"use client";

import { Suspense, use, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, MapPin } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { TwinMini } from "@/components/twin/TwinMini";
import { useAsync } from "@/hooks/useAsync";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";
import type { Meeting } from "@/lib/types";
import { cn } from "@/lib/utils";

function nextSaturday14() {
  const d = new Date();
  const day = d.getDay();
  const add = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  d.setHours(14, 0, 0, 0);
  return d;
}

function icsStamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

function downloadIcs(title: string, place: string) {
  const start = nextSaturday14();
  const end = new Date(start.getTime() + 90 * 60000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TwinDate//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@twindate`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${title}`,
    `LOCATION:${place}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "twindate-date.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PlanInner({ chatId }: { chatId: string }) {
  const router = useRouter();
  const twinName = useStore((s) => s.twin.name);
  const { data, loading } = useAsync(
    async () => {
      const [chat, meeting] = await Promise.all([api.getChat(chatId), api.getProposals(chatId)]);
      return { chat, meeting };
    },
    [chatId],
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState(false);
  const [place, setPlace] = useState("");
  const [when, setWhen] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Meeting | null>(null);

  const name = data?.chat?.person.name ?? "them";
  const already = data?.meeting.status === "confirmed" ? data.meeting : null;
  const result = done ?? already;
  const chosen = result && result.chosen !== undefined ? result.proposals[result.chosen] : null;

  const canSend = custom ? place.trim() && when.trim() : selected !== null;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    const m = await api.proposeMeeting(
      chatId,
      custom ? { place: place.trim(), when: when.trim(), why: "Your pick" } : (selected as number),
    );
    setSending(false);
    setDone(m);
  };

  const close = () => router.replace(`/match/${chatId}`);

  return (
    <div className="relative min-h-dvh bg-bg">
      {/* dimmed backdrop standing in for the chat */}
      <div className="safe-top px-5 pt-14 blur-sm" aria-hidden>
        <div className="flex items-center gap-2.5 rounded-[14px] bg-twin-soft px-3.5 py-3">
          <TwinMini who="me" />
          <div className="flex-1">
            <div className="text-[12px] font-semibold text-twin">Here&apos;s what your Twins talked about</div>
            <div className="text-[12px] text-ink-2">{data?.chat?.chat.pinnedKeywords ?? ""}</div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-10 w-3/5 rounded-[18px]" />
          <Skeleton className="ml-auto h-10 w-1/2 rounded-[18px] bg-accent-soft" />
          <Skeleton className="h-10 w-2/5 rounded-[18px]" />
          <Skeleton className="ml-auto h-10 w-3/5 rounded-[18px] bg-accent-soft" />
        </div>
      </div>

      <BottomSheet open onClose={close} dismissible={!sending}>
        {loading || !data ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : result && chosen ? (
          <div className="flex flex-col items-center text-center">
            <div className="text-[40px]">🎉</div>
            <h3 className="font-title mt-2 text-[22px] font-bold text-ink">{name} accepted!</h3>
            <p className="mt-2 text-[15px] font-semibold text-ink">
              {chosen.when} · {chosen.place}
            </p>
            <Button
              variant="secondary"
              full
              className="mt-6"
              onClick={() => downloadIcs(`Date with ${name}`, chosen.place)}
            >
              Add to calendar
            </Button>
            <p className="mt-3 text-[13px] text-ink-2">I&apos;ll remind you that morning.</p>
            <Button full className="mt-5" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <h3 className="font-title text-[22px] font-bold text-ink">{twinName} picked some places</h3>
            <p className="mt-1 text-[13px] text-ink-2">Based on what you both said. Pick one and I&apos;ll send it.</p>
            <div className="mt-4 flex flex-col gap-2.5">
              {data.meeting.proposals.map((p, i) => {
                const on = !custom && selected === i;
                return (
                  <button
                    key={p.place + p.when}
                    type="button"
                    onClick={() => {
                      setCustom(false);
                      setSelected(i);
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border bg-surface p-3.5 text-left transition-colors",
                      on ? "border-[1.5px] border-accent" : "border-line",
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
                      <MapPin className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-ink">{p.place}</span>
                      <span className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-ink-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-twin" />
                        {p.why}
                      </span>
                    </span>
                    <CircleCheck className={cn("size-5 shrink-0", on ? "text-accent" : "text-line")} />
                  </button>
                );
              })}
            </div>
            {custom ? (
              <div className="mt-3 flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-accent bg-surface p-3.5">
                <Input placeholder="Place" value={place} onChange={(e) => setPlace(e.target.value)} className="h-12" />
                <Input placeholder="When (e.g. Sun 11:00 AM)" value={when} onChange={(e) => setWhen(e.target.value)} className="h-12" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustom(true);
                  setSelected(null);
                }}
                className="mt-3 w-full py-2 text-center text-[13px] font-semibold text-ink-2 underline-offset-2"
              >
                I&apos;ll pick the time and place myself
              </button>
            )}
            <Button full className="mt-4" disabled={!canSend} loading={sending} onClick={send}>
              Send proposal to {name}
            </Button>
            <p className="mt-3 text-center text-[12px] text-ink-3">
              I&apos;ll only send this once—they&apos;ll see it as coming from you.
            </p>
          </>
        )}
      </BottomSheet>
    </div>
  );
}

export default function PlanPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <PlanInner chatId={chatId} />
    </Suspense>
  );
}
