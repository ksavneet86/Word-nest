"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { EmojiCard } from "@/components/ui/EmojiCard";
import { EmptyState } from "@/components/EmptyState";
import { shuffle } from "@/lib/client-helpers";
import type { WordRecord } from "@/lib/types";

interface Tile {
  id: string;
  text: string;
}

export function SentenceBuilder({
  words,
  color,
  onSessionComplete,
}: {
  words: WordRecord[];
  color: string;
  onSessionComplete?: (entry: { type: "sentence"; correct: number; total: number }) => void;
}) {
  const pool = useMemo(
    () => words.filter((w) => w.sentenceTip && new RegExp(`\\b${w.word}\\b`, "i").test(w.sentenceTip)),
    [words]
  );
  const [order] = useState(() => shuffle(pool));
  const [idx, setIdx] = useState(0);
  const [placed, setPlaced] = useState<Tile[]>([]);
  const [checked, setChecked] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);

  const w = order[idx];
  const correctTokens = useMemo(
    () => (w ? w.sentenceTip!.replace(/[."]/g, "").split(/\s+/) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx]
  );
  const tiles = useMemo(
    () => shuffle(correctTokens.map((t, i) => ({ id: i + "-" + t, text: t }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx]
  );
  const available = tiles.filter((t) => !placed.some((p) => p.id === t.id));

  if (pool.length < 1) return <EmptyState text="Add words with example sentences to unlock sentence building." />;
  if (done) {
    return (
      <div className="text-center max-w-sm mx-auto">
        <EmojiCard emoji="🧩" />
        <h2 className="text-2xl font-extrabold mt-2">Score: {score}/{order.length}</h2>
        <Btn color={color} className="mt-4" onClick={() => { setIdx(0); setScore(0); setDone(false); setPlaced([]); setChecked(null); }}>
          <RotateCcw size={16} /> Try again
        </Btn>
      </div>
    );
  }

  const place = (tile: Tile) => { if (checked) return; setPlaced((p) => [...p, tile]); };
  const remove = (tile: Tile) => { if (checked) return; setPlaced((p) => p.filter((x) => x.id !== tile.id)); };
  const check = () => {
    const built = placed.map((p) => p.text.toLowerCase()).join(" ");
    const correct = correctTokens.map((t) => t.toLowerCase()).join(" ");
    const ok = built === correct;
    setChecked(ok ? "correct" : "wrong");
    if (ok) setScore((s) => s + 1);
  };
  const next = () => {
    setPlaced([]); setChecked(null);
    if (idx + 1 >= order.length) {
      setDone(true);
      onSessionComplete?.({ type: "sentence", correct: score, total: order.length });
    } else {
      setIdx((i) => i + 1);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <p className="text-sm font-bold text-slate-400 mb-2">Sentence {idx + 1} / {order.length}</p>
      <div className="rounded-3xl p-6 shadow-sm border" style={{ backgroundColor: `${color}0d`, borderColor: `${color}33` }}>
        <p className="text-xs font-bold text-slate-400 mb-2">Build a sentence using &quot;{w.word}&quot;</p>
        <div className="min-h-[52px] flex flex-wrap gap-2 p-3 bg-white rounded-2xl border-2 border-slate-200 mb-4">
          {placed.length === 0 && <span className="text-slate-300 text-sm">Tap the words below in order…</span>}
          {placed.map((t) => (
            <button key={t.id} onClick={() => remove(t)} className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 min-h-[40px]">{t.text}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {available.map((t) => (
            <button key={t.id} onClick={() => place(t)} className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 min-h-[40px]" style={{ borderColor: `${color}55`, color }}>{t.text}</button>
          ))}
        </div>
        {!checked ? (
          <Btn color={color} disabled={placed.length !== tiles.length} onClick={check}><Check size={16} /> Check sentence</Btn>
        ) : (
          <div>
            <p className={`text-sm font-bold mb-2 ${checked === "correct" ? "text-green-600" : "text-red-500"}`}>
              {checked === "correct" ? "Well done!" : `Correct order: "${w.sentenceTip}"`}
            </p>
            <Btn color={color} onClick={next}>{idx + 1 >= order.length ? "Finish" : "Next"}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
