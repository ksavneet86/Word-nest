"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ActivitySetup } from "@/components/ActivitySetup";
import { SpellingGameSetup } from "@/components/SpellingGameSetup";
import type { SectionTree, WordRecord } from "@/lib/types";
import type { TreeSelection } from "@/components/LibraryPicker";

export function SpellFlow({
  tree,
  selection,
  color,
  onAnswer,
  onSessionComplete,
}: {
  tree: SectionTree;
  selection: TreeSelection;
  color: string;
  onAnswer: (word: WordRecord, correct: boolean, points: number) => void;
  onSessionComplete: (entry: { type: "quiz"; correct: number; total: number }) => void;
}) {
  const [pool, setPool] = useState<WordRecord[] | null>(null);

  if (!pool) {
    return (
      <ActivitySetup
        tree={tree}
        selection={selection}
        color={color}
        title="Spell it! setup"
        actionLabel="Choose difficulty"
        actionIcon={Sparkles}
        onStart={setPool}
      />
    );
  }
  return (
    <SpellingGameSetup
      words={pool}
      color={color}
      onAnswer={onAnswer}
      onSessionComplete={onSessionComplete}
      onBack={() => setPool(null)}
    />
  );
}
