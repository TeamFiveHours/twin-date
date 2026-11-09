"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AudioLines, Mic, Package, ShieldCheck } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { buildPersona } from "@/lib/api";
import { useStore } from "@/lib/store";

const POINTS = [
  { Icon: AudioLines, text: "Learns your tone, reactions, and rhythm from your real voice" },
  { Icon: Package, text: "We ship a small wearable kit to your door" },
  { Icon: ShieldCheck, text: "Encrypted, and originals are deleted within 72 hours" },
];

/**
 * Wearable-kit offer, shown full screen right after the interview (was a popup).
 * The Twin persona is built here from the interview transcript while the user reads.
 * "Enter address" → 4/4 address; "Maybe later" → straight to the first-dates loading.
 */
export default function KitPage() {
  const router = useRouter();
  const twinName = useStore((s) => s.twin.name);
  const [building, setBuilding] = useState(true);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const transcript = useStore.getState().interview?.transcript ?? [];
    buildPersona(transcript).then(() => setBuilding(false));
  }, []);

  return (
    <Screen className="pt-4 pb-8">
      <div className="flex flex-1 flex-col">
        <span className="text-[12px] font-semibold text-accent">Optional</span>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-twin-soft">
            <Mic className="size-9 text-twin" />
          </div>
          <h1 className="font-title text-[26px] font-bold leading-[1.35] text-ink">
            Make {twinName}
            <br />
            even more like you
          </h1>
          <p className="max-w-[300px] text-[14px] leading-[1.5] text-ink-2">
            Right now {twinName} only knows what you typed. Add a week of your voice and
            it&apos;ll pick up your tone, reactions, and rhythm.
          </p>
          <ul className="mt-2 flex w-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 text-left">
            {POINTS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-twin-soft">
                  <Icon className="size-[18px] text-twin" />
                </span>
                <span className="text-[14px] leading-[1.45] text-ink">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-8">
          <Button full disabled={building} onClick={() => router.push("/onboarding/address")}>
            Enter address &amp; get the kit
          </Button>
          <Button variant="secondary" full disabled={building} onClick={() => router.replace("/onboarding/matching")}>
            Maybe later
          </Button>
        </div>
      </div>
    </Screen>
  );
}
