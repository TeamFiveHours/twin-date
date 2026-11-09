"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Link2, Lock, Mic, Pencil, Plus } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { TwinAvatar } from "@/components/twin/TwinAvatar";
import { Group, Row } from "@/components/me/Group";
import { useAsync } from "@/hooks/useAsync";
import { useScreenState } from "@/hooks/useScreenState";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";
import { cn } from "@/lib/utils";

/** The five things the Twin is still learning about you, surfaced one at a time. */
const GAPS = [
  "how you handle disagreements",
  "how fast you like things to move",
  "how much reassurance you need",
  "how quickly you reply",
  "how you show support",
];

type Sheet =
  | null
  | "bio"
  | "goal"
  | "blocked"
  | "logs"
  | "data"
  | "pause"
  | "delete1"
  | "delete2";

function MeInner() {
  const router = useRouter();
  const forced = useScreenState();
  const twin = useStore((s) => s.twin);
  const setTwin = useStore((s) => s.setTwin);
  const { loading } = useAsync(() => api.getMe(), [], { forced });

  const [sheet, setSheet] = useState<Sheet>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(twin.name);
  const [bio, setBio] = useState("Walks, not runs. Looking for someone to argue about playlists with.");
  const [goal, setGoal] = useState<"casual" | "serious">("serious");
  const [confirmName, setConfirmName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sourceBusy, setSourceBusy] = useState<string | null>(null);

  // what the Twin is still unsure about, rotating as accuracy grows; first two apps not yet connected
  const gap = GAPS[Math.floor(twin.accuracy / 20) % GAPS.length];
  const unconnected = api.listSources().filter((s) => !twin.connections.includes(s.id)).slice(0, 2);

  const saveName = () => {
    const n = nameDraft.trim();
    if (n) setTwin({ name: n });
    setEditingName(false);
  };

  const togglePause = async () => {
    setBusy(true);
    await api.pauseTwin(!twin.paused);
    setBusy(false);
    setSheet(null);
    toast(twin.paused ? `${twin.name} is back` : `${twin.name} is taking a break`);
  };

  const deleteLogs = async () => {
    setBusy(true);
    await api.clearLogs();
    setBusy(false);
    setSheet(null);
    toast("Logs deleted");
  };

  const toggleSource = async (id: string) => {
    setSourceBusy(id);
    if (twin.connections.includes(id)) await api.disconnectSource(id);
    else await api.connectSource(id);
    setSourceBusy(null);
  };

  const deleteAccount = async () => {
    setBusy(true);
    await api.deleteAccount();
    setBusy(false);
    router.replace("/onboarding/signup");
  };

  if (loading) {
    return (
      <Screen tabs>
        <div className="flex items-center gap-4 py-2">
          <Skeleton className="size-[72px] rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-6 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="mt-4 h-16" />
        <Skeleton className="mt-6 h-28" />
        <Skeleton className="mt-6 h-28" />
      </Screen>
    );
  }

  return (
    <Screen tabs>
      <div className="flex items-center gap-4 py-2">
        <TwinAvatar who="me" mood={twin.paused ? "resting" : "neutral"} size={72} />
        <div className="min-w-0 flex-1">
          {editingName ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveName();
              }}
            >
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="font-title h-9 w-32 rounded-lg border border-line bg-surface px-2 text-[20px] font-bold text-ink outline-none focus:border-twin"
              />
              <button type="submit" aria-label="Save name" className="flex size-8 items-center justify-center rounded-full bg-twin text-white">
                <Check className="size-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(twin.name);
                setEditingName(true);
              }}
              className="flex items-center gap-1.5"
            >
              <span className="font-title text-[22px] font-bold text-ink">{twin.name}</span>
              <Pencil className="size-3.5 text-ink-3" />
            </button>
          )}
          <div className="mt-1 truncate text-[12px] text-ink-2">
            Your twin · Looking for {goal === "serious" ? "a serious relationship" : "something casual"}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-twin-soft p-4">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-ink">{twin.name} knows you</span>
          <span className="text-[14px] font-bold text-twin">{Math.round(twin.accuracy)}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-twin transition-[width] duration-700" style={{ width: `${twin.accuracy}%` }} />
        </div>
        <p className="mt-2 text-[12px] text-ink-3">
          Still guessing: <span className="font-semibold text-twin">{gap}</span>
        </p>

        <div className="mt-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/onboarding/interview?mode=extra")}
            className="flex w-full items-center gap-3 rounded-xl bg-surface/80 p-3 text-left active:bg-surface"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-twin">
              <Mic className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-ink">Talk with {twin.name}</span>
              <span className="block text-[12px] text-ink-2">A 1-minute chat</span>
            </span>
            <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-twin">up to +8%</span>
            <ChevronRight className="size-4 shrink-0 text-ink-3" />
          </button>

          <div className="rounded-xl bg-surface/80 p-3">
            <button type="button" onClick={() => setSheet("data")} className="flex w-full items-center gap-3 text-left">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-twin">
                <Link2 className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink">Connect apps</span>
                <span className="block text-[12px] text-ink-2">
                  {twin.connections.length} connected
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-twin">+10% each</span>
              <ChevronRight className="size-4 shrink-0 text-ink-3" />
            </button>
            {unconnected.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2 pl-12">
                {unconnected.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSheet("data")}
                    className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-2 active:bg-surface-2"
                  >
                    <Plus className="size-3.5" />
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-3">
          <Lock className="size-3" />
          Raw data stays on your phone
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <Group label="Twin settings">
          <Row title="Style & off-limits topics" onClick={() => router.push("/tune")} />
          <Row title="Tuning history" value={`${twin.history.length}`} onClick={() => router.push("/tune#history")} />
          <Row title="Twin chat logs" onClick={() => setSheet("logs")} />
        </Group>
        <Group label="My profile">
          <Row title="Photos & bio" onClick={() => setSheet("bio")} />
          <Row
            title="Looking for"
            value={goal === "serious" ? "Serious relationship" : "Something casual"}
            onClick={() => setSheet("goal")}
          />
        </Group>
        <Group label="Safety & History">
          <Row title="Blocked list" value="0" onClick={() => setSheet("blocked")} />
        </Group>
      </div>

      <div className="mt-7">
        {twin.paused ? (
          <Button variant="twin" full onClick={() => setSheet("pause")}>
            Wake {twin.name} up
          </Button>
        ) : (
          <Button variant="secondary" full onClick={() => setSheet("pause")}>
            Let {twin.name} take a break
          </Button>
        )}
        <p className="mt-2.5 text-center text-[12px] text-ink-3">While paused I won&apos;t start any new conversations.</p>
      </div>

      <button
        type="button"
        onClick={() => setSheet("delete1")}
        className="mt-8 w-full py-2 text-center text-[12px] text-ink-3"
      >
        Delete account
      </button>

      {/* Bio */}
      <BottomSheet open={sheet === "bio"} onClose={() => setSheet(null)}>
        <h3 className="font-title text-[20px] font-bold text-ink">Photos & bio</h3>
        <p className="mt-1 text-[13px] text-ink-2">This is what matches see after you both say Yes.</p>
        <div className="mt-4 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex h-24 flex-1 items-center justify-center rounded-xl border border-dashed border-line bg-surface text-[11px] text-ink-3">
              {i === 0 ? "Photo" : "+"}
            </div>
          ))}
        </div>
        <Textarea rows={3} className="mt-3" value={bio} onChange={(e) => setBio(e.target.value)} />
        <Button full className="mt-4" onClick={() => { setSheet(null); toast("Saved"); }}>
          Save
        </Button>
      </BottomSheet>

      {/* Goal */}
      <BottomSheet open={sheet === "goal"} onClose={() => setSheet(null)}>
        <h3 className="font-title text-[20px] font-bold text-ink">What are you looking for?</h3>
        <div className="mt-4 flex flex-col gap-2">
          {([
            ["serious", "Serious relationship"],
            ["casual", "Something casual"],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => { setGoal(v); setSheet(null); toast("Saved"); }}
              className={cn(
                "flex h-12 items-center justify-between rounded-full border px-5 text-[14px] font-semibold",
                goal === v ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink",
              )}
            >
              {label}
              {goal === v && <Check className="size-4" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Blocked */}
      <BottomSheet open={sheet === "blocked"} onClose={() => setSheet(null)}>
        <h3 className="font-title text-[20px] font-bold text-ink">Blocked list</h3>
        <p className="mt-3 rounded-2xl bg-surface p-4 text-center text-[13px] text-ink-3">No one blocked</p>
      </BottomSheet>

      {/* Logs */}
      <BottomSheet open={sheet === "logs"} onClose={() => setSheet(null)}>
        <h3 className="font-title text-[20px] font-bold text-ink">Twin chat logs</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          Everything I&apos;ve said to other Twins is in the Feed tab. Deleting clears it from this device; I keep what I learned.
        </p>
        <Button variant="secondary" full className="mt-4" onClick={() => router.push("/watch")}>
          View in Feed
        </Button>
        <Button variant="ink" full className="mt-2.5" loading={busy} onClick={deleteLogs}>
          Delete logs
        </Button>
      </BottomSheet>

      {/* Data */}
      <BottomSheet open={sheet === "data"} onClose={() => setSheet(null)}>
        <h3 className="font-title text-[20px] font-bold text-ink">Connected data</h3>
        <p className="mt-1 text-[13px] text-ink-2">Each source adds about 8% accuracy.</p>
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {api.listSources().map((s) => {
            const on = twin.connections.includes(s.id);
            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-ink">{s.name}</div>
                  <div className="truncate text-[11px] text-ink-3">{s.desc}</div>
                </div>
                <Button
                  size="sm"
                  variant={on ? "secondary" : "ink"}
                  className={cn("h-9", on && "bg-good-soft text-good border-transparent")}
                  loading={sourceBusy === s.id}
                  onClick={() => toggleSource(s.id)}
                >
                  {on ? "Connected" : "Connect"}
                </Button>
              </div>
            );
          })}
        </div>
      </BottomSheet>

      {/* Pause */}
      <BottomSheet open={sheet === "pause"} onClose={() => setSheet(null)}>
        <h3 className="font-title text-[20px] font-bold text-ink">
          {twin.paused ? `Wake ${twin.name} up?` : `Let ${twin.name} rest?`}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          {twin.paused
            ? "I'll start talking to new people again right away."
            : "I'll stop starting new conversations until you wake me. Your matches and chats stay."}
        </p>
        <Button variant={twin.paused ? "twin" : "ink"} full className="mt-5" loading={busy} onClick={togglePause}>
          {twin.paused ? "Wake up" : "Take a break"}
        </Button>
        <Button variant="ghost" full className="mt-1" onClick={() => setSheet(null)}>
          Cancel
        </Button>
      </BottomSheet>

      {/* Delete step 1 */}
      <BottomSheet open={sheet === "delete1"} onClose={() => setSheet(null)}>
        <h3 className="font-title text-[20px] font-bold text-ink">Really?</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          This deletes {twin.name}, every conversation, your matches and chats. There&apos;s no undo.
        </p>
        <Button variant="secondary" full className="mt-5" onClick={() => { setConfirmName(""); setSheet("delete2"); }}>
          Yes, continue
        </Button>
        <Button variant="ghost" full className="mt-1" onClick={() => setSheet(null)}>
          Cancel
        </Button>
      </BottomSheet>

      {/* Delete step 2 */}
      <BottomSheet open={sheet === "delete2"} onClose={() => setSheet(null)}>
        <h3 className="font-title text-[20px] font-bold text-ink">Type &ldquo;{twin.name}&rdquo; to confirm</h3>
        <Input
          className="mt-4"
          placeholder={twin.name}
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          autoFocus
        />
        <Button
          full
          className="mt-4"
          disabled={confirmName.trim() !== twin.name}
          loading={busy}
          onClick={deleteAccount}
        >
          Delete my account
        </Button>
      </BottomSheet>
    </Screen>
  );
}

export default function MePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <MeInner />
    </Suspense>
  );
}
