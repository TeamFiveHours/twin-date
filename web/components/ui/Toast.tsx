"use client";

import { create } from "zustand";

type ToastStore = { msg: string | null; show: (m: string) => void; clear: () => void };

const useToastStore = create<ToastStore>((set) => ({
  msg: null,
  show: (m) => set({ msg: m }),
  clear: () => set({ msg: null }),
}));

let timer: ReturnType<typeof setTimeout> | null = null;

export function toast(msg: string, ms = 2200) {
  useToastStore.getState().show(msg);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => useToastStore.getState().clear(), ms);
}

export function Toaster() {
  const msg = useToastStore((s) => s.msg);
  if (!msg) return null;
  return (
    <div className="app-fixed pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center">
      <div className="animate-fade-in rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
        {msg}
      </div>
    </div>
  );
}
