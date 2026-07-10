"use client";

import { useState } from "react";
import { Btn } from "@/components/ui/Btn";
import { useSettings } from "@/lib/settings-context";

export function FirstThenGate({
  firstLabel,
  thenLabel,
  color,
  children,
}: {
  firstLabel: string;
  thenLabel: string;
  color: string;
  children: React.ReactNode;
}) {
  const { firstThenEnabled } = useSettings();
  const [started, setStarted] = useState(false);
  if (!firstThenEnabled || started) return <>{children}</>;
  return (
    <div className="max-w-sm mx-auto text-center bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Today&apos;s plan</p>
      <div className="space-y-3 text-left">
        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: `${color}0d` }}>
          <span className="text-xs font-extrabold px-2 py-1 rounded-full text-white" style={{ backgroundColor: color }}>FIRST</span>
          <span className="text-sm font-semibold text-slate-700">{firstLabel}</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
          <span className="text-xs font-extrabold px-2 py-1 rounded-full bg-slate-300 text-white">THEN</span>
          <span className="text-sm font-semibold text-slate-700">{thenLabel}</span>
        </div>
      </div>
      <Btn color={color} className="mt-5" onClick={() => setStarted(true)}>Start</Btn>
    </div>
  );
}
