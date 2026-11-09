"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function PersonPhoto({
  src,
  alt,
  size = 44,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-block shrink-0 overflow-hidden rounded-full bg-surface-2", className)}
      style={{ width: size, height: size }}
    >
      {src && <Image src={src} alt={alt} fill sizes={`${size}px`} className="object-cover" />}
    </span>
  );
}
