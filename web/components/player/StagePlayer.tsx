"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import type { Cue, Dialogue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Timeline, type Marker } from "./Timeline";

/**
 * Where the two panels sit in the stacked dialogue video (top = their Twin,
 * bottom = my Twin), as fractions of the stage height.
 */
const SPLIT = 0.47;

const BAR_HEIGHTS = [6, 11, 15, 8, 12, 7];

function SpeakingBars({ className, style, live }: { className?: string; style?: React.CSSProperties; live: boolean }) {
  return (
    <span
      aria-hidden
      style={style}
      className={cn("absolute flex h-6 items-end gap-[3px] rounded-lg bg-[#221C1799] px-2 py-[5px]", className)}
    >
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-[1.5px] bg-[#7FE3A8]", live && "animate-speak")}
          style={{ height: h, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * Stacked "square" stage from the Pencil detail screen: one video with the two
 * Twins' panels, name pills, a speaking indicator on whoever is talking, a CC
 * toggle, a centre play/pause, the caption bubble and the progress rail.
 * Playback is driven by media events only.
 */
export function StagePlayer({
  dialogue,
  alias,
  twin,
  onCueChange,
  onEnded,
}: {
  dialogue: Dialogue;
  alias: string;
  twin: string;
  onCueChange?: (cue: Cue | null) => void;
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const [duration, setDuration] = useState(dialogue.video.durationSec);
  const [paused, setPaused] = useState(true);
  const [ended, setEnded] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [cc, setCc] = useState(true);
  const [retry, setRetry] = useState(0);
  const wasPausedRef = useRef(true);
  const autoplayedRef = useRef(false);
  /** the centre button shows while paused and fades out ~1s after playback starts */
  const [ctlVisible, setCtlVisible] = useState(true);
  const hideTimer = useRef<number>(0);

  const { cues, highlights } = dialogue;

  const markers: Marker[] = useMemo(
    () =>
      highlights
        .map((h) => {
          const c = cues.find((x) => x.id === h.cueId);
          return c ? { time: c.start, tag: h.tag, cueId: c.id } : null;
        })
        .filter((m): m is Marker => !!m)
        .sort((a, b) => a.time - b.time),
    [cues, highlights],
  );

  const currentCue = useMemo(() => cues.find((c) => t >= c.start && t < c.end) ?? null, [cues, t]);

  useEffect(() => {
    onCueChange?.(currentCue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCue?.id]);

  // pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") videoRef.current?.pause();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const seek = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, v.duration || time));
    setT(v.currentTime);
    setEnded(false);
  }, []);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (ended) v.currentTime = 0;
    void v.play().catch(() => {});
  }, [ended]);

  const toggle = () => (paused ? play() : videoRef.current?.pause());

  useEffect(() => {
    window.clearTimeout(hideTimer.current);
    if (paused || ended) setCtlVisible(true);
    else hideTimer.current = window.setTimeout(() => setCtlVisible(false), 900);
    return () => window.clearTimeout(hideTimer.current);
  }, [paused, ended]);

  /** Start on arrival; if the browser refuses sound without a gesture, start muted instead of showing a play button. */
  const autoplay = (v: HTMLVideoElement) => {
    if (autoplayedRef.current) return;
    autoplayedRef.current = true;
    v.play().catch(() => {
      v.muted = true;
      void v.play().catch(() => {});
    });
  };

  const onScrub = (dragging: boolean) => {
    const v = videoRef.current;
    if (!v) return;
    if (dragging) {
      wasPausedRef.current = v.paused;
      v.pause();
    } else if (!wasPausedRef.current) {
      void v.play().catch(() => {});
    }
  };

  if (error) {
    return (
      <div className="rounded-3xl border border-line bg-surface">
        <EmptyState
          mood="awkward"
          title="I couldn't load the video"
          body="Check your connection and try again."
          cta="Retry"
          onCta={() => {
            setError(false);
            setReady(false);
            setRetry((r) => r + 1);
          }}
        />
      </div>
    );
  }

  const speaker = !paused && currentCue ? currentCue.speaker : null;
  const native = !!dialogue.video.native;
  const aspect = dialogue.video.aspect ?? "720 / 1120";
  const playTop = native ? 50 : SPLIT * 100;

  return (
    <div className="rounded-3xl bg-ink p-2">
      <div className="relative w-full overflow-hidden rounded-[18px] bg-[#2A2420]" style={{ aspectRatio: aspect }}>
        <video
          key={retry}
          ref={videoRef}
          src={dialogue.video.url}
          poster={dialogue.video.poster}
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || dialogue.video.durationSec)}
          onCanPlay={(e) => {
            setReady(true);
            autoplay(e.currentTarget);
          }}
          onClick={toggle}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          onProgress={(e) => {
            const v = e.currentTarget;
            if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
          }}
          onPlay={() => {
            setPaused(false);
            setEnded(false);
          }}
          onPause={() => setPaused(true)}
          onEnded={() => {
            setEnded(true);
            setPaused(true);
            onEnded?.();
          }}
          onError={() => setError(true)}
        />

        {/* name pills + speaking indicator: only for files without their own labels */}
        {!native && (
          <>
            <span className="absolute left-3 top-3 rounded-full bg-[#221C1799] px-2.5 py-1 text-[10px] font-semibold text-white">
              {alias}
            </span>
            <span
              className="absolute left-3 rounded-full bg-[#221C1799] px-2.5 py-1 text-[10px] font-semibold text-white"
              style={{ top: `calc(${SPLIT * 100}% + 12px)` }}
            >
              {twin}
            </span>
            {speaker === "other" && <SpeakingBars live className="left-3" style={{ top: `calc(${SPLIT * 100}% - 36px)` }} />}
            {speaker === "me" && <SpeakingBars live className="bottom-[72px] left-3" />}
          </>
        )}

        {/* CC toggle: no external captions available for pre-rendered demo files */}
        {cues.length > 0 && <button
          type="button"
          aria-pressed={cc}
          aria-label="Captions"
          onClick={() => setCc((c) => !c)}
          className="absolute right-3.5 top-3.5 flex flex-col items-center gap-[3px] rounded-lg bg-[#221C17B3] px-[7px] py-[5px] text-[11px] font-bold text-white"
        >
          CC
          <span className={cn("h-0.5 w-4 rounded-[1px]", cc ? "bg-accent" : "bg-white/30")} />
        </button>}

        {/* loading */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="size-7" light />
          </div>
        )}

        {/* bottom shade so captions and the rail read over bright frames */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

        {/* centre play / pause on the seam between the two panels; hidden while playing */}
        {ready && (
          <button
            type="button"
            onClick={toggle}
            tabIndex={ctlVisible ? 0 : -1}
            aria-label={ended ? "Watch again" : paused ? "Play" : "Pause"}
            className={cn(
              "absolute left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FFFFFFF2] text-ink shadow-lg transition-opacity duration-300 active:scale-95",
              ctlVisible ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            style={{ top: `${playTop}%` }}
          >
            {ended ? (
              <RotateCcw className="size-6" />
            ) : paused ? (
              <Play className="ml-0.5 size-6" fill="currentColor" />
            ) : (
              <Pause className="size-6" fill="currentColor" />
            )}
          </button>
        )}

        {/* caption */}
        {cc && currentCue && (
          <div aria-live="polite" className="absolute inset-x-3 bottom-10 flex justify-center">
            <span className="rounded-lg bg-[#000000A6] px-3 py-1.5 text-center text-[12px] leading-[1.4] text-white">
              {/* native files label speakers themselves; our speaker guess is only for timing */}
              {!native && currentCue.speaker === "other" && <span className="font-semibold">{alias}: </span>}
              {currentCue.text}
            </span>
          </div>
        )}

        {/* progress */}
        <div className="absolute inset-x-3.5 bottom-2">
          <Timeline overlay duration={duration} current={t} buffered={buffered} markers={markers} onSeek={seek} onScrub={onScrub} />
        </div>
      </div>
    </div>
  );
}
