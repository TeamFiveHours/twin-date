"use client";

/**
 * Client for the browser agent (agent/ service). The agent runs a server-side
 * Chrome per user; the user logs in to Instagram inside a live view, then the
 * agent reads their feed and follow lists. Nothing here stores credentials.
 */

import { useStore } from "./store";
import type { InstagramSummary } from "./types";

/**
 * Where the agent runs. Set NEXT_PUBLIC_AGENT_URL in deployments; the localhost
 * fallback applies only to `next dev`. `null` means the integration isn't set up.
 */
export const AGENT_URL: string | null =
  process.env.NEXT_PUBLIC_AGENT_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3100" : null);

export const agentConfigured = AGENT_URL !== null;

export type AgentPhase =
  | "idle"
  | "profile"
  | "feed"
  | "reels"
  | "explore"
  | "followers"
  | "following"
  | "done"
  | "error";

export type AgentStatus = {
  started: boolean;
  loggedIn: boolean;
  busy: boolean;
  phase: AgentPhase;
  progress?: Record<string, number | string | null>;
  error?: string | null;
  lastSnapshotId?: string | null;
  url?: string;
};

/** Stable per-user id for the agent's browser profile (created once, persisted). */
export function agentUserId(): string {
  const s = useStore.getState();
  if (s.agentUser) return s.agentUser;
  const id = "u_" + Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, "0")).join("");
  s.set({ agentUser: id });
  return id;
}

async function call<T>(method: "GET" | "POST", path: string, body?: Record<string, unknown>): Promise<T> {
  if (!AGENT_URL) throw new Error("Instagram connection isn't set up for this deployment.");
  const user = agentUserId();
  const url = `${AGENT_URL}${path}${path.includes("?") ? "&" : "?"}user=${user}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify({ ...body, user }) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
  return data as T;
}

export const agent = {
  health: () => call<{ ok: boolean }>("GET", "/api/health"),
  status: () => call<AgentStatus>("GET", "/api/status"),
  connect: () => call<AgentStatus>("POST", "/api/connect"),
  disconnect: () => call<{ ok: boolean }>("POST", "/api/disconnect"),
  collect: () => call<{ started: boolean; busy?: boolean }>("POST", "/api/collect"),
  latest: () =>
    call<{ id: string; collectedAt: string; username: string | null; counts: InstagramSummary["counts"] }>(
      "GET",
      "/api/snapshots/latest",
    ),
  wsUrl: () => `${(AGENT_URL ?? "").replace(/^http/, "ws")}/ws/browser?user=${agentUserId()}`,
};

export function phaseLabel(phase: AgentPhase, twin: string) {
  switch (phase) {
    case "profile":
      return "Reading your profile…";
    case "feed":
      return "Reading what your feed shows first…";
    case "reels":
      return "Peeking at your reels…";
    case "explore":
      return "Looking at your explore page…";
    case "followers":
      return "Reading your followers…";
    case "following":
      return "Reading who you follow…";
    case "done":
      return `${twin} has what it needs`;
    case "error":
      return "Something went wrong";
    default:
      return "Starting…";
  }
}
