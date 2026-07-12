"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { FirstThenGate } from "@/components/FirstThenGate";
import { SpellingGame, SPELLING_TIER_POINTS, type SpellingTier } from "@/components/SpellingGame";
import type { WordRecord } from "@/lib/types";

const TIERS: Array<{ key: SpellingTier; label: string; desc: string }> = [
  { key: "easy", label: "Easy", desc: "Word shown, spell it with its own letters" },
  { key: "medium", label: "Medium", desc: "Word hidden, just its own letters" },
  { key: "hard", label: "Hard", desc: "Word hidden, its letters plus a few extras" },
  { key: "extreme", label: "Extreme", desc: "Word hidden, its letters lost among many extras" },
];

export function SpellingGameSetup({
  words,
  color,
  onAnswer,
  onSessionComplete,
}: {
  words: WordRecord[];
  color: string;
  onAnswer: (word: WordRecord, correct: boolean, points: number) => void;
  onSessionComplete: (entry: { type: "quiz"; correct: number; total: number }) => void;
}) {
  const [tier, setTier] = useState<SpellingTier | null>(null);

  if (tier) {
    return (
      <FirstThenGate firstLabel="Spell each word using the letter tiles" thenLabel="See your score at the end" color={color}>
        <button onClick={() => setTier(null)} className="text-xs font-bold mb-3 mx-auto block min-h-[40px]" style={{ color }}>
          ← Change difficulty
        </button>
        <SpellingGame words={words} tier={tier} color={color} onAnswer={onAnswer} onSessionComplete={onSessionComplete} />
      </FirstThenGate>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm max-w-md mx-auto space-y-3">
      <h3 className="font-extrabold text-slate-700 flex items-center gap-2"><Sparkles size={18} style={{ color }} /> Spell it! — choose a difficulty</h3>
      {TIERS.map((t) => (
        <button
          key={t.key}
          onClick={() => setTier(t.key)}
          className="w-full text-left px-4 py-3 rounded-2xl border-2 border-slate-200 hover:border-current min-h-[40px]"
          style={{ color }}
        >
          <span className="font-bold text-slate-700">{t.label}</span>
          <span className="text-xs text-slate-400 block">{t.desc} · +{SPELLING_TIER_POINTS[t.key]} points per word</span>
        </button>
      ))}
    </div>
  );
}
