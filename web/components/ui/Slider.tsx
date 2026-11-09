"use client";

export function Slider({
  value,
  onChange,
  left,
  right,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
  label: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="mb-2 text-[13px] font-semibold text-ink">{label}</div>
      <div className="relative h-5">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-twin"
          style={{ width: `${pct}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-twin bg-white shadow-sm"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-3">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
