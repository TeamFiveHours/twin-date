import { cn } from "@/lib/utils";

export function Spinner({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block animate-spin-slow rounded-full border-2 border-current border-t-transparent",
        light ? "text-white" : "text-ink",
        className ?? "size-5",
      )}
      aria-label="loading"
    />
  );
}
