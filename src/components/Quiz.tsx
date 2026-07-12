"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, RotateCcw, X } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { PictoVisual } from "@/components/ui/PictoVisual";
import { EmojiCard } from "@/components/ui/EmojiCard";
import { EmptyState } from "@/components/EmptyState";
import { useSettings } from "@/lib/settings-context";
import { shuffle, playBeep, playCelebration } from "@/lib/client-helpers";
import { QUIZ_DIFFICULTY_POINTS } from "@/lib/constants";
import { Confetti } from "@/components/Confetti";
import type { WordRecord } from "@/lib/types";

const CELEBRATE_THRESHOLD = 0.7;

export function Quiz({
  words,
  color,
  onAnswer,
  onSessionComplete,
}: {
  words: WordRecord[];
  color: string;
  onAnswer?: (word: WordRecord, correct: boolean, points?: number) => void;
  onSessionComplete?: (entry: { type: "quiz"; correct: number; total: number }) => void;
}) {
  const { errorlessMode, soundEnabled } = useSettings();
  const [order] = useState(() => shuffle(words));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);

  const w = order[idx];
  const options = useMemo(() => {
    if (!w) return [];
    const others = shuffle(words.filter((x) => x.id !== w.id)).slice(0, 2).map((x) => x.meaning);
    return shuffle([w.meaning, ...others]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (words.length < 3) return <EmptyState text="Need at least 3 words in this selection to unlock the quiz." />;
  if (done) {
    return (
      <div className="text-center max-w-sm mx-auto">
        <Confetti trigger={celebrateKey} />
        <EmojiCard emoji="🏆" />
        <h2 className="text-2xl font-extrabold mt-2">Score: {score}/{order.length}</h2>
        <Btn color={color} className="mt-4" onClick={() => { setIdx(0); setScore(0); setDone(false); setSelected(null); }}>
          <RotateCcw size={16} /> Try again
        </Btn>
      </div>
    );
  }

  const pick = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const correct = opt === w.meaning;
    if (correct) setScore((s) => s + 1);
    playBeep(correct ? "correct" : "wrong", soundEnabled);
    const effectiveCorrect = errorlessMode ? true : correct;
    onAnswer?.(w, effectiveCorrect, effectiveCorrect ? QUIZ_DIFFICULTY_POINTS[w.difficulty] : 0);
  };

  const finishIfDone = () => {
    setSelected(null);
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
      <p className="text-sm font-bold text-slate-400 mb-2">Question {idx + 1} / {order.length}</p>
      <div className="rounded-3xl p-6 shadow-sm border" style={{ backgroundColor: `${color}0d`, borderColor: `${color}33` }}>
        <div className="flex items-center gap-3">
          <PictoVisual pictogramId={w.pictogramId} emoji={w.emoji} box="w-16 h-16" emojiSize="text-4xl" />
          <h2 className="text-2xl font-extrabold text-slate-800">What does &quot;{w.word}&quot; mean?</h2>
        </div>
        <div className="mt-5 space-y-2.5">
          {options.map((opt) => {
            const isCorrect = opt === w.meaning;
            const isPicked = opt === selected;
            let style = "border-2 border-slate-200 bg-white";
            if (selected) {
              if (isCorrect) style = "border-2 border-green-400 bg-green-50";
              else if (isPicked && !errorlessMode) style = "border-2 border-red-300 bg-red-50";
            }
            return (
              <button key={opt} onClick={() => pick(opt)} className={`w-full text-left px-4 py-3 rounded-2xl font-semibold text-slate-700 flex items-center justify-between min-h-[40px] ${style}`}>
                {opt}
                {selected && isCorrect && <Check className="text-green-500" size={18} />}
                {selected && isPicked && !isCorrect && !errorlessMode && <X className="text-red-400" size={18} />}
              </button>
            );
          })}
        </div>
        {selected && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">Correct meaning: <span className="font-bold text-slate-700">{w.meaning}</span></p>
            <Btn color={color} onClick={finishIfDone}>{idx + 1 >= order.length ? "Finish" : "Next"} <ChevronRight size={16} /></Btn>
          </div>
        )}
      </div>
    </div>
  );
}
