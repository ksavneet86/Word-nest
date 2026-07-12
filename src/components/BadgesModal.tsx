"use client";

import { useEffect, useState } from "react";
import { Award, Loader2, Lock, X } from "lucide-react";
import { BADGES } from "@/lib/constants";
import type { LearnerStats } from "@/lib/types";

function metricValue(stats: LearnerStats, metric: "streak" | "mastered" | "points"): number {
  if (metric === "streak") return stats.streak.longest;
  if (metric === "mastered") return stats.totalMastered;
  return stats.points;
}

export function BadgesModal({ learnerId, onClose }: { learnerId: string; onClose: () => void }) {
  const [stats, setStats] = useState<LearnerStats | null>(null);

  useEffect(() => {
    fetch("/api/learners/stats")
      .then((r) => r.json())
      .then((data) => setStats((data.stats as LearnerStats[]).find((s) => s.learnerId === learnerId) ?? null));
  }, [learnerId]);

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2"><Award size={18} className="text-amber-400" /> Badges</h3>
          <button onClick={onClose} className="min-w-[40px] min-h-[40px] flex items-center justify-center"><X size={20} className="text-slate-400" /></button>
        </div>

        {!stats ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {BADGES.map((badge) => {
              const value = metricValue(stats, badge.metric);
              const earned = value >= badge.threshold;
              return (
                <div
                  key={badge.id}
                  className="rounded-2xl border-2 p-3 flex flex-col items-center text-center gap-1"
                  style={{ borderColor: earned ? "#F0A63A" : "#E5E7EB", backgroundColor: earned ? "#FDF0DD" : "white", opacity: earned ? 1 : 0.5 }}
                >
                  <span className="text-2xl">{earned ? badge.emoji : <Lock size={20} className="text-slate-300" />}</span>
                  <span className="text-[11px] font-bold text-slate-600 leading-tight">{badge.label}</span>
                  {!earned && <span className="text-[10px] text-slate-400">{value}/{badge.threshold}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
