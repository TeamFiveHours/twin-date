"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { TwinAvatar } from "@/components/twin/TwinAvatar";
import { useAsync } from "@/hooks/useAsync";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";
import type { Outcome } from "@/lib/types";
import { cn } from "@/lib/utils";

function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { v: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "h-12 flex-1 rounded-full border text-[14px] font-semibold transition-colors",
            value === o.v ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SurveyInner({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const twinName = useStore((s) => s.twin.name);
  const existing = useStore((s) => s.outcomes[meetingId]);
  const { data, loading } = useAsync(() => api.getMeeting(meetingId), [meetingId]);

  const [met, setMet] = useState<Outcome["met"] | null>(null);
  const [again, setAgain] = useState<NonNullable<Outcome["again"]> | null>(null);
  const [twinRight, setTwinRight] = useState<Outcome["twinRight"] | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState<Outcome | null>(null);

  useEffect(() => {
    if (!submitted && existing) router.replace("/watch");
  }, [existing, submitted, router]);

  useEffect(() => {
    if (!loading && data === null) router.replace("/watch");
  }, [loading, data, router]);

  const name = data?.person.name ?? "them";
  const needAgain = met === "yes";
  const canSubmit = !!met && !!twinRight && (!needAgain || !!again);

  const submit = async () => {
    if (!canSubmit || !met || !twinRight) return;
    setSending(true);
    const o: Outcome = { met, again: needAgain ? (again ?? undefined) : undefined, twinRight, note: note.trim() || undefined };
    await api.submitOutcome(meetingId, o);
    setSending(false);
    setSubmitted(o);
  };

  if (submitted) {
    return (
      <Screen tabs className="items-center justify-center text-center">
        <TwinAvatar who="me" mood="happy" size={96} />
        <h1 className="font-title mt-4 text-[22px] font-bold text-ink">Thanks. I&apos;ll pick better next time.</h1>
        <p className="mt-2 text-[13px] text-ink-2">I&apos;ve written this down for the next one.</p>
        <div className="mt-6 flex w-full flex-col gap-3">
          {submitted.twinRight === "down" && (
            <Button variant="twin" full onClick={() => router.push("/tune")}>
              Tune {twinName}
            </Button>
          )}
          <Button variant="secondary" full onClick={() => router.replace("/watch")}>
            Back home
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen tabs className="pt-6">
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          <div className="flex flex-col items-center gap-3 text-center">
            <TwinAvatar who="me" mood="thinking" size={96} />
            <h1 className="font-title whitespace-pre-line text-[24px] font-bold leading-[1.4] text-ink">
              {`How was it\nwith ${name}?`}
            </h1>
            <p className="text-[13px] leading-relaxed text-ink-2">
              Takes 20 seconds. {name} won&apos;t see your answers.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="text-[15px] font-bold text-ink">1. Did you meet up?</div>
            <Pills
              options={[
                { v: "yes", label: "We met" },
                { v: "no", label: "We didn't" },
                { v: "cancelled", label: "It got canceled" },
              ]}
              value={met}
              onChange={setMet}
            />
          </div>

          {needAgain && (
            <div className="flex flex-col gap-2.5 animate-fade-in">
              <div className="text-[15px] font-bold text-ink">2. Want to see them again?</div>
              <Pills
                options={[
                  { v: "yes", label: "Yes" },
                  { v: "no", label: "No" },
                  { v: "unsure", label: "Not sure" },
                ]}
                value={again}
                onChange={setAgain}
              />
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <div className="text-[15px] font-bold text-ink">
              {needAgain ? "3" : "2"}. Did {twinName} pick well?
            </div>
            <Pills
              options={[
                { v: "up", label: "👍 Nailed it" },
                { v: "down", label: "👎 Not really" },
              ]}
              value={twinRight}
              onChange={setTwinRight}
            />
          </div>

          <Textarea
            rows={2}
            className="h-[72px]"
            placeholder={`Leave a note and ${twinName} learns (optional)`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <Button full disabled={!canSubmit} loading={sending} onClick={submit}>
            Submit
          </Button>
        </div>
      )}
    </Screen>
  );
}

export default function SurveyPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = use(params);
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <SurveyInner meetingId={meetingId} />
    </Suspense>
  );
}
