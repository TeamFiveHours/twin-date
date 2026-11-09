"use client";

import { useState } from "react";
import {
  Calendar,
  Camera,
  Clapperboard,
  MapPin,
  MonitorPlay,
  Music,
  type LucideIcon,
} from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { Spinner } from "@/components/ui/Spinner";

const ICONS: Record<string, LucideIcon> = {
  instagram: Camera,
  music: Music,
  calendar: Calendar,
  tv: Clapperboard,
  "map-pin": MapPin,
  youtube: MonitorPlay,
};

/** twin-soft card with "Twin accuracy" + animated 8px bar. */
export function AccuracyCard({ value }: { value: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-twin-soft px-[18px] py-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">Twin accuracy</span>
        <span className="text-[13px] font-bold text-twin">{Math.round(value)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-twin transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

/** One data-source row: icon box, name/desc, Connect button or Connected chip. */
export function SourceRow({
  id,
  name,
  desc,
  icon,
  connected,
  onConnect,
  onDisconnect,
}: {
  id: string;
  name: string;
  desc: string;
  icon: string;
  connected: boolean;
  onConnect: (id: string) => Promise<void>;
  /** when given, tapping the Connected chip disconnects (used on /me) */
  onDisconnect?: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const Icon = ICONS[icon] ?? Camera;
  const run = async (fn: (id: string) => Promise<void>) => {
    setBusy(true);
    try {
      await fn(id);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2">
        <Icon className="size-5 text-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-ink">{name}</div>
        <div className="mt-0.5 text-[12px] leading-snug text-ink-2">{desc}</div>
      </div>
      {connected ? (
        <Chip
          tone="good"
          className="px-3.5 py-2 text-[12px] font-semibold"
          onClick={onDisconnect ? () => run(onDisconnect) : undefined}
        >
          {busy ? <Spinner className="size-4" /> : "Connected"}
        </Chip>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(onConnect)}
          className="flex h-8 min-w-[76px] items-center justify-center rounded-full bg-ink px-3.5 text-[12px] font-semibold text-white active:scale-[0.97]"
        >
          {busy ? <Spinner className="size-4" light /> : "Connect"}
        </button>
      )}
    </div>
  );
}
