"use client";

import { Toaster } from "@/components/ui/Toast";
import { useHydrated } from "@/lib/store";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="min-h-dvh bg-bg" />;
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
