"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { QuizSetup } from "@/components/QuizSetup";
import { Quiz } from "@/components/Quiz";
import { FirstThenGate } from "@/components/FirstThenGate";
import type { SectionTree, WordRecord } from "@/lib/types";
import type { TreeSelection } from "@/components/LibraryPicker";

export function QuizFlow({
  tree,
  selection,
  color,
  onAnswer,
  onSessionComplete,
}: {
  tree: SectionTree;
  selection: TreeSelection;
  color: string;
  onAnswer: (word: WordRecord, correct: boolean, points?: number) => void;
  onSessionComplete: (entry: { type: "quiz"; correct: number; total: number }) => void;
}) {
  const [pool, setPool] = useState<WordRecord[] | null>(null);

  if (!pool) return <QuizSetup tree={tree} selection={selection} color={color} onStart={setPool} />;
  return (
    <FirstThenGate firstLabel="A short quiz on your chosen words" thenLabel="See your score at the end" color={color}>
      <button onClick={() => setPool(null)} className="text-xs font-bold flex items-center gap-1 mb-3 mx-auto min-h-[40px]" style={{ color }}>
        <ArrowLeft size={13} /> Change quiz settings
      </button>
      <Quiz words={pool} color={color} onAnswer={onAnswer} onSessionComplete={onSessionComplete} />
    </FirstThenGate>
  );
}
