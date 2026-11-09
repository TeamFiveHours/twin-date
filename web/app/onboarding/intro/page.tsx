"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Layers, MessageSquare, Pencil } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { TwinAvatar } from "@/components/twin/TwinAvatar";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const CARD_W = 300;
const CARD_GAP = 16;
const DEFAULT_NAME = "Momo";

type Slide = {
  title: string;
  sub: string;
  bg: string;
  art: React.ReactNode;
  /** avatar scenes fill the halo themselves; icon slides sit in a smaller white disc */
  big?: boolean;
};

/** The four "why TwinDate" cards (Pencil 1-1b carousel), in reading order. */
const SLIDES: Slide[] = [
  {
    title: "Tired of swiping?",
    sub: "Endless profiles, no real spark.",
    bg: "var(--surface-2)",
    art: <Layers className="size-11 text-ink-2" strokeWidth={1.75} />,
  },
  {
    title: "You never really know",
    sub: "Until you actually get on a date.",
    bg: "var(--twin-soft)",
    art: <span className="font-title text-[56px] font-bold leading-none text-twin">?</span>,
  },
  {
    title: "So your AI Twins date first",
    sub: "We build your twin to meet others for you.",
    bg: "#EAD6B6",
    big: true,
    art: (
      <div className="relative flex items-end gap-6">
        <TwinAvatar who="me" size={92} halo={false} />
        <TwinAvatar who="other" mood="happy" size={92} halo={false} />
        <span className="absolute left-1/2 top-3 flex size-11 -translate-x-1/2 items-center justify-center rounded-full bg-surface shadow-sm">
          <MessageSquare className="size-5 text-accent" strokeWidth={2} />
        </span>
      </div>
    ),
  },
  {
    title: "You just watch & choose",
    sub: "Peek at the date, then pick your soulmate.",
    bg: "var(--good-soft)",
    big: true,
    art: (
      <div className="relative">
        <TwinAvatar who="me" mood="talking" size={116} halo={false} />
        <span className="absolute -bottom-3 left-1/2 flex size-12 -translate-x-1/2 items-center justify-center rounded-full bg-surface shadow-sm">
          <Heart className="size-5 text-good" strokeWidth={2} />
        </span>
      </div>
    ),
  },
];

function IntroCard({ slide }: { slide: Slide }) {
  return (
    <article className="flex shrink-0 snap-start flex-col items-center" style={{ width: CARD_W }}>
      <div
        className="flex h-[236px] w-full items-center justify-center rounded-[24px]"
        style={{ background: slide.bg }}
      >
        <div className="flex size-[184px] items-center justify-center rounded-full bg-white/35">
          {slide.big ? (
            slide.art
          ) : (
            <div className="flex size-[112px] items-center justify-center rounded-full bg-surface">{slide.art}</div>
          )}
        </div>
      </div>
      <h2 className="font-title mt-4 text-center text-[22px] font-bold leading-[1.3] text-ink">{slide.title}</h2>
      <p className="mt-1 text-center text-[14px] leading-[1.5] text-ink-2">{slide.sub}</p>
    </article>
  );
}

/**
 * 1-1b · Service intro + "Name your Twin". The first thing a new user sees after
 * signing in: four cards on why Twins date first, then the Twin's name (default Momo).
 */
export default function IntroPage() {
  const router = useRouter();
  const twinName = useStore((s) => s.twin.name);
  const setTwin = useStore((s) => s.setTwin);
  const [name, setName] = useState(twinName || DEFAULT_NAME);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // Mouse drag-to-scroll (touch and trackpads scroll natively). Snapping is paused while dragging
  // so the browser doesn't fight the pointer, then we settle on the nearest card.
  const drag = useRef<{ startX: number; startLeft: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const i = Math.round(e.currentTarget.scrollLeft / (CARD_W + CARD_GAP));
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
  };

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ left: i * (CARD_W + CARD_GAP), behavior: "smooth" });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !scroller.current) return;
    drag.current = { startX: e.clientX, startLeft: scroller.current.scrollLeft, moved: false };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !scroller.current) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    scroller.current.scrollLeft = drag.current.startLeft - dx;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !scroller.current) return;
    const dx = e.clientX - drag.current.startX;
    const from = Math.round(drag.current.startLeft / (CARD_W + CARD_GAP));
    // a short flick still moves one card; otherwise land on the nearest one
    const target = Math.abs(dx) > 40 ? from - Math.sign(dx) : Math.round(scroller.current.scrollLeft / (CARD_W + CARD_GAP));
    drag.current = null;
    setDragging(false);
    goTo(Math.max(0, Math.min(SLIDES.length - 1, target)));
  };

  const next = () => {
    setTwin({ name: name.trim() || DEFAULT_NAME });
    router.push("/onboarding/connect");
  };

  return (
    <Screen className="pt-4 pb-8">
      <div className="flex flex-1 flex-col">
        <StepHeader
          step="1 / 4"
          title={"Here's how\nTwinDate works"}
          className="mb-6"
        />
        {/* Carousel bleeds to the screen edges so the next card peeks in */}
        <div
          ref={scroller}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            "-mx-5 flex scroll-pl-5 gap-4 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            dragging ? "cursor-grabbing select-none" : "cursor-grab snap-x snap-mandatory",
          )}
          style={{ gap: CARD_GAP }}
        >
          {SLIDES.map((s) => (
            <IntroCard key={s.title} slide={s} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Go to card ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className="-my-2 py-2"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-[width,background-color] duration-200",
                  i === index ? "w-6 bg-accent" : "w-2 bg-ink-3/60",
                )}
              />
            </button>
          ))}
        </div>

        <section className="mt-7">
          <label htmlFor="twin-name" className="block text-[17px] font-bold text-ink">
            Name your Twin
          </label>
          <div className="relative mt-3">
            <input
              id="twin-name"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && next()}
              maxLength={16}
              autoComplete="off"
              className="h-[72px] w-full rounded-[20px] border-[1.5px] border-accent bg-surface pl-6 pr-14 text-[20px] font-semibold text-ink outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
            <button
              type="button"
              aria-label="Edit name"
              onClick={() => inputRef.current?.focus()}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-ink-3"
            >
              <Pencil className="size-5" strokeWidth={1.75} />
            </button>
          </div>
        </section>

        <div className="mt-auto pt-8">
          <Button full onClick={next}>
            Continue
          </Button>
        </div>
      </div>
    </Screen>
  );
}
