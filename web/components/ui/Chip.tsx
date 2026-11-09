"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChipTone = "default" | "good" | "warn" | "bad" | "accent" | "twin" | "ink";

const tones: Record<ChipTone, string> = {
  default: "bg-surface-2 text-ink-2",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-surface-2 text-ink-3",
  accent: "bg-accent-soft text-accent",
  twin: "bg-twin-soft text-twin",
  ink: "bg-ink text-white",
};

export function Chip({
  tone = "default",
  selected,
  small,
  outline,
  className,
  children,
  icon,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ChipTone;
  selected?: boolean;
  small?: boolean;
  outline?: "twin" | "accent";
  icon?: React.ReactNode;
}) {
  const interactive = !!rest.onClick;
  const Comp: React.ElementType = interactive ? "button" : "span";
  return (
    <Comp
      type={interactive ? "button" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium transition-colors",
        small ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]",
        selected ? "bg-ink text-white" : tones[tone],
        outline === "twin" && !selected && "border border-twin bg-surface text-twin",
        outline === "accent" && !selected && "border border-accent bg-surface text-accent",
        interactive && "active:scale-[0.97]",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </Comp>
  );
}

/** How the Twins' conversation went (good / meh / bad), used on watch and match screens. */
export function ResultChip({ result, small = true }: { result: "good" | "meh" | "bad"; small?: boolean }) {
  const map = {
    good: { tone: "good" as ChipTone, label: "Spark" },
    meh: { tone: "warn" as ChipTone, label: "Mixed" },
    bad: { tone: "bad" as ChipTone, label: "No spark" },
  };
  const m = map[result];
  return (
    <Chip tone={m.tone} small={small}>
      {m.label}
    </Chip>
  );
}

export type LikeState = "liked" | "requested" | "matched" | "passed";

/** What I did about this person: liked (saw photos), match sent (waiting), matched (chat open) or passed. */
export function LikeChip({ state, small = true }: { state: LikeState; small?: boolean }) {
  const map = {
    liked: { tone: "accent" as ChipTone, label: "Liked", Icon: Heart },
    requested: { tone: "accent" as ChipTone, label: "Match", Icon: Heart },
    matched: { tone: "accent" as ChipTone, label: "Matched", Icon: Heart },
    passed: { tone: "bad" as ChipTone, label: "Passed", Icon: null },
  };
  const m = map[state];
  return (
    <Chip tone={m.tone} small={small} icon={m.Icon ? <m.Icon className="size-3" fill="currentColor" /> : undefined}>
      {m.label}
    </Chip>
  );
}
