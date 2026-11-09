import { TwinAvatar } from "@/components/twin/TwinAvatar";
import { TwinMini } from "@/components/twin/TwinMini";
import type { Mood } from "@/lib/types";

const moods: Mood[] = ["neutral", "happy", "thinking", "awkward", "resting", "talking"];

export default function AvatarsDev() {
  return (
    <main className="min-h-dvh bg-bg p-5">
      <h1 className="font-title mb-4 text-[22px] font-bold">Twin avatars</h1>
      {(["me", "other"] as const).map((who) => (
        <section key={who} className="mb-6">
          <h2 className="mb-2 text-[12px] font-semibold text-ink-3">{who}</h2>
          <div className="grid grid-cols-3 gap-3">
            {moods.map((m) => (
              <div key={m} className="flex flex-col items-center gap-1 rounded-2xl bg-surface p-2">
                <TwinAvatar who={who} mood={m} />
                <span className="text-[11px] text-ink-2">{m}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
      <section>
        <h2 className="mb-2 text-[12px] font-semibold text-ink-3">mini</h2>
        <div className="flex gap-2">
          {moods.map((m) => (
            <TwinMini key={m} who="other" mood={m} />
          ))}
          <TwinMini who="me" />
        </div>
      </section>
      <section className="mt-6">
        <h2 className="mb-2 text-[12px] font-semibold text-ink-3">interviewer (other, no bun)</h2>
        <TwinAvatar who="other" mood="talking" bun={false} />
      </section>
    </main>
  );
}
