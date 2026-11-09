"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { CARD_LABELS, CARD_OPTIONS } from "@/lib/persona";
import type { PersonaCards } from "@/lib/types";

export type CardKey = keyof typeof CARD_LABELS;
const keys = Object.keys(CARD_LABELS) as CardKey[];

/** Five persona cards with a bottom-sheet editor. Changes are reported up; the parent saves. */
export function PersonaCardList({
  cards,
  edits,
  onEdit,
}: {
  cards: PersonaCards;
  edits: Partial<Record<CardKey, string>>;
  onEdit: (key: CardKey, body: string, note: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CardKey | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const open = (k: CardKey) => {
    setEditing(k);
    setPicked([]);
    setNote("");
  };

  const save = () => {
    if (!editing) return;
    const parts = [...picked, note.trim()].filter(Boolean);
    const base = edits[editing] ?? cards[editing];
    const body = base.replace(/ \(edited\)$/, "") + " (edited)";
    onEdit(editing, body, parts.join(" · ") || "Tweaked");
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {keys.map((k) => {
        const body = edits[k] ?? cards[k];
        const example = k === "tone" ? cards.examples.tone : k === "humor" ? cards.examples.humor : undefined;
        if (!body) {
          return (
            <div key={k} className="rounded-2xl border border-dashed border-line bg-surface p-4">
              <div className="text-[12px] font-semibold text-twin">{CARD_LABELS[k]}</div>
              <p className="mt-1 text-[13px] text-ink-3">I don&apos;t know this one yet.</p>
              <Button variant="twin" size="sm" className="mt-3" onClick={() => router.push("/onboarding/interview?mode=extra")}>
                Teach me 5 more minutes
              </Button>
            </div>
          );
        }
        return (
          <button
            key={k}
            type="button"
            onClick={() => open(k)}
            className="rounded-2xl border border-line bg-surface p-4 text-left active:bg-surface-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-twin">{CARD_LABELS[k]}</span>
              <Pencil className="size-3.5 text-ink-3" />
            </div>
            <p className="mt-1.5 text-[14px] leading-[1.5] text-ink">{body}</p>
            {example && (
              <div className="mt-2.5 rounded-xl bg-surface-2 px-3 py-2 text-[12px] italic text-ink-2">
                &ldquo;{example}&rdquo;
              </div>
            )}
          </button>
        );
      })}

      <BottomSheet open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <>
            <h3 className="font-title text-[20px] font-bold text-ink">{CARD_LABELS[editing]}</h3>
            <p className="mt-1 text-[13px] text-ink-2">How should I adjust this?</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {CARD_OPTIONS[editing].map((o) => (
                <Chip
                  key={o}
                  selected={picked.includes(o)}
                  onClick={() =>
                    setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))
                  }
                >
                  {o}
                </Chip>
              ))}
            </div>
            <div className="mt-4">
              <Input placeholder="One line, in your words (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button variant="twin" full className="mt-4" onClick={save} disabled={picked.length === 0 && !note.trim()}>
              Save
            </Button>
          </>
        )}
      </BottomSheet>
    </div>
  );
}
