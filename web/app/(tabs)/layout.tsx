"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TabBar } from "@/components/layout/TabBar";
import { Toaster } from "@/components/ui/Toast";
import { useHydrated, useStore } from "@/lib/store";

/** Full-screen pages inside the tab group that hide the tab bar (dialogue detail, profile pick). */
const NO_TAB_BAR = [/^\/watch\/(?!suggested$)[^/]+$/, /^\/match\/pick$/, /^\/profile\/[^/]+$/];

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const showTabs = !NO_TAB_BAR.some((re) => re.test(path));
  const hydrated = useHydrated();
  const onboarded = useStore((s) => s.onboarded);
  const meetings = useStore((s) => s.meetings);
  const outcomes = useStore((s) => s.outcomes);

  useEffect(() => {
    if (hydrated && !onboarded) router.replace("/onboarding/signup");
  }, [hydrated, onboarded, router]);

  if (!hydrated || !onboarded) return <div className="min-h-dvh bg-bg" />;

  const surveyPending = Object.values(meetings).some(
    (m) => m.status === "confirmed" && !outcomes[m.id],
  );

  return (
    <>
      {children}
      {showTabs && <TabBar badge={{ "/match": surveyPending }} />}
      <Toaster />
    </>
  );
}
