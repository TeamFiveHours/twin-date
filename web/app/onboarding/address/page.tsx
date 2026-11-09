"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { requestRecorder } from "@/lib/api";
import { useStore } from "@/lib/store";

/** Mock shipping details (from the Pencil screen) so the prototype only needs a tap. */
const MOCK_ADDRESS = {
  name: "Jordan Lee",
  phone: "(415) 555-0132",
  zip: "94105",
  street: "110 Market St, San Francisco, CA",
  apt: "Floor 5, TwinDate",
};

const HOW = [
  "Enter your address",
  "Your wearable kit ships in 2–3 days",
  "Wear the kit for a week as you go about life",
  "Your Twin auto-upgrades from the data",
];

export default function AddressPage() {
  const router = useRouter();
  const saved = useStore((s) => s.address);
  const [form, setForm] = useState({ ...MOCK_ADDRESS, ...(saved ?? {}) });
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState<string | null>(null);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const finish = () => router.replace("/onboarding/matching");

  const findAddress = () => {
    if (!form.zip.trim()) {
      setShake("zip");
      setTimeout(() => setShake(null), 450);
      return;
    }
    // mock lookup
    setForm((f) => ({ ...f, street: f.street || MOCK_ADDRESS.street }));
  };

  const submit = async () => {
    const missing = (["name", "phone", "zip", "street"] as const).find((k) => !form[k].trim());
    if (missing) {
      setShake(missing);
      setTimeout(() => setShake(null), 450);
      return;
    }
    setBusy(true);
    await requestRecorder(form);
    toast("Your wearable kit is on its way");
    finish();
  };

  return (
    <Screen className="pt-4 pb-[172px]">
      <div className="flex flex-col gap-7">
        <StepHeader
          step="4 / 4"
          size={22}
          title="Where should we send your wearable kit?"
          sub="We'll send a small, lightweight wearable kit. Wear it for a week, then just send it back—that's it."
        />

        <ol className="rounded-2xl border border-line bg-surface px-4 py-1.5">
          {HOW.map((label, i) => (
            <li key={label} className="flex items-center gap-4 py-3">
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">
                {i + 1}
              </span>
              <span className="text-[14px] font-semibold text-ink">{label}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-4">
          <Input label="Recipient" placeholder="Jordan Lee" value={form.name} onChange={upd("name")} shake={shake === "name"} autoComplete="name" />
          <Input label="Phone number" placeholder="(415) 555-0132" value={form.phone} onChange={upd("phone")} shake={shake === "phone"} inputMode="tel" autoComplete="tel" />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="ZIP code" placeholder="94105" value={form.zip} onChange={upd("zip")} shake={shake === "zip"} inputMode="numeric" autoComplete="postal-code" />
            </div>
            <button
              type="button"
              onClick={findAddress}
              className="flex h-14 shrink-0 items-center gap-1.5 rounded-2xl bg-ink px-[18px] text-[14px] font-semibold text-white active:scale-[0.98]"
            >
              <Search className="size-[15px]" />
              Find address
            </button>
          </div>
          <Input label="Street address" placeholder="110 Market St, San Francisco, CA" value={form.street} onChange={upd("street")} shake={shake === "street"} autoComplete="street-address" />
          <Input label="Apt / unit" placeholder="Floor 5, TwinDate" value={form.apt} onChange={upd("apt")} />
        </div>

        <div className="flex gap-2 rounded-xl bg-surface-2 px-3.5 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-good" />
          <p className="text-[12px] leading-[1.5] text-ink-2">
            Shipping and returns are fully encrypted and secure. After use, the kit is sent back
            free and wiped.
          </p>
        </div>

      </div>

      {/* CTA stays on screen while the form scrolls underneath */}
      <div className="app-fixed pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center">
        <div className="safe-bottom pointer-events-auto flex w-full min-[480px]:max-w-[390px] flex-col items-center gap-3 bg-gradient-to-t from-bg via-bg/95 to-bg/0 px-5 pt-8">
          <Button full loading={busy} onClick={submit}>
            Request my wearable kit
          </Button>
          <button type="button" onClick={finish} className="text-[13px] font-semibold text-ink-3">
            Skip the kit—start with just my text data
          </button>
        </div>
      </div>
    </Screen>
  );
}
