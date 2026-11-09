/**
 * TwinDate brand mark: two overlapping speech bubbles. The filled bubble is
 * one Twin, the outlined bubble the other, and the lens where they overlap is
 * the date. Colours are the brand's own (navy / coral), not the UI tokens.
 */
export const BRAND = {
  navy: "#2B3654",
  coral: "#F08B60",
  paper: "#DED9CE",
  muted: "#6B6F7A",
  /** splash backdrop: peach → blush → soft lavender, with a coral glow behind the mark */
  splash: "linear-gradient(180deg, #FFE1CF 0%, #FBD9D4 48%, #E9E0F4 100%)",
  glow: "radial-gradient(circle at 50% 42%, rgba(240,139,96,0.45) 0%, rgba(240,139,96,0) 46%)",
};

export function LogoMark({ size = 120, className, inner = BRAND.paper }: { size?: number; className?: string; inner?: string }) {
  const h = Math.round(size * (260 / 380));
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 380 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <defs>
        <clipPath id="twindate-left-bubble">
          <circle cx="118" cy="112" r="102" />
        </clipPath>
      </defs>
      {/* left bubble (filled) with its tail */}
      <circle cx="118" cy="112" r="102" fill={BRAND.navy} />
      <path d="M44 150 L8 222 L96 198 Z" fill={BRAND.navy} />
      {/* the overlap, clipped to the left bubble */}
      <circle cx="236" cy="138" r="90" fill={BRAND.coral} clipPath="url(#twindate-left-bubble)" />
      {/* right bubble (outlined); the tail is a navy wedge with a paper wedge inside so its outline merges with the ring */}
      <circle cx="236" cy="138" r="90" stroke={BRAND.navy} strokeWidth="14" />
      <path d="M315.5 193.6 L372 240 L277 225.9 Z" fill={BRAND.navy} />
      <path d="M304 186 L356 229 L271 213 Z" fill={inner} />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{ color: BRAND.navy, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}
    >
      TwinDate
    </span>
  );
}
