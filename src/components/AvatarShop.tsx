"use client";

import { useState } from "react";
import { Loader2, Lock, Star, X } from "lucide-react";
import { AVATAR_SHOP } from "@/lib/constants";

const TIER_COLORS: Record<string, string> = {
  common: "#4ECDC4",
  rare: "#7C6FF0",
  epic: "#F0A63A",
};

export function AvatarShop({
  learnerId,
  points,
  unlockedAvatars,
  currentAvatar,
  onClose,
  onChange,
}: {
  learnerId: string;
  points: number;
  unlockedAvatars: string[];
  currentAvatar: string | null;
  onClose: () => void;
  onChange: (points: number, unlockedAvatars: string[], avatarEmoji: string) => void;
}) {
  const [busyEmoji, setBusyEmoji] = useState<string | null>(null);
  const [error, setError] = useState("");

  const unlock = async (emoji: string) => {
    setBusyEmoji(emoji);
    setError("");
    try {
      const res = await fetch(`/api/learners/${learnerId}/unlock-avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't unlock this avatar");
      await applyAvatar(emoji, data.points, data.unlockedAvatars);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't unlock this avatar");
    }
    setBusyEmoji(null);
  };

  const applyAvatar = async (emoji: string, newPoints?: number, newUnlocked?: string[]) => {
    await fetch(`/api/learners/${learnerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarEmoji: emoji }),
    });
    onChange(newPoints ?? points, newUnlocked ?? unlockedAvatars, emoji);
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2"><Star size={18} className="text-amber-400" /> Avatar Shop</h3>
          <button onClick={onClose} className="min-w-[40px] min-h-[40px] flex items-center justify-center"><X size={20} className="text-slate-400" /></button>
        </div>
        <p className="text-sm font-bold text-slate-600">⭐ {points} points</p>

        <div className="grid grid-cols-4 gap-3">
          {AVATAR_SHOP.map((item) => {
            const unlocked = unlockedAvatars.includes(item.emoji);
            const isCurrent = currentAvatar === item.emoji;
            const busy = busyEmoji === item.emoji;
            return (
              <button
                key={item.emoji}
                disabled={busy || (!unlocked && points < item.cost)}
                onClick={() => (unlocked ? applyAvatar(item.emoji) : unlock(item.emoji))}
                className="relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 disabled:opacity-40 min-h-[64px]"
                style={{ borderColor: isCurrent ? TIER_COLORS[item.tier] : "#E5E7EB", backgroundColor: isCurrent ? `${TIER_COLORS[item.tier]}15` : "white" }}
              >
                {busy ? (
                  <Loader2 className="animate-spin text-slate-400" size={20} />
                ) : (
                  <>
                    <span className="text-2xl">{item.emoji}</span>
                    {!unlocked && (
                      <span className="text-[10px] font-bold flex items-center gap-0.5 text-slate-400"><Lock size={9} /> {item.cost}</span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <p className="text-xs text-slate-400">Earn points by playing spelling games and practicing every day. Tap an unlocked avatar to use it.</p>
      </div>
    </div>
  );
}
