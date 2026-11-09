"use client";

import Image from "next/image";
import { TwinAvatar } from "@/components/twin/TwinAvatar";

export function MatchOverlay({ photo, name }: { photo: string; name: string }) {
  return (
    <div className="app-fixed fixed inset-0 z-[70] flex items-center justify-center bg-gradient-to-b from-twin-soft to-accent-soft">
      <div className="flex w-full min-[480px]:max-w-[390px] flex-col items-center px-6 text-center">
        <div className="flex items-center">
          <div className="animate-match-in rounded-full bg-surface p-1 shadow-lg">
            <TwinAvatar who="me" mood="happy" size={96} />
          </div>
          <div className="animate-match-in relative -ml-4 size-[104px] overflow-hidden rounded-full border-4 border-surface bg-surface-2 shadow-lg">
            {photo && <Image src={photo} alt={name} fill sizes="104px" className="object-cover" />}
          </div>
        </div>
        <h2 className="font-title mt-6 text-[26px] font-bold text-ink">You both said Yes!</h2>
        <p className="mt-2 text-[14px] text-ink-2">Opening a chat with {name}…</p>
      </div>
    </div>
  );
}
