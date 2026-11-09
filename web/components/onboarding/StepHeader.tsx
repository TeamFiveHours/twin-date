import { cn } from "@/lib/utils";

/** "n / 4" step label + Gowun title + sub, as in the Pencil onboarding frames. */
export function StepHeader({
  step,
  title,
  sub,
  size = 26,
  className,
}: {
  step: string;
  title: string;
  sub?: string;
  size?: 22 | 26;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-2.5", className)}>
      <span className="text-[12px] font-semibold text-accent">{step}</span>
      <h1
        className="font-title whitespace-pre-line font-bold leading-[1.35] text-ink"
        style={{ fontSize: size }}
      >
        {title}
      </h1>
      {sub && <p className="text-[14px] leading-[1.5] text-ink-2">{sub}</p>}
    </header>
  );
}
