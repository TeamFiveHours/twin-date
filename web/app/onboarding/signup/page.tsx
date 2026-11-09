"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/layout/Screen";
import { BRAND, LogoMark, Wordmark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { signIn } from "@/lib/api";
import { useStore } from "@/lib/store";

function GoogleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.37 12.67c-.02-2.3 1.88-3.4 1.97-3.46-1.07-1.57-2.74-1.78-3.33-1.81-1.42-.14-2.77.84-3.49.84-.72 0-1.83-.82-3.01-.8-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.68 2.36 2.88 2.31 1.16-.05 1.6-.75 3-.75s1.79.75 3.01.73c1.24-.02 2.03-1.13 2.79-2.25.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.42-.93-2.46-3.71zM14.08 5.9c.64-.77 1.07-1.85.95-2.92-.92.04-2.03.61-2.69 1.38-.59.68-1.11 1.78-.97 2.83 1.03.08 2.07-.52 2.71-1.29z" />
    </svg>
  );
}

/** Splash-style entry screen: the brand mark on its paper background, sign-in pinned to the bottom. */
export default function SignupPage() {
  const router = useRouter();
  const onboarded = useStore((s) => s.onboarded);
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  useEffect(() => {
    if (onboarded) router.replace("/watch");
  }, [onboarded, router]);

  const go = async (provider: "google" | "apple") => {
    if (loading) return;
    setLoading(provider);
    await signIn(provider);
    router.push("/onboarding/intro");
  };

  return (
    <Screen className="relative overflow-hidden pb-8" style={{ background: BRAND.splash }}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: BRAND.glow }} />
      <div className="relative flex flex-1 flex-col">
        {/* Brand */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="animate-match-in">
            <LogoMark size={190} inner="#FBDCD2" />
          </div>
          <h1 className="mt-8">
            <Wordmark className="text-[46px]" />
          </h1>
          <p className="mt-3 text-[17px] font-medium" style={{ color: "#5B5F6E" }}>
            Let your Twin date first.
          </p>
        </div>

        {/* Sign-in, pinned to the bottom */}
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <Button
            variant="secondary"
            full
            icon={<GoogleGlyph />}
            loading={loading === "google"}
            disabled={loading === "apple"}
            onClick={() => go("google")}
            className="text-[16px]"
          >
            Continue with Google
          </Button>
          <Button
            variant="ink"
            full
            icon={<AppleGlyph />}
            loading={loading === "apple"}
            disabled={loading === "google"}
            onClick={() => go("apple")}
            className="bg-[#141414] text-[16px]"
          >
            Continue with Apple
          </Button>
          <p className="pt-1 text-center text-[12px] leading-[1.5]" style={{ color: "#6B6F7A" }}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </Screen>
  );
}
