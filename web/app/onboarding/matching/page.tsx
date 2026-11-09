"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { TwinAvatar } from "@/components/twin/TwinAvatar";
import { getSuggested } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Suggested } from "@/lib/types";
import { cn } from "@/lib/utils";

/** What the Twin is "doing" while the bar fills, in order. */
const STAGES = [
  { at: 0, label: "Reading everything you told me…" },
  { at: 0.25, label: "Finding people nearby whose Twins are awake…" },
  { at: 0.62, label: "Starting the first conversations…" },
  { at: 0.9, label: "Almost there—bringing you the highlights" },
];

const DURATION_MS = 5200;
/** how long the finished state ("Ready to date!") stays before the Feed opens */
const READY_HOLD_MS = 1900;

/** Hearts that burst out of the avatar when the Twin is ready: angle, distance, size, colour. */
const HEARTS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12);
  const dist = 120 + (i % 3) * 34;
  return {
    dx: Math.round(Math.cos(angle) * dist),
    dy: Math.round(Math.sin(angle) * dist) - 20,
    s: 0.8 + (i % 4) * 0.2,
    rot: (i % 2 ? 1 : -1) * (15 + (i % 5) * 12),
    delay: (i % 4) * 60,
    size: 14 + (i % 3) * 6,
    color: ["var(--accent)", "#F08B60", "var(--twin)", "var(--good)"][i % 4],
  };
});

function HeartBurst() {
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      <span className="animate-ring-out absolute left-0 top-0 size-[160px] rounded-full border-[3px] border-accent/50" />
      {HEARTS.map((h, i) => (
        <Heart
          key={i}
          className="animate-heart-burst absolute left-0 top-0"
          style={
            {
              width: h.size,
              height: h.size,
              color: h.color,
              fill: h.color,
              "--dx": `${h.dx}px`,
              "--dy": `${h.dy}px`,
              "--s": h.s,
              "--rot": `${h.rot}deg`,
              "--delay": `${h.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
/** faces start popping in once the "finding people" stage begins */
const FACES_FROM = 0.22;
const FACES_UNTIL = 0.8;
const ONLINE_NOW = 24;

/**
 * Shown once after onboarding: the Twin heads out on its first dates while a
 * progress bar fills and the people it's meeting pop in, then the app lands on
 * "Ready to date". Marks the user onboarded at the end so a refresh mid-way replays this
 * screen instead of skipping it.
 */
export default function MatchingPage() {
  const router = useRouter();
  const twin = useStore((s) => s.twin.name);
  const [t, setT] = useState(0);
  const [done, setDone] = useState(false);
  const [people, setPeople] = useState<Suggested[]>([]);

  useEffect(() => {
    let alive = true;
    getSuggested().then((list) => alive && setPeople(list));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION_MS);
      // ease-out so the bar slows as it reaches the end
      setT(1 - Math.pow(1 - p, 2.2));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        const s = useStore.getState();
        s.set({ onboarded: true });
        s.setTwin({ version: Math.max(1, s.twin.version) });
        setDone(true);
        hold = window.setTimeout(() => router.replace("/watch"), READY_HOLD_MS);
      }
    };
    let hold = 0;
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hold);
    };
  }, [router]);

  const stage = [...STAGES].reverse().find((s) => t >= s.at) ?? STAGES[0];
  const shown =
    people.length === 0
      ? 0
      : Math.min(people.length, Math.floor(((t - FACES_FROM) / (FACES_UNTIL - FACES_FROM)) * (people.length + 1)));

  return (
    <Screen
      className={cn(
        "pb-10 transition-colors duration-700",
        done ? "bg-gradient-to-b from-accent-soft via-bg to-bg" : "bg-gradient-to-b from-twin-soft via-bg to-bg",
      )}
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative">
          <span
            className={cn(
              "absolute left-1/2 top-1/2 size-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-700",
              done ? "bg-accent-soft/80" : "animate-pulse-soft bg-white/60",
            )}
          />
          {done && <HeartBurst />}
          <div className={cn("relative", done && "animate-pop")}>
            <TwinAvatar who="me" mood={done ? "happy" : "talking"} size={128} />
          </div>
        </div>
        <h1 className={cn("font-title mt-8 text-[24px] font-bold leading-[1.35]", done ? "animate-match-in text-[28px] text-accent" : "text-ink")}>
          {done ? "Ready to date!" : `${twin} is out on first dates`}
        </h1>
        <p className="mt-2 min-h-[42px] max-w-[300px] text-[14px] leading-[1.5] text-ink-2">
          {done ? `${twin} already had the first conversations. Opening your feed…` : stage.label}
        </p>

        {/* People on TwinDate right now: faces pop in as the Twin meets them */}
        <div className="mt-7 w-full">
          <div className="flex min-h-[84px] items-start justify-center gap-3">
            {people.map((p, i) => {
              const on = i < shown;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex w-[52px] flex-col items-center gap-1.5 transition-opacity duration-300",
                    on ? "animate-match-in opacity-100" : "opacity-0",
                  )}
                >
                  <span className="relative">
                    <Image
                      src={`https://picsum.photos/seed/twindate-${p.id}/104/104`}
                      alt=""
                      width={52}
                      height={52}
                      className="size-[52px] rounded-full border-2 border-surface object-cover shadow-md"
                    />
                    {p.twinActive && (
                      <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-surface bg-good" />
                    )}
                  </span>
                  <span className="max-w-full truncate text-[11px] font-medium text-ink-2">{p.alias}</span>
                </div>
              );
            })}
          </div>
          <p className={cn("mt-2 text-[12px] font-semibold text-twin transition-opacity duration-500", shown > 0 ? "opacity-100" : "opacity-0")}>
            {ONLINE_NOW} people nearby are on TwinDate right now
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/70">
          <div
            className={cn("h-full rounded-full transition-colors duration-500", done ? "bg-good" : "bg-twin")}
            style={{ width: `${Math.round(t * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-ink-3">
          <span>{done ? "Feed ready" : "Building your first feed"}</span>
          <span className="tabular-nums">{Math.round(t * 100)}%</span>
        </div>
      </div>
    </Screen>
  );
}
