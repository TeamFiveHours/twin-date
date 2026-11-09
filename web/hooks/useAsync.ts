"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScreenState } from "@/lib/types";

type Opts = { forced?: ScreenState };

/**
 * Tiny data hook: runs `fn` on mount (and when `deps` change), exposes
 * data / loading / error, and lets ?state= force loading or error.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList,
  opts: Opts = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    if (opts.forced === "loading") return;
    if (opts.forced === "error") {
      setLoading(false);
      setError("forced");
      return;
    }
    fnRef
      .current()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "error");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, opts.forced]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, setData, loading, error, reload };
}
