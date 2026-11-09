"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, Heart, Smile } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/watch", label: "Feed", Icon: Eye },
  { href: "/match", label: "Match", Icon: Heart },
  { href: "/me", label: "Me", Icon: Smile },
];

export function TabBar({ badge }: { badge?: Partial<Record<string, boolean>> }) {
  const path = usePathname();
  const twinName = useStore((s) => s.twin.name);
  return (
    <nav className="app-fixed pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div className="safe-bottom pointer-events-auto w-full min-[480px]:max-w-[390px] px-4">
        <div className="flex h-14 items-stretch gap-0 rounded-[28px] border border-line bg-[#FFFFFFB3] p-1.5 shadow-[0_6px_18px_#221C171F] backdrop-blur-md">
          {tabs.map(({ href, label, Icon }) => {
            const active = path === href || path.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] text-[10px] transition-colors",
                  active ? "bg-accent-soft font-semibold text-accent" : "font-medium text-ink-3",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {href === "/me" ? twinName : label}
                {badge?.[href] && (
                  <span className="absolute right-4 top-2 size-2 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
