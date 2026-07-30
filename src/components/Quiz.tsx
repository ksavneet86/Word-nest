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
  section,
  onAnswer,
  onSessionComplete,
}: {
  words: WordRecord[];
  color: string;
  section?: string;
  onAnswer?: (word: WordRecord, correct: boolean, points?: number) => void;
  onSessionComplete?: (entry: { type: "quiz"; correct: number; total: number }) => void;
}) {
  const { errorlessMode, soundEnabled, showImages } = useSettings();
  const isSynAnt = section === "synAnt";

  // In Synonyms & Antonyms, only words that actually have a synonym or antonym saved can be tested.
  const pool = useMemo(
    () => (isSynAnt ? words.filter((w) => (w.synonyms?.length || 0) > 0 || (w.antonyms?.length || 0) > 0) : words),
    [words, isSynAnt]
  );

  const [order] = useState(() => shuffle(pool));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);

  const w = order[idx];

  const question = useMemo(() => {
    if (!w) return null;
    if (!isSynAnt) {
      const others = shuffle(words.filter((x) => x.id !== w.id)).slice(0, 2).map((x) => x.meaning);
      return {
        prompt: `What does "${w.word}" mean?`,
        correctAnswer: w.meaning,
        correctLabel: "Correct meaning",
        options: shuffle([w.meaning, ...others]),
      };
    }
    const hasSyn = (w.synonyms?.length || 0) > 0;
    const hasAnt = (w.antonyms?.length || 0) > 0;
    const useSynonym = hasSyn && (!hasAnt || shuffle([true, false])[0]);
    const correctList = useSynonym ? w.synonyms : w.antonyms;
    const correctAnswer = shuffle(correctList)[0];
    const decoys = shuffle(words.filter((x) => x.id !== w.id && x.word.toLowerCase() !== correctAnswer.toLowerCase()))
      .slice(0, 2)
      .map((x) => x.word);
    return {
      prompt: useSynonym ? `Which word means the same as "${w.word}"?` : `Which word means the opposite of "${w.word}"?`,
      correctAnswer,
      correctLabel: useSynonym ? "Correct synonym" : "Correct antonym",
      options: shuffle([correctAnswer, ...decoys]),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (pool.length < 3) {
    return (
      <EmptyState
        text={
          isSynAnt
            ? "Need at least 3 words with synonyms or antonyms saved to unlock this quiz."
            : "Need at least 3 words in this selection to unlock the quiz."
        }
      />
    );
  }
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
  if (!question) return null;

  const pick = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const correct = opt === question.correctAnswer;
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
          {showImages && <PictoVisual pictogramId={w.pictogramId} emoji={w.emoji} box="w-16 h-16" emojiSize="text-4xl" />}
          <h2 className="text-2xl font-extrabold text-slate-800">{question.prompt}</h2>
        </div>
        <div className="mt-5 space-y-2.5">
          {question.options.map((opt) => {
            const isCorrect = opt === question.correctAnswer;
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
            <p className="text-sm text-slate-500">{question.correctLabel}: <span className="font-bold text-slate-700">{question.correctAnswer}</span></p>
            <Btn color={color} onClick={finishIfDone}>{idx + 1 >= order.length ? "Finish" : "Next"} <ChevronRight size={16} /></Btn>
          </div>
        )}
      </div>
    </div>
  );
}
