"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Heart, X } from "lucide-react";
import { MatchOverlay } from "@/components/match/MatchOverlay";
import { Screen } from "@/components/layout/Screen";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { chatForCandidate, matchFeed } from "@/lib/api";
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
  const [busy, setBusy] = useState(false);
  const [matched, setMatched] = useState<{ photo: string; name: string } | null>(null);

  if (loading) return <Screen><TopNav backHref={`/watch/${id}`} /><Skeleton className="mt-4 h-[340px] rounded-2xl" /></Screen>;
  if (error || !data) return <Screen><TopNav backHref="/watch" />
    <p className="py-10 text-center text-sm text-ink-2">{error ? "Could not load the profile." : "Profile not found."}</p>
    {error && <button onClick={reload} className="block w-full text-center font-semibold text-accent">Retry</button>}
  </Screen>;

  const profile = data.profiles;
  const meta = FEED_RESULT_META[data.result];
  const chat = decision === "yes" ? chatForCandidate(id) : null;
  const pass = () => {
    setStore((s) => ({ decisions: { ...s.decisions, [id]: "no" } }));
    toast("Okay, passing");
    router.push("/watch");
  };
  const match = async () => {
    if (busy) return;
    setBusy(true);
    const res = await matchFeed(data);
    if (res.matched && res.chatId) {
      setMatched({ photo: profile.photo_url ?? "", name: profile.name });
      setTimeout(() => router.replace(`/match/${res.chatId}`), 1500);
      return;
    }
    setBusy(false);
    toast(`Match sent. I'll tell you when ${profile.name} answers`);
  };

  return <Screen className="pb-[172px]">
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
    {/* Pass / Match stay on screen while the profile card scrolls underneath */}
    <div className="app-fixed pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center">
    <div className="safe-bottom pointer-events-auto flex w-full min-[480px]:max-w-[390px] flex-col items-center gap-3 bg-gradient-to-t from-bg via-bg/95 to-bg/0 px-5 pt-8">
      {decision === "yes" && chat ? (
        <Button full size="lg" icon={<ArrowRight className="size-5" />} onClick={() => router.push(`/match/${chat.id}`)}>
          Open chat with {profile.name}
        </Button>
      ) : decision === "yes" ? (
        <Chip tone="accent" icon={<Heart className="size-3" fill="currentColor" />}>
          Match · waiting for {profile.name}
        </Chip>
      ) : decision === "no" ? (
        <>
          <Chip>You passed on {profile.name}</Chip>
          <Button full size="lg" icon={<Heart className="size-5" fill="currentColor" />} loading={busy} onClick={match}>
            Changed my mind—Match with {profile.name}
          </Button>
        </>
      ) : (
        <>
          <div className="flex w-full gap-3">
            <Button variant="secondary" size="lg" full className="text-ink-2" icon={<X className="size-5" />} disabled={busy} onClick={pass}>
              Pass
            </Button>
            <Button size="lg" full icon={<Heart className="size-5" fill="currentColor" />} loading={busy} onClick={match}>
              Match
            </Button>
          </div>
          <p className="text-center text-[12px] text-ink-3">
            A chat opens the moment you both say yes. {profile.name} is never told about a Pass.
          </p>
        </>
      )}
    </div>
    </div>
    {matched && <MatchOverlay photo={matched.photo} name={matched.name} />}
  </Screen>;
}
