"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Heart, X } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAsync } from "@/hooks/useAsync";
import { getFeed } from "@/lib/feed-client";
import { FEED_RESULT_META } from "@/lib/feed-types";
import { useStore } from "@/lib/store";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const twinName = useStore((s) => s.twin.name);
  const decision = useStore((s) => s.decisions[id]);
  const setStore = useStore((s) => s.set);
  const { data, loading, error, reload } = useAsync(() => getFeed(id), [id]);

  if (loading) return <Screen><TopNav backHref={`/watch/${id}`} /><Skeleton className="mt-4 h-[340px] rounded-2xl" /></Screen>;
  if (error || !data) return <Screen><TopNav backHref="/watch" />
    <p className="py-10 text-center text-sm text-ink-2">{error ? "Could not load the profile." : "Profile not found."}</p>
    {error && <button onClick={reload} className="block w-full text-center font-semibold text-accent">Retry</button>}
  </Screen>;

  const profile = data.profiles;
  const meta = FEED_RESULT_META[data.result];
  const decide = (value: "liked" | "no") => setStore((s) => ({ decisions: { ...s.decisions, [id]: value } }));

  return <Screen>
    <TopNav backHref={`/watch/${id}`} title="Profile" />
    <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="relative h-[360px] bg-surface-2">
        {profile.photo_url ? (
          <Image src={profile.photo_url} alt={`${profile.name}'s profile photo`} fill sizes="(max-width: 480px) 100vw, 420px" className="object-cover" priority />
        ) : <div className="flex h-full items-center justify-center text-ink-3">No photo</div>}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute inset-x-5 bottom-5 text-white">
          <h1 className="font-title text-[28px] font-bold">{profile.name}{profile.age !== null ? `, ${profile.age}` : ""}</h1>
          {profile.affiliation && <p className="text-[14px] text-white/90">{profile.affiliation}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-4 p-[18px]">
        <div className="flex items-center gap-2"><Chip tone={meta.tone}>{meta.label}</Chip><span className="text-[12px] text-ink-3">AI Twin: {data.twin_name}</span></div>
        <div className="rounded-2xl bg-good-soft p-4">
          <p className="mb-2 text-[13px] font-semibold text-twin">{twinName}&apos;s one-liner</p>
          <p className="text-[15px] font-semibold leading-relaxed text-ink">{data.momo_one_liner}</p>
        </div>
        <div>
          <h2 className="mb-2 text-[14px] font-bold text-ink">{twinName}&apos;s take</h2>
          <p className="text-[14px] leading-relaxed text-ink-2">{data.momo_take}</p>
        </div>
        <div className="h-px bg-line" />
        <div>
          <h2 className="mb-3 text-[14px] font-bold text-ink">What {data.twin_name} said</h2>
          {data.partner_messages.length ? (
            <div className="flex flex-col gap-4">
              {data.partner_messages.map((message) => (
                <div key={message.seq} className="grid grid-cols-[76px_1fr] gap-2 text-[14px] leading-relaxed">
                  <span className="font-semibold text-ink-3">{profile.name}</span>
                  <p className="text-ink">{message.content}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-ink-3">No lines saved for this conversation.</p>}
        </div>
      </div>
    </div>
    <div className="my-5 flex flex-col items-center gap-3">
      {decision === "liked" || decision === "yes" ? <Chip tone="accent">Liked</Chip> : (
        <Button full size="lg" icon={<Heart className="size-5" fill="currentColor" />} onClick={() => decide("liked")}>Like</Button>
      )}
      <button type="button" className="flex items-center gap-2 py-2 text-[13px] font-semibold text-ink-3" onClick={() => { decide("no"); router.push("/watch"); }}><X className="size-4" />Doesn&apos;t seem like a match</button>
    </div>
  </Screen>;
}
