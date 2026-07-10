"use client";

import { useEffect, useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Btn } from "@/components/ui/Btn";

export function ExtendedGenerator({
  learnerId,
  generatedCount,
  color,
  onGenerated,
}: {
  learnerId: string;
  generatedCount: number;
  color: string;
  onGenerated: () => Promise<void>;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch(`/api/learners/${learnerId}/extended-queue`)
      .then((r) => r.json())
      .then((data) => setRemaining(data.remaining))
      .catch(() => setRemaining(0));
  }, [learnerId]);

  if (remaining === null || remaining === 0) return null;
  const total = generatedCount + remaining;

  const run = async () => {
    setRunning(true);
    let left = remaining;
    while (left > 0) {
      try {
        const res = await fetch(`/api/learners/${learnerId}/extended-queue/generate`, { method: "POST" });
        if (!res.ok) break;
        const data = await res.json();
        left = data.remaining;
        setRemaining(left);
        await onGenerated();
      } catch {
        break;
      }
    }
    setRunning(false);
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4 text-center">
      <p className="text-sm text-slate-500 mb-3">
        {generatedCount} of {total} words generated so far. Building the full list makes {Math.ceil(remaining / 5)} quick requests
        and can take a few minutes — it remembers where it left off if you come back later.
      </p>
      <Btn color={color} onClick={run} disabled={running}>
        {running ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />} {running ? "Generating…" : `Generate remaining ${remaining} words`}
      </Btn>
    </div>
  );
}
