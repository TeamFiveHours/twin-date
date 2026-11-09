"use client";

import { useSearchParams } from "next/navigation";
import type { ScreenState } from "@/lib/types";

/** Reads ?state=empty|loading|error to force a screen state for QA. */
export function useScreenState(): ScreenState {
  const sp = useSearchParams();
  const s = sp.get("state");
  if (s === "empty" || s === "loading" || s === "error") return s;
  return null;
}
