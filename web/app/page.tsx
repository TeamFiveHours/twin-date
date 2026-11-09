"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore, useHydrated } from "@/lib/store";

export default function RootPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const onboarded = useStore((s) => s.onboarded);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(onboarded ? "/watch" : "/onboarding/signup");
  }, [hydrated, onboarded, router]);

  return <div className="min-h-dvh bg-bg" />;
}
