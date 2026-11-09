import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  tone = "surface",
  padding = true,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: "surface" | "twin" | "accent" | "good" | "warn" | "surface-2";
  padding?: boolean;
}) {
  const tones = {
    surface: "bg-surface border border-line",
    twin: "bg-twin-soft",
    accent: "bg-accent-soft",
    good: "bg-good-soft",
    warn: "bg-warn-soft",
    "surface-2": "bg-surface-2",
  };
  return (
    <div className={cn("rounded-2xl", tones[tone], padding && "p-4", className)} {...rest}>
      {children}
    </div>
  );
}
