import { cn } from "@/lib/utils";

/**
 * Base page container: full width on phones, 390px frame on desktop (.app-shell), safe-area top,
 * padding [8,20,24,20], extra bottom room when the tab bar is visible.
 */
export function Screen({
  children,
  tabs,
  className,
  noPad,
  style,
}: {
  children?: React.ReactNode;
  tabs?: boolean;
  className?: string;
  noPad?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <main
      style={style}
      className={cn(
        "safe-top flex min-h-dvh flex-col bg-bg",
        !noPad && "px-5 pt-2",
        tabs ? "pb-[88px]" : !noPad && "pb-6",
        className,
      )}
    >
      {children}
    </main>
  );
}
