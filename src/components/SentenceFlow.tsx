"use client";

import { useState } from "react";
import { ArrowLeft, Puzzle } from "lucide-react";
import { ActivitySetup } from "@/components/ActivitySetup";
import { SentenceBuilder } from "@/components/SentenceBuilder";
import { FirstThenGate } from "@/components/FirstThenGate";
import type { SectionTree, WordRecord } from "@/lib/types";
import type { TreeSelection } from "@/components/LibraryPicker";

export function SentenceFlow({
  tree,
  selection,
  color,
  onSessionComplete,
}: {
  tree: SectionTree;
  selection: TreeSelection;
  color: string;
  onSessionComplete: (entry: { type: "sentence"; correct: number; total: number }) => void;
}) {
  const [pool, setPool] = useState<WordRecord[] | null>(null);

  if (!pool) {
    return (
      <ActivitySetup
        tree={tree}
        selection={selection}
        color={color}
        title="Sentences setup"
        actionLabel="Start sentences"
        actionIcon={Puzzle}
        onStart={setPool}
      />
    );
  }
  return (
    <FirstThenGate firstLabel="Build sentences from word tiles" thenLabel="Check each one when you're ready" color={color}>
      <button onClick={() => setPool(null)} className="text-xs font-bold flex items-center gap-1 mb-3 mx-auto min-h-[40px]" style={{ color }}>
        <ArrowLeft size={13} /> Change settings
      </button>
      <SentenceBuilder words={pool} color={color} onSessionComplete={onSessionComplete} />
    </FirstThenGate>
  );
}
