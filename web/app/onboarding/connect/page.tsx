"use client";

import { useRouter } from "next/navigation";
import { Screen } from "@/components/layout/Screen";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { AccuracyCard, SourceRow } from "@/components/onboarding/Sources";
import { Button } from "@/components/ui/Button";
import { connectSource, listSources } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function ConnectPage() {
  const router = useRouter();
  const twin = useStore((s) => s.twin);
  const sources = listSources();

  return (
    <Screen className="pt-4 pb-[176px]">
      <div className="flex flex-col gap-7">
        <StepHeader
          step="2 / 4 · Optional"
          title={"Want your Twin to\nknow you even better?"}
          sub="Here's exactly what we'd read. Feel free to skip it all."
        />
        <AccuracyCard value={twin.accuracy} />
        <div className="flex flex-col gap-3">
          {sources.map((s) => (
            <SourceRow
              key={s.id}
              id={s.id}
              name={s.name}
              desc={s.desc}
              icon={s.icon}
              connected={twin.connections.includes(s.id)}
              onConnect={async (id) => {
                await connectSource(id);
              }}
            />
          ))}
        </div>
      </div>

      {/* CTA stays on screen while the source list scrolls underneath (same as 4/4) */}
      <div className="app-fixed pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center">
        <div className="safe-bottom pointer-events-auto flex w-full min-[480px]:max-w-[390px] flex-col gap-3 bg-gradient-to-t from-bg via-bg/95 to-bg/0 px-5 pt-8">
          <Button full onClick={() => router.push("/onboarding/interview")}>
            Next
          </Button>
          <Button variant="secondary" full onClick={() => router.push("/onboarding/interview")}>
            Skip all
          </Button>
        </div>
      </div>
    </Screen>
  );
}
