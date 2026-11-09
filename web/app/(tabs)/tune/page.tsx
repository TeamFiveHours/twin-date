"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, Plus, X } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { TopNav } from "@/components/layout/TopNav";
import { TwinMini } from "@/components/twin/TwinMini";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Slider } from "@/components/ui/Slider";
import { toast } from "@/components/ui/Toast";
import { PersonaCardList, type CardKey } from "@/components/tune/PersonaCardList";
import { useAsync } from "@/hooks/useAsync";
import { useScreenState } from "@/hooks/useScreenState";
import * as api from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Sliders } from "@/lib/types";
import { cn } from "@/lib/utils";

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-3">
      <h2 className="text-[12px] font-semibold text-ink-3">{title}</h2>
      {children}
    </section>
  );
}

function TuneInner() {
  const sp = useSearchParams();
  const from = sp.get("from");
  const line = sp.get("line");
  const forced = useScreenState();
  const router = useRouter();
  const twin = useStore((s) => s.twin);

  // entry point ① — original line + alternatives
  const { data: fromData, loading: fromLoading } = useAsync(
    async () => {
      if (!from || !line) return null;
      const [d, alts] = await Promise.all([api.getDialogue(from), api.alternatives(from, line)]);
      const cue = d?.cues.find((c) => c.id === line) ?? null;
      return { cue, alts };
    },
    [from, line],
    { forced },
  );
  const [altIdx, setAltIdx] = useState<number | null>(null);
  const [custom, setCustom] = useState("");

  // local draft state
  const [sliders, setSliders] = useState<Sliders>(twin.sliders);
  const [banned, setBanned] = useState<string[]>(twin.banned);
  const [adding, setAdding] = useState(false);
  const [newBan, setNewBan] = useState("");
  const [edits, setEdits] = useState<Partial<Record<CardKey, string>>>({});
  const [cardNotes, setCardNotes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ before: string; after: string } | null>(null);

  useEffect(() => {
    if (preview === null) return;
    const id = setTimeout(() => {
      setPreview(null);
      if (window.history.length > 1) router.back();
      else router.push("/me");
    }, 3000);
    return () => clearTimeout(id);
  }, [preview, router]);

  const extreme = Object.values(sliders).some((v) => v < 0.05 || v > 0.95);

  const buildNote = () => {
    const parts: string[] = [];
    if (altIdx !== null && fromData?.alts[altIdx]) parts.push(`"${fromData.alts[altIdx]}"`);
    else if (custom.trim()) parts.push(`"${custom.trim()}"`);
    if (sliders.assertive !== twin.sliders.assertive)
      parts.push(sliders.assertive > twin.sliders.assertive ? "More forward" : "Calmer");
    if (sliders.humor !== twin.sliders.humor)
      parts.push(sliders.humor > twin.sliders.humor ? "More playful" : "Drier");
    if (sliders.asking !== twin.sliders.asking)
      parts.push(sliders.asking > twin.sliders.asking ? "Ask more" : "Listen more");
    const addedBans = banned.filter((b) => !twin.banned.includes(b));
    const removedBans = twin.banned.filter((b) => !banned.includes(b));
    addedBans.forEach((b) => parts.push(`no ${b}`));
    removedBans.forEach((b) => parts.push(`${b} is okay now`));
    parts.push(...cardNotes);
    return parts.length ? parts.join(" · ") : "Small tweaks";
  };

  const save = async () => {
    setSaving(true);
    const note = buildNote();
    await api.saveTune({
      sliders,
      banned,
      cards: Object.keys(edits).length ? edits : undefined,
      note,
    });
    setSaving(false);
    toast("Changed");
    const before = twin.cards.examples.tone || "Wait, which market? I need to know if it's the good one.";
    const after =
      altIdx !== null && fromData?.alts[altIdx]
        ? fromData.alts[altIdx]
        : custom.trim() ||
          (sliders.assertive > twin.sliders.assertive
            ? "Which market? Let's go this Sunday and find out."
            : sliders.humor > twin.sliders.humor
              ? "Which market? If it's not the good one, I'm filing a complaint."
              : "Which market do you mean? I'd like to go sometime.");
    setPreview({ before, after });
  };

  return (
    <Screen tabs>
      <TopNav title={`Tune ${twin.name}`} />
      <div className="mt-2 flex flex-col gap-7">
        {from && line && (
          <Section title="This moment">
            {fromLoading ? (
              <Skeleton className="h-24" />
            ) : (
              <>
                <div className="rounded-2xl bg-warn-soft p-4">
                  <div className="text-[13px] font-semibold text-ink">What should I have said instead?</div>
                  <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-2 line-through">
                    {fromData?.cue?.text ?? "That line"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {(fromData?.alts ?? []).map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setAltIdx(i);
                        setCustom("");
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-surface p-3.5 text-left text-[14px] leading-[1.45] text-ink",
                        altIdx === i ? "border-[1.5px] border-twin" : "border-line",
                      )}
                    >
                      <span className="flex-1">{a}</span>
                      {altIdx === i && <CircleCheck className="size-5 shrink-0 text-twin" />}
                    </button>
                  ))}
                  <Input
                    placeholder="I'll write it myself"
                    value={custom}
                    onChange={(e) => {
                      setCustom(e.target.value);
                      if (e.target.value) setAltIdx(null);
                    }}
                  />
                </div>
              </>
            )}
          </Section>
        )}

        <Section title="Overall style">
          <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-4">
            <Slider
              label="Assertiveness"
              left="Waits"
              right="Makes the first move"
              value={sliders.assertive}
              onChange={(v) => setSliders((s) => ({ ...s, assertive: v }))}
            />
            <Slider
              label="Humor"
              left="Dry"
              right="Playful"
              value={sliders.humor}
              onChange={(v) => setSliders((s) => ({ ...s, humor: v }))}
            />
            <Slider
              label="Questions"
              left="Listens"
              right="Asks"
              value={sliders.asking}
              onChange={(v) => setSliders((s) => ({ ...s, asking: v }))}
            />
            {extreme && (
              <p className="text-[12px] font-medium text-warn">At 0 I&apos;d barely keep a conversation going</p>
            )}
          </div>
        </Section>

        <Section title={`Who ${twin.name} thinks you are`}>
          <PersonaCardList
            cards={twin.cards}
            edits={edits}
            onEdit={(k, body, note) => {
              setEdits((e) => ({ ...e, [k]: body }));
              setCardNotes((n) => [...n, note]);
            }}
          />
        </Section>

        <Section title="Off limits">
          <div className="flex flex-wrap items-center gap-2">
            {banned.map((b) => (
              <Chip key={b} tone="twin" icon={<span className="sr-only">Topic</span>}>
                {b}
                <button
                  type="button"
                  aria-label={`Remove ${b}`}
                  onClick={() => setBanned((l) => l.filter((x) => x !== b))}
                  className="-mr-1 ml-0.5 flex size-4 items-center justify-center rounded-full text-twin"
                >
                  <X className="size-3" />
                </button>
              </Chip>
            ))}
            {adding ? (
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = newBan.trim().toLowerCase();
                  if (v && !banned.includes(v)) setBanned((l) => [...l, v]);
                  setNewBan("");
                  setAdding(false);
                }}
              >
                <input
                  autoFocus
                  value={newBan}
                  onChange={(e) => setNewBan(e.target.value)}
                  onBlur={() => !newBan && setAdding(false)}
                  placeholder="topic"
                  className="h-8 w-28 rounded-full border border-twin bg-surface px-3 text-[12px] outline-none"
                />
                <Chip tone="twin" small onClick={() => undefined} type="submit">
                  Add
                </Chip>
              </form>
            ) : (
              <Chip outline="twin" icon={<Plus className="size-3" />} onClick={() => setAdding(true)}>
                Add
              </Chip>
            )}
          </div>
        </Section>

        <Section title="History" id="history">
          <div className="rounded-2xl border border-line bg-surface px-4">
            {twin.history.length === 0 ? (
              <p className="py-3.5 text-[13px] text-ink-3">Nothing yet</p>
            ) : (
              twin.history.map((h, i) => (
                <div
                  key={i}
                  className={cn("flex items-start gap-3 py-3", i > 0 && "border-t border-line")}
                >
                  <span className="w-9 shrink-0 text-[12px] font-semibold text-ink-3">{h.at}</span>
                  <span className="text-[13px] text-ink">{h.text}</span>
                </div>
              ))
            )}
          </div>
        </Section>

        <Button variant="twin" full loading={saving} onClick={save}>
          Use this from the next chat
        </Button>
      </div>

      <BottomSheet open={!!preview} onClose={() => setPreview(null)}>
        {preview && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TwinMini who="me" size={28} />
              <span className="text-[13px] font-semibold text-ink">Here&apos;s how I&apos;d sound now</span>
            </div>
            <div className="rounded-2xl bg-surface-2 px-4 py-3">
              <div className="text-[11px] font-semibold text-ink-3">Before</div>
              <p className="mt-0.5 text-[13px] text-ink-2 line-through">{preview.before}</p>
            </div>
            <div className="rounded-2xl bg-twin-soft px-4 py-3">
              <div className="text-[11px] font-semibold text-twin">After</div>
              <p className="mt-0.5 text-[13px] text-ink">{preview.after}</p>
            </div>
          </div>
        )}
      </BottomSheet>
    </Screen>
  );
}

export default function TunePage() {
  return (
    <Suspense fallback={<Screen tabs>{null}</Screen>}>
      <TuneInner />
    </Suspense>
  );
}
