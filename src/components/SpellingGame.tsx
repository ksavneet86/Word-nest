"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw, Volume2 } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { EmojiCard } from "@/components/ui/EmojiCard";
import { EmptyState } from "@/components/EmptyState";
import { useSettings } from "@/lib/settings-context";
import { shuffle, speak, playBeep, playCelebration } from "@/lib/client-helpers";
import { Confetti } from "@/components/Confetti";
import type { WordRecord } from "@/lib/types";

const CELEBRATE_THRESHOLD = 0.7;

export type SpellingTier = "easy" | "medium" | "hard" | "extreme";

export const SPELLING_TIER_POINTS: Record<SpellingTier, number> = {
  easy: 2,
  medium: 4,
  hard: 6,
  extreme: 10,
};

const DECOY_COUNT: Record<SpellingTier, number> = { easy: 0, medium: 0, hard: 3, extreme: 10 };
const DECOY_POOL = "abcdefghijklmnopqrstuvwxyz".split("");

interface Tile {
  id: string;
  text: string;
}

function buildTiles(word: string, tier: SpellingTier): Tile[] {
  const letters = word.toLowerCase().split("");
  const decoyCount = DECOY_COUNT[tier];
  const decoys = Array.from({ length: decoyCount }, () => DECOY_POOL[Math.floor(Math.random() * DECOY_POOL.length)]);
  return shuffle([...letters, ...decoys].map((ch, i) => ({ id: `${i}-${ch}`, text: ch })));
}

export function SpellingGame({
  words,
  tier,
  color,
  onAnswer,
  onSessionComplete,
}: {
  words: WordRecord[];
  tier: SpellingTier;
  color: string;
  onAnswer?: (word: WordRecord, correct: boolean, points: number) => void;
  onSessionComplete?: (entry: { type: "quiz"; correct: number; total: number }) => void;
}) {
  const { errorlessMode, soundEnabled, speechRate } = useSettings();
  const [order] = useState(() => shuffle(words));
  const [idx, setIdx] = useState(0);
  const [placed, setPlaced] = useState<Tile[]>([]);
  const [checked, setChecked] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [celebrateKey, setCelebrateKey] = useState(0);

  const w = order[idx];
  const tiles = useMemo(
    () => (w ? buildTiles(w.word, tier) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx]
  );
  const available = tiles.filter((t) => !placed.some((p) => p.id === t.id));
  const wordLength = w ? w.word.length : 0;

  if (words.length < 1) return <EmptyState text="Add some words to this list to unlock the spelling game." />;
  if (done) {
    return (
      <div className="text-center max-w-sm mx-auto">
        <Confetti trigger={celebrateKey} />
        <EmojiCard emoji="🐝" />
        <h2 className="text-2xl font-extrabold mt-2">Score: {score}/{order.length}</h2>
        <Btn color={color} className="mt-4" onClick={() => { setIdx(0); setScore(0); setDone(false); setPlaced([]); setChecked(null); }}>
          <RotateCcw size={16} /> Try again
        </Btn>
      </div>
    );
  }

  const place = (tile: Tile) => { if (checked || placed.length >= wordLength) return; setPlaced((p) => [...p, tile]); };
  const remove = (tile: Tile) => { if (checked) return; setPlaced((p) => p.filter((x) => x.id !== tile.id)); };

  const check = () => {
    const built = placed.map((p) => p.text).join("");
    const correct = built.toLowerCase() === w.word.toLowerCase();
    setChecked(correct || errorlessMode ? "correct" : "wrong");
    if (correct) setScore((s) => s + 1);
    playBeep(correct ? "correct" : "wrong", soundEnabled);
    onAnswer?.(w, correct, correct ? SPELLING_TIER_POINTS[tier] : 0);
  };

  const next = () => {
    setPlaced([]); setChecked(null);
    if (idx + 1 >= order.length) {
      setDone(true);
      const total = order.length;
      if (total > 0 && score / total >= CELEBRATE_THRESHOLD) {
        setCelebrateKey((k) => k + 1);
        playCelebration(soundEnabled);
      }
      onSessionComplete?.({ type: "quiz", correct: score, total });
    } else {
      setIdx((i) => i + 1);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <p className="text-sm font-bold text-slate-400 mb-2">Word {idx + 1} / {order.length}</p>
      <div className="rounded-3xl p-6 shadow-sm border" style={{ backgroundColor: `${color}0d`, borderColor: `${color}33` }}>
        <div className="flex items-center justify-center gap-3 mb-3">
          {tier === "easy" && <h2 className="text-2xl font-extrabold text-slate-800">{w.word}</h2>}
          <button onClick={() => speak(w.word, speechRate)} className="rounded-full p-2 min-w-[40px] min-h-[40px]" style={{ backgroundColor: `${color}15`, color }}>
            <Volume2 size={16} />
          </button>
        </div>
        {tier !== "easy" && <p className="text-xs text-center text-slate-400 mb-2">Listen and spell the word</p>}

        <div className="min-h-[52px] flex flex-wrap justify-center gap-2 p-3 bg-white rounded-2xl border-2 border-slate-200 mb-4">
          {placed.length === 0 && <span className="text-slate-300 text-sm">Tap the letters below in order…</span>}
          {placed.map((t) => (
            <button key={t.id} onClick={() => remove(t)} className="w-10 h-10 rounded-xl text-lg font-bold bg-slate-100 text-slate-700 uppercase">{t.text}</button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {available.map((t) => (
            <button key={t.id} onClick={() => place(t)} className="w-10 h-10 rounded-xl text-lg font-bold border-2 uppercase" style={{ borderColor: `${color}55`, color }}>{t.text}</button>
          ))}
        </div>

        {!checked ? (
          <Btn color={color} disabled={placed.length !== wordLength} onClick={check} className="w-full justify-center">
            <Check size={16} /> Check spelling
          </Btn>
        ) : (
          <div>
            <p className={`text-sm font-bold mb-2 text-center ${checked === "correct" ? "text-green-600" : "text-red-500"}`}>
              {checked === "correct" ? "Well done!" : `Correct spelling: "${w.word}"`}
            </p>
            <Btn color={color} onClick={next} className="w-full justify-center">{idx + 1 >= order.length ? "Finish" : "Next"}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
