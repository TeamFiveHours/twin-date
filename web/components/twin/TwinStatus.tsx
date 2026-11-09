import { cn } from "@/lib/utils";

/** Small pill like Pencil's "Twin ready" / "Twin active" badge. */
export function TwinStatus({
  label,
  tone = "twin",
  className,
}: {
  label: string;
  tone?: "twin" | "good" | "muted";
  className?: string;
}) {
  const tones = {
    twin: "bg-twin-soft text-twin",
    good: "bg-good-soft text-good",
    muted: "bg-surface-2 text-ink-2",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone === "good" ? "bg-good" : tone === "twin" ? "bg-twin" : "bg-ink-3")} />
      {label}
    </span>
  );
}
