"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import type {
  Chat,
  InstagramSummary,
  Interview,
  Meeting,
  Outcome,
  Twin,
  User,
} from "./types";
import { makeDefaultTwin } from "./persona";

export type Store = {
  onboarded: boolean;
  user: User | null;
  twin: Twin;
  /** liked = opened their photos; yes = asked to match; no = passed */
  decisions: Record<string, "liked" | "yes" | "no">;
  feedback: Record<string, "up" | "down">;
  outcomes: Record<string, Outcome>;
  interview: Interview | null;
  /** mock mutable state that would live on the server */
  chats: Record<string, Chat>;
  meetings: Record<string, Meeting>;
  logsCleared: boolean;
  blocked: string[];
  address: { name: string; phone: string; zip: string; street: string; apt: string } | null;
  /** id used for this user's browser profile on the agent server */
  agentUser: string | null;
  /** summary of the last Instagram snapshot the agent collected */
  instagram: InstagramSummary | null;
  /** dialogue ids the user has opened (clears the NEW badge) */
  seen: string[];

  set: (patch: Partial<Store> | ((s: Store) => Partial<Store>)) => void;
  setTwin: (patch: Partial<Twin> | ((t: Twin) => Partial<Twin>)) => void;
  reset: () => void;
};

const initial = () => ({
  onboarded: false,
  user: null,
  twin: makeDefaultTwin(),
  decisions: {},
  feedback: {},
  outcomes: {},
  interview: null,
  chats: {},
  meetings: {},
  logsCleared: false,
  blocked: [],
  address: null,
  agentUser: null,
  instagram: null,
  seen: [],
});

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...initial(),
      set: (patch) =>
        set((s) => (typeof patch === "function" ? patch(s) : patch)),
      setTwin: (patch) =>
        set((s) => ({
          twin: { ...s.twin, ...(typeof patch === "function" ? patch(s.twin) : patch) },
        })),
      reset: () => set(initial()),
    }),
    {
      name: "twindate-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { set: _s, setTwin: _t, reset: _r, ...rest } = s;
        return rest;
      },
    },
  ),
);

/** true once the persisted state has been rehydrated on the client */
export function useHydrated() {
  // Always start false so the first client render matches the server HTML;
  // zustand serves its initial (server) snapshot during React hydration.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const api = useStore.persist as typeof useStore.persist | undefined;
    if (!api) return;
    if (api.hasHydrated()) setHydrated(true);
    return api.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
