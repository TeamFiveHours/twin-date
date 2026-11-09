"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip, ResultChip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopNav } from "@/components/layout/TopNav";
import { TabBar } from "@/components/layout/TabBar";
import { toast, Toaster } from "@/components/ui/Toast";

export default function UiDev() {
  const [sheet, setSheet] = useState(false);
  const [v, setV] = useState(0.5);
  return (
    <main className="min-h-dvh bg-bg px-5 pb-28 pt-2">
      <TopNav title="UI kit" subtitle="components/ui" />
      <div className="flex flex-col gap-4">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ink">Ink</Button>
        <Button variant="twin">Twin</Button>
        <Button loading>Loading</Button>
        <div className="flex flex-wrap gap-2">
          <Chip>Default</Chip>
          <Chip tone="good">Good</Chip>
          <Chip tone="warn">Warn</Chip>
          <Chip tone="accent">Accent</Chip>
          <Chip tone="twin">Twin</Chip>
          <Chip selected>Selected</Chip>
          <Chip outline="twin">Outline</Chip>
          <ResultChip result="good" />
          <ResultChip result="meh" />
          <ResultChip result="bad" />
        </div>
        <Card>Card surface</Card>
        <Card tone="twin">Card twin-soft</Card>
        <Input label="Email" placeholder="you@school.edu" />
        <Textarea rows={3} placeholder="Note" />
        <Slider value={v} onChange={setV} label="Assertiveness" left="Waits" right="Makes the first move" />
        <Skeleton className="h-10" />
        <SkeletonRows />
        <EmptyState title="Nothing here yet" body="I'm still looking." cta="Teach me" onCta={() => toast("Changed")} />
        <Button variant="secondary" onClick={() => setSheet(true)}>
          Open sheet
        </Button>
      </div>
      <BottomSheet open={sheet} onClose={() => setSheet(false)}>
        <h3 className="font-title text-[20px] font-bold">Sheet</h3>
        <p className="mt-2 text-[13px] text-ink-2">Tap outside to close.</p>
      </BottomSheet>
      <TabBar />
      <Toaster />
    </main>
  );
}
