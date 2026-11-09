import type { Mood, Who } from "@/lib/types";
import { TwinAvatar } from "./TwinAvatar";
import { cn } from "@/lib/utils";

export function TwinMini({
  who,
  mood = "neutral",
  size = 40,
  className,
}: {
  who: Who;
  mood?: Mood;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block shrink-0 overflow-hidden rounded-full bg-twin-soft", className)}
      style={{ width: size, height: size }}
    >
      <TwinAvatar who={who} mood={mood} size={size} halo={false} />
    </span>
  );
}
