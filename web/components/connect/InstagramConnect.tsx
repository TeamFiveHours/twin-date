"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { TwinMini } from "@/components/twin/TwinMini";
import { agent, agentConfigured, phaseLabel, type AgentStatus } from "@/lib/agent";
import { connectSource } from "@/lib/api";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const VIEW = { w: 390, h: 720 }; // must match agent VIEWPORT

type Stage = "starting" | "login" | "collecting" | "done" | "error" | "offline";

/**
 * Bottom sheet with a live view of the user's server-side browser.
 * The user logs in to Instagram inside it; once a session cookie appears the
 * agent takes over, reads feed + follow lists, and we record the summary.
 */
export function InstagramConnect({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
}) {
  const twin = useStore((s) => s.twin.name);
  const [stage, setStage] = useState<Stage>("starting");
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [frameReady, setFrameReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const collectStarted = useRef(false);
  const stageRef = useRef<Stage>("starting");
  stageRef.current = stage;

  const send = useCallback((obj: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }, []);

  const closeStream = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const openStream = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;
    const ws = new WebSocket(agent.wsUrl());
    wsRef.current = ws;
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current;
      if (!c) return;
      if (c.width !== img.width || c.height !== img.height) {
        c.width = img.width;
        c.height = img.height;
      }
      c.getContext("2d")?.drawImage(img, 0, 0);
      setFrameReady(true);
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "frame") img.src = "data:image/jpeg;base64," + msg.data;
      else if (msg.type === "closed") setFrameReady(false);
    };
    ws.onclose = () => setFrameReady(false);
  }, []);

  // Start: boot the server browser, then stream + poll status
  useEffect(() => {
    if (!open) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    collectStarted.current = false;
    setStage("starting");
    setStatus(null);
    setErrorMsg(null);
    setFrameReady(false);

    const finish = async () => {
      try {
        const latest = await agent.latest();
        useStore.getState().set({
          instagram: { username: latest.username, collectedAt: latest.collectedAt, counts: latest.counts },
        });
        await connectSource("instagram");
        setStage("done");
        onConnected?.();
        toast(`Instagram connected${latest.username ? ` · @${latest.username}` : ""}`);
        setTimeout(() => alive && onClose(), 1200);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Could not read the snapshot");
        setStage("error");
      }
    };

    const poll = async () => {
      if (!alive) return;
      try {
        const s = await agent.status();
        if (!alive) return;
        setStatus(s);
        if (s.phase === "error") {
          setErrorMsg(s.error || "Collection failed");
          setStage("error");
          return;
        }
        if (s.phase === "done" && s.lastSnapshotId && stageRef.current === "collecting") {
          await finish();
          return;
        }
        if (s.loggedIn && !collectStarted.current) {
          collectStarted.current = true;
          setStage("collecting");
          await agent.collect();
        } else if (!s.loggedIn && stageRef.current === "starting") {
          setStage("login");
        }
      } catch (e) {
        if (!alive) return;
        setErrorMsg(e instanceof Error ? e.message : "Agent unreachable");
        setStage("offline");
        return;
      }
      timer = setTimeout(poll, 1500);
    };

    (async () => {
      try {
        await agent.connect();
        if (!alive) return;
        openStream();
        setStage("login");
        poll();
      } catch (e) {
        if (!alive) return;
        setErrorMsg(e instanceof Error ? e.message : "Agent unreachable");
        setStage("offline");
      }
    })();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      closeStream();
    };
  }, [open, openStream, closeStream, onClose, onConnected]);

  // ---- input relay ----
  const toPage = (ev: React.MouseEvent) => {
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: Math.round(((ev.clientX - r.left) / r.width) * VIEW.w),
      y: Math.round(((ev.clientY - r.top) / r.height) * VIEW.h),
    };
  };
  const interactive = stage === "login";

  const onKey = (ev: React.KeyboardEvent) => {
    if (!interactive) return;
    if (ev.key === "Tab" || ev.key === "Enter" || ev.key === "Backspace" || ev.key === "Escape" || ev.key.length === 1) {
      ev.preventDefault();
      send({ type: "key", key: ev.key, ctrl: ev.ctrlKey, meta: ev.metaKey, alt: ev.altKey, shift: ev.shiftKey });
    } else if (/^Arrow/.test(ev.key)) {
      ev.preventDefault();
      send({ type: "key", key: ev.key });
    }
  };

  const sendText = () => {
    if (!text) return;
    send({ type: "text", text });
    setText("");
  };

  const retry = async () => {
    setStage("starting");
    setErrorMsg(null);
    collectStarted.current = false;
    try {
      await agent.connect();
      openStream();
      setStage("login");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Agent unreachable");
      setStage("offline");
    }
  };

  const progress = status?.progress ?? {};
  const counts = [
    ["feed", "posts"],
    ["reels", "reels"],
    ["followers", "followers"],
    ["following", "following"],
  ] as const;

  return (
    <BottomSheet open={open} onClose={onClose} dismissible={stage !== "collecting"} className="max-h-[94dvh] overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-title text-[20px] font-bold text-ink">Connect Instagram</h3>
          <p className="mt-1 text-[13px] leading-snug text-ink-2">
            {stage === "login" && "Log in below. The window runs on our side, so nothing is installed on your phone."}
            {stage === "starting" && "Opening a private browser for you…"}
            {stage === "collecting" && `${twin} is reading. Don't tap the window for a minute.`}
            {stage === "done" && "All set."}
            {stage === "error" && (errorMsg || "Something went wrong.")}
            {stage === "offline" && (agentConfigured ? "The agent server isn't running." : "Instagram connection isn't available here yet.")}
          </p>
        </div>
        <TwinMini who="me" mood={stage === "collecting" ? "thinking" : stage === "done" ? "happy" : "neutral"} />
      </div>

      {/* live view */}
      {stage !== "offline" && (
        <div className="mt-4">
          <div
            tabIndex={0}
            onKeyDown={onKey}
            onClick={(ev) => {
              (ev.currentTarget as HTMLElement).focus();
              if (!interactive) return;
              send({ type: "click", ...toPage(ev), button: 0, detail: Math.min(ev.detail || 1, 3) });
            }}
            onWheel={(ev) => interactive && send({ type: "wheel", ...toPage(ev), dy: Math.round(ev.deltaY) })}
            onMouseMove={(ev) => interactive && send({ type: "move", ...toPage(ev) })}
            className={cn(
              "relative mx-auto aspect-[390/720] max-h-[52dvh] overflow-hidden rounded-2xl bg-ink outline-none ring-offset-2 focus:ring-2 focus:ring-twin",
              !interactive && "pointer-events-none",
            )}
            style={{ width: "min(100%, calc(52dvh * 390 / 720))" }}
            aria-label="Live browser view"
          >
            <canvas ref={canvasRef} className="h-full w-full" />
            {!frameReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner light />
              </div>
            )}
            {stage === "collecting" && (
              <div className="absolute inset-x-0 bottom-0 bg-[#221C17CC] px-3 py-2 text-[12px] font-medium text-white">
                {phaseLabel(status?.phase ?? "profile", twin)}
              </div>
            )}
          </div>

          {interactive && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendText();
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type here, then tap send (for Korean input)"
                className="h-11 flex-1 rounded-full border border-line bg-surface px-4 text-[13px] outline-none focus:border-twin"
              />
              <button
                type="submit"
                aria-label="Send text"
                className="flex size-11 items-center justify-center rounded-full bg-ink text-white"
              >
                <Send className="size-4" />
              </button>
            </form>
          )}
        </div>
      )}

      {stage === "collecting" && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {counts.map(([k, label]) => (
            <div key={k} className="rounded-xl bg-surface-2 px-2 py-2 text-center">
              <div className="text-[16px] font-bold text-ink">{Number(progress[k] ?? 0)}</div>
              <div className="text-[10px] text-ink-3">{label}</div>
            </div>
          ))}
        </div>
      )}

      {stage === "offline" && (
        <div className="mt-4 rounded-2xl bg-surface-2 p-4 text-[13px] leading-relaxed text-ink-2">
          {agentConfigured ? (
            <>
              Start it from the project folder, then try again:
              <code className="mt-2 block rounded-lg bg-ink px-3 py-2 text-[12px] text-white">npm run dev --prefix agent</code>
            </>
          ) : (
            "This build has no agent server configured (NEXT_PUBLIC_AGENT_URL). You can connect other sources in the meantime."
          )}
          {errorMsg && <div className="mt-2 text-[11px] text-ink-3">{errorMsg}</div>}
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 text-[11px] leading-snug text-ink-3">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Read-only. {twin} never likes, follows, posts or messages. Your password stays in the browser window and is never
          stored.
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        {(stage === "error" || (stage === "offline" && agentConfigured)) && (
          <Button variant="ink" full onClick={retry}>
            Try again
          </Button>
        )}
        {stage !== "collecting" && stage !== "done" && (
          <Button variant="secondary" full onClick={onClose}>
            Not now
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}
