"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, RotateCcw, X } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { EmojiCard } from "@/components/ui/EmojiCard";
import { EmptyState } from "@/components/EmptyState";
import { useSettings } from "@/lib/settings-context";
import { shuffle, playBeep, playCelebration } from "@/lib/client-helpers";
import { Confetti } from "@/components/Confetti";
import type { WordRecord } from "@/lib/types";

const CELEBRATE_THRESHOLD = 0.7;

function blankSentence(w: WordRecord) {
  const re = new RegExp(`\\b${w.word}\\b`, "i");
  if (w.sentenceTip && re.test(w.sentenceTip)) return w.sentenceTip.replace(re, "_____");
  const templates: Record<string, string> = {
    noun: `I noticed a _____ nearby.`,
    verb: `They decided to _____ right away.`,
    adjective: `The _____ view amazed everyone.`,
    adverb: `She spoke _____ during the meeting.`,
  };
  return templates[w.pos || ""] || `The word "_____" fits perfectly here.`;
}

export function FillBlank({
  words,
  color,
  onSessionComplete,
}: {
  words: WordRecord[];
  color: string;
  onSessionComplete?: (entry: { type: "blank"; correct: number; total: number }) => void;
}) {
  const { errorlessMode, soundEnabled } = useSettings();
  const [order] = useState(() => shuffle(words));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);

  const w = order[idx];
  const sentence = w ? blankSentence(w) : "";
  const options = useMemo(() => {
    if (!w) return [];
    return shuffle([w.word, ...shuffle(words.filter((x) => x.id !== w.id)).slice(0, 2).map((x) => x.word)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (words.length < 3) return <EmptyState text="Add at least 3 words to this list to unlock fill-in-the-blanks." />;
  if (done) {
    return (
      <div className="text-center max-w-sm mx-auto">
        <Confetti trigger={celebrateKey} />
        <EmojiCard emoji="📝" />
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
    const correct = opt === w.word;
    if (correct) setScore((s) => s + 1);
    playBeep(correct ? "correct" : "wrong", soundEnabled);
  };
  const next = () => {
    setSelected(null);
    if (idx + 1 >= order.length) {
      setDone(true);
      const total = order.length;
      if (total > 0 && score / total >= CELEBRATE_THRESHOLD) {
        setCelebrateKey((k) => k + 1);
        playCelebration(soundEnabled);
      }
      onSessionComplete?.({ type: "blank", correct: score, total });
    } else {
      setIdx((i) => i + 1);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <p className="text-sm font-bold text-slate-400 mb-2">Question {idx + 1} / {order.length}</p>
      <div className="rounded-3xl p-6 shadow-sm border" style={{ backgroundColor: `${color}0d`, borderColor: `${color}33` }}>
        <p className="text-lg font-bold text-slate-800 leading-relaxed">{sentence}</p>
        <div className="mt-5 grid grid-cols-1 gap-2.5">
          {options.map((opt) => {
            const isCorrect = opt === w.word;
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
            <p className="text-sm text-slate-500">Answer: <span className="font-bold text-slate-700">{w.word}</span></p>
            <Btn color={color} onClick={next}>{idx + 1 >= order.length ? "Finish" : "Next"} <ChevronRight size={16} /></Btn>
          </div>
        )}
      </div>
    </div>
  );
}
