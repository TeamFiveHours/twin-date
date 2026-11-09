"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Keyboard, Mic, RotateCcw, SkipForward, Square, User, Video, VideoOff } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { TwinAvatar } from "@/components/twin/TwinAvatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { addAccuracy, interviewNext, type InterviewStep } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Turn } from "@/lib/types";
import { cn, fmtTime } from "@/lib/utils";
import interviewJson from "@/data/interview.json";

type Mode = "full" | "extra";

const SILENCE_MS = 30_000;
const SILENCE_HINT = "Feel free to say anything—there's no wrong answer.";
/** below this many real answers the Twin is rough; we warn before finishing */
const MIN_ANSWERS = 3;

/* Minimal typing for the Web Speech API (not in lib.dom for all targets). */
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Does the saved transcript belong to the given mode? (first question check) */
function transcriptMatchesMode(transcript: Turn[], mode: Mode) {
  const first = transcript.find((t) => t.role === "interviewer")?.text;
  if (!first) return true; // empty — fine for either
  const extraFirst = interviewJson.extra[0].questions[0].q;
  return mode === "extra" ? first === extraFirst : first !== extraFirst;
}

function InterviewInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const mode: Mode = sp.get("mode") === "extra" ? "extra" : "full";

  const interview = useStore((s) => s.interview);
  const setStore = useStore((s) => s.set);

  const [step, setStep] = useState<InterviewStep | null>(null);
  const [mood, setMood] = useState<"thinking" | "talking">("thinking");
  const [captionHidden, setCaptionHidden] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [silenceHint, setSilenceHint] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [finishSheet, setFinishSheet] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [camDenied, setCamDenied] = useState(false);
  const [listening, setListening] = useState(false);
  const [hasSpeech, setHasSpeech] = useState(false);
  /** what the mic heard so far; shown inline under the stage, sent with a tap */
  const [heard, setHeard] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const booted = useRef(false);

  // real answers only: skipped questions are stored as empty "me" turns
  const answered = interview?.transcript.filter((t) => t.role === "me" && t.text.trim()).length ?? 0;
  const topicCount = step?.topicCount ?? (mode === "extra" ? interviewJson.extra.length : interviewJson.topics.length);
  const total = topicCount * 2;
  const questionNo = step ? step.topicIndex * 2 + step.questionIndex + 1 : 1;

  const armSilence = useCallback(() => {
    if (silenceRef.current) clearTimeout(silenceRef.current);
    setSilenceHint(false);
    silenceRef.current = setTimeout(() => setSilenceHint(true), SILENCE_MS);
  }, []);

  /** Shows a new question with a 0.3s caption fade and the thinking→talking beat. */
  const presentQuestion = useCallback(
    (next: InterviewStep, transcript: Turn[]) => {
      const last = transcript[transcript.length - 1];
      if (!(last && last.role === "interviewer" && last.text === next.question)) {
        const cur = useStore.getState().interview;
        if (cur) {
          setStore({
            interview: {
              ...cur,
              topicIndex: next.topicIndex,
              transcript: [...transcript, { role: "interviewer", text: next.question, at: Date.now() }],
            },
          });
        }
      }
      setCaptionHidden(true);
      setTimeout(() => {
        setStep(next);
        setCaptionHidden(false);
      }, 300);
      setMood("thinking");
      setTimeout(() => setMood("talking"), 800);
      armSilence();
    },
    [armSilence, setStore],
  );

  /* boot: create/resume interview, fetch current question */
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    let cur = useStore.getState().interview;
    if (!cur || !transcriptMatchesMode(cur.transcript, mode)) {
      cur = { transcript: [], topicIndex: 0, startedAt: Date.now() };
      setStore({ interview: cur });
    }
    const transcript = cur.transcript;
    interviewNext(transcript, mode).then((next) => {
      if (next.done) {
        router.replace(mode === "full" ? "/onboarding/kit" : "/me");
        return;
      }
      presentQuestion(next, transcript);
    });
    setHasSpeech(!!getRecognition());
    return () => {
      if (silenceRef.current) clearTimeout(silenceRef.current);
    };
  }, [mode, presentQuestion, router, setStore]);

  /* timer */
  useEffect(() => {
    const tick = () => {
      const start = useStore.getState().interview?.startedAt ?? Date.now();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* camera */
  useEffect(() => {
    if (!camOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamDenied(true);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setCamDenied(false);
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCamDenied(true));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [camOn]);

  /* re-attach stream when the <video> remounts */
  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  });

  const finishTo = useCallback(async () => {
    if (silenceRef.current) clearTimeout(silenceRef.current);
    setFinishSheet(false);
    if (mode === "extra") {
      await addAccuracy(8);
      toast("Thanks—I know you a bit better now");
      router.replace("/me");
    } else {
      router.replace("/onboarding/kit");
    }
  }, [mode, router]);

  /** Records a "me" turn (empty = skipped) and moves to the next question. */
  const advance = async (text: string) => {
    if (sending) return;
    setSending(true);
    const cur = useStore.getState().interview;
    if (!cur) return;
    const transcript: Turn[] = [...cur.transcript, { role: "me", text, at: Date.now() }];
    setStore({ interview: { ...cur, transcript } });
    setAnswer("");
    setSheet(false);
    setMood("thinking");
    const next = await interviewNext(transcript, mode);
    setSending(false);
    if (next.done) {
      await finishTo();
      return;
    }
    presentQuestion(next, transcript);
  };

  const submit = () => {
    const text = answer.trim();
    if (!text) return;
    void advance(text);
  };

  const skip = () => {
    recRef.current?.stop();
    setHeard("");
    void advance("");
  };

  const toggleMic = () => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setHeard(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      toast("I can't reach your microphone—type your answer instead");
    };
    recRef.current = rec;
    setHeard("");
    setListening(true);
    rec.start();
  };

  const sendHeard = () => {
    const text = heard.trim();
    if (!text) return;
    setHeard("");
    void advance(text);
  };

  const isLast = !!step && questionNo >= total;

  return (
    <Screen className="pt-4 pb-6">
      <div className="flex flex-col gap-5">
        {/* Same header as the other onboarding steps; the per-question row sits under it */}
        <StepHeader
          step={mode === "extra" ? "Extra questions" : "3 / 4"}
          title={mode === "extra" ? "A few more\nfor your Twin" : "Tell your Twin\nabout you"}
          size={22}
        />
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-[13px] font-semibold text-ink-2">
              Question {questionNo} / {total}
              {step?.topicTitle ? ` · ${step.topicTitle}` : ""}
            </span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[13px] font-semibold text-ink-3">{fmtTime(elapsed)}</span>
              <button
                type="button"
                onClick={() => setFinishSheet(true)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink active:bg-surface-2"
              >
                Finish
              </button>
            </div>
          </div>
          {/* one segment per question: filled = answered or skipped, half = current */}
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-sm transition-colors",
                  i < questionNo - 1 ? "bg-accent" : i === questionNo - 1 ? "bg-accent/50" : "bg-line",
                )}
              />
            ))}
          </div>
        </div>

        {/* Stage */}
        <div className="relative h-[440px] overflow-hidden rounded-3xl bg-twin-soft">
          <div className="absolute left-[55px] top-[48px] size-60 rounded-full bg-[#FFFFFF80]" />
          <div className="absolute left-1/2 top-[72px] -translate-x-1/2">
            <TwinAvatar who="other" bun={false} mood={mood} size={120} />
          </div>

          <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-[#FFFFFFCC] py-1 pl-2 pr-2.5 text-[11px] font-semibold text-ink">
            <span className="size-2 animate-blink rounded-full bg-[#E5484D] shadow-[0_0_0_3px_#E5484D33]" />
            Recording
          </span>

          <div
            aria-live="polite"
            className={cn(
              "absolute inset-x-5 bottom-[26px] flex flex-col gap-1.5 rounded-2xl bg-surface px-4 py-3.5 transition-opacity duration-300",
              captionHidden && "opacity-0",
            )}
            style={{ maxWidth: 310 }}
          >
            <span className="text-[11px] font-semibold text-twin">Interviewer</span>
            <p className="text-[15px] leading-[1.5] text-ink">{step?.question ?? "Give me a second…"}</p>
            {step?.hint ? (
              <p className="text-[12px] leading-snug text-ink-3">{step.hint}</p>
            ) : (
              silenceHint && <p className="text-[12px] leading-snug text-ink-3">{SILENCE_HINT}</p>
            )}
          </div>

          <div className="absolute right-5 top-5 flex h-[68px] w-[92px] items-center justify-center overflow-hidden rounded-xl bg-ink-2">
            {camOn && !camDenied ? (
              <video ref={videoRef} autoPlay muted playsInline className="size-full object-cover" />
            ) : (
              <User className="size-7 text-[#FFFFFF99]" />
            )}
          </div>
        </div>

        {/* Voice answer: live transcript while listening, then send or retry */}
        {(listening || heard) && (
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 animate-fade-in">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-accent">
              {listening ? (
                <>
                  <span className="size-2 animate-blink rounded-full bg-accent" />
                  Listening… speak naturally
                </>
              ) : (
                "Here's what I heard"
              )}
            </div>
            <p className="min-h-[22px] text-[15px] leading-[1.5] text-ink">
              {heard || <span className="text-ink-3">…</span>}
            </p>
            <div className="flex gap-2">
              {listening ? (
                <Button full variant="secondary" icon={<Square className="size-4" fill="currentColor" />} onClick={toggleMic}>
                  Done talking
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    icon={<RotateCcw className="size-4" />}
                    onClick={() => {
                      setHeard("");
                      toggleMic();
                    }}
                  >
                    Try again
                  </Button>
                  <Button full loading={sending} disabled={!heard.trim()} onClick={sendHeard}>
                    {isLast ? "Send & finish" : "Send"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            aria-label="Speak your answer"
            disabled={!hasSpeech || !step}
            onClick={toggleMic}
            className={cn(
              "flex size-14 items-center justify-center rounded-full border border-line bg-surface text-ink active:scale-95 disabled:opacity-50",
              listening && "border-accent bg-accent-soft text-accent",
            )}
          >
            <Mic className="size-[22px]" />
          </button>
          <button
            type="button"
            aria-label={camOn ? "Turn camera off" : "Turn camera on"}
            onClick={() => setCamOn((v) => !v)}
            className="flex size-14 items-center justify-center rounded-full border border-line bg-surface text-ink active:scale-95"
          >
            {camOn ? <Video className="size-[22px]" /> : <VideoOff className="size-[22px]" />}
          </button>
          <button
            type="button"
            aria-label="Type your answer"
            disabled={!step}
            onClick={() => setSheet(true)}
            className="flex size-14 items-center justify-center rounded-full border border-line bg-surface text-ink active:scale-95 disabled:opacity-50"
          >
            <Keyboard className="size-[22px]" />
          </button>
          <button
            type="button"
            disabled={!step || sending}
            onClick={skip}
            className="flex h-14 items-center gap-1.5 rounded-full bg-ink px-[18px] text-[14px] font-semibold text-white active:scale-[0.98] disabled:opacity-50"
          >
            <SkipForward className="size-4" />
            {isLast ? "Skip & finish" : "Skip"}
          </button>
        </div>

        <p className="text-center text-[12px] leading-[1.5] text-ink-3">
          Answer in your own words—there&apos;s no wrong answer. Skip a question anytime, or tap
          Finish to stop here; your answers are saved.
        </p>
      </div>

      {/* Answer sheet */}
      <BottomSheet open={sheet} onClose={() => setSheet(false)}>
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-[11px] font-semibold text-twin">Interviewer</span>
            <p className="mt-1 text-[14px] leading-snug text-ink">{step?.question}</p>
            {step?.hint && <p className="mt-1 text-[12px] leading-snug text-ink-3">{step.hint}</p>}
          </div>
          <Textarea
            rows={4}
            autoFocus
            placeholder="Type your answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button full loading={sending} disabled={!answer.trim()} onClick={submit}>
            {isLast ? "Send & finish" : "Send"}
          </Button>
        </div>
      </BottomSheet>

      {/* Finish sheet */}
      <BottomSheet open={finishSheet} onClose={() => setFinishSheet(false)}>
        <h3 className="font-title text-[20px] font-bold text-ink">
          {answered >= MIN_ANSWERS ? "Finish the interview?" : "Finish already?"}
        </h3>
        <p className="mt-1 text-[13px] leading-snug text-ink-2">
          {answered} of {total} answered.{" "}
          {answered >= MIN_ANSWERS
            ? "You can always add more later from your page."
            : `With fewer than ${MIN_ANSWERS} answers your Twin will be rough—two more questions make a big difference.`}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button full onClick={() => setFinishSheet(false)}>
            Keep answering
          </Button>
          <Button full variant="secondary" onClick={() => void finishTo()}>
            {mode === "full" ? "Finish & build my Twin" : "Finish"}
          </Button>
        </div>
      </BottomSheet>
    </Screen>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <InterviewInner />
    </Suspense>
  );
}
