import Image from "next/image";
import type { Mood, Who } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The user's own Twin (Momo) is a 3D render; every "me" avatar shows it. */
export const MOMO_PHOTO = "/profile/momo.png";

export type TwinAvatarProps = {
  size?: number;
  who: Who;
  mood?: Mood;
  mouthOpen?: boolean;
  halo?: boolean;
  /** interviewer variant: 'other' palette but no bun */
  bun?: boolean;
  className?: string;
};

const SKIN = "#F1C6A3";
const SKIN_SHADE = "#D9A47E";

/**
 * Inline SVG avatar following the Pencil "Twin Avatar" layer order:
 * Halo → Shirt → Neck → Hair Back → (Bun) → Ears → Head → Shade → Fringe →
 * Shine → Eyes → Brows → Nose → Mouth → Blush → decorations.
 */
export function TwinAvatar({
  size = 96,
  who,
  mood = "neutral",
  mouthOpen,
  halo = true,
  bun,
  className,
}: TwinAvatarProps) {
  const shirt = who === "me" ? "#8B7BD8" : "#E8A33D";
  const hair = who === "me" ? "#3A2A24" : "#5A3B2E";
  const showBun = bun ?? who === "other";
  const eyesClosed = mood === "resting";
  const talkingOpen = mood === "talking" ? (mouthOpen ?? true) : false;

  if (who === "me") {
    return (
      <span
        role="img"
        aria-label={`Your Twin, ${mood}`}
        className={cn("relative inline-block shrink-0 overflow-hidden rounded-full bg-twin-soft", halo && "ring-4 ring-twin-soft", className)}
        style={{ width: size, height: size }}
      >
        <Image src={MOMO_PHOTO} alt="" fill sizes={`${size}px`} className="object-cover" style={{ objectPosition: "50% 38%" }} />
      </span>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={className}
      role="img"
      aria-label={`Their Twin, ${mood}`}
    >
      {halo && <circle cx="48" cy="48" r="42" fill="#E9E4F7" />}
      {/* Shirt */}
      <path d="M22 92 V 92 A 20 20 0 0 1 42 72 H 54 A 20 20 0 0 1 74 92 Z" fill={shirt} />
      {/* Neck */}
      <rect x="40" y="62" width="16" height="14" rx="4" fill={SKIN_SHADE} />
      {/* Hair back */}
      <ellipse cx="48" cy="33" rx="34" ry="25" fill={hair} />
      {showBun && <circle cx="48" cy="13" r="9" fill={hair} />}
      {/* Ears */}
      <ellipse cx="19" cy="43" rx="5" ry="7" fill={SKIN} />
      <ellipse cx="77" cy="43" rx="5" ry="7" fill={SKIN} />
      {/* Head */}
      <ellipse cx="48" cy="45" rx="30" ry="31" fill={SKIN} />
      {/* Shade */}
      <ellipse cx="63" cy="49" rx="15" ry="27" fill="#D9A47E66" />
      {/* Fringe */}
        <path
          d="M18 34 C 20 16, 38 10, 48 12 C 58 10, 76 16, 78 34 C 74 26, 64 22, 48 22 C 32 22, 22 26, 18 34 Z"
          fill={hair}
        />
      {/* Shine */}
      <ellipse cx="35" cy="26" rx="7" ry="4" fill="#FFFFFF55" />
      {/* Eyes */}
      {eyesClosed ? (
        <>
          <path d="M34 47 Q 37.5 50 41 47" stroke="#221C17" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M54 47 Q 57.5 50 61 47" stroke="#221C17" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : mood === "happy" ? (
        <>
          <path d="M34 48 Q 37.5 43 41 48" stroke="#221C17" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M54 48 Q 57.5 43 61 48" stroke="#221C17" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="37.5" cy="46.5" rx="3.5" ry="4.5" fill="#221C17" />
          <ellipse cx="57.5" cy="46.5" rx="3.5" ry="4.5" fill="#221C17" />
          <circle cx="39" cy="44.5" r="1.25" fill="#fff" />
          <circle cx="59" cy="44.5" r="1.25" fill="#fff" />
        </>
      )}
      {/* Brows */}
      {mood === "thinking" ? (
        <>
          <path d="M32 37 Q 38 33 44 36" stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M52 35 Q 58 34 64 37" stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : mood === "awkward" ? (
        <>
          <path d="M32 35 Q 38 38 44 36" stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M52 36 Q 58 38 64 35" stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M32 36 Q 38 33 44 36" stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M52 36 Q 58 33 64 36" stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
      {/* Nose */}
      <ellipse cx="48" cy="52" rx="3" ry="2" fill="#D9A47E99" />
      {/* Mouth */}
      {talkingOpen ? (
        <ellipse cx="48" cy="61" rx="5" ry="4" fill="#B5543F" />
      ) : mood === "happy" ? (
        <path d="M40 59 Q 48 68 56 59 Z" fill="#B5543F" />
      ) : mood === "thinking" ? (
        <path d="M42 62 Q 48 59 54 62" stroke="#B5543F" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : mood === "awkward" ? (
        <path d="M40 61 Q 44 58 48 61 Q 52 64 56 61" stroke="#B5543F" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : mood === "resting" ? (
        <path d="M43 61 Q 48 63 53 61" stroke="#B5543F" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M40 59 Q 48 66 56 59" stroke="#B5543F" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
      {/* Blush */}
      <ellipse cx="31.5" cy="54.5" rx="4.5" ry="2.5" fill="#E8684A66" />
      <ellipse cx="64.5" cy="54.5" rx="4.5" ry="2.5" fill="#E8684A66" />
      {/* Decorations */}
      {mood === "happy" && (
        <g fill="#E8A33D">
          <path d="M82 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
          <path d="M12 24 l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4 z" />
        </g>
      )}
      {mood === "awkward" && (
        <path d="M80 36 q 4 6 0 9 q -4 -3 0 -9 z" fill="#7FB8E8" />
      )}
      {mood === "resting" && (
        <g fill="#8B7BD8" fontFamily="sans-serif" fontWeight="700">
          <text x="76" y="26" fontSize="9">z</text>
          <text x="82" y="18" fontSize="12">z</text>
        </g>
      )}
      {mood === "thinking" && (
        <g fill="#8B7BD8">
          <circle cx="78" cy="30" r="2" />
          <circle cx="84" cy="24" r="2.8" />
          <circle cx="90" cy="16" r="3.6" />
        </g>
      )}
      {mood === "talking" && (
        <g stroke="#8B7BD8" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M84 40 q 3 5 0 10" />
          <path d="M89 36 q 5 9 0 18" />
        </g>
      )}
    </svg>
  );
}
