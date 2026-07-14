"use client";

import { useState } from "react";
import { ArrowLeft, Layers } from "lucide-react";
import { ActivitySetup } from "@/components/ActivitySetup";
import { Flashcards } from "@/components/Flashcards";
import { FirstThenGate } from "@/components/FirstThenGate";
import type { SectionTree, WordRecord } from "@/lib/types";
import type { TreeSelection } from "@/components/LibraryPicker";

export function FlashcardsFlow({
  tree,
  selection,
  color,
  section,
}: {
  tree: SectionTree;
  selection: TreeSelection;
  color: string;
  section: string;
}) {
  const [pool, setPool] = useState<WordRecord[] | null>(null);

  if (!pool) {
    return (
      <ActivitySetup
        tree={tree}
        selection={selection}
        color={color}
        title="Flashcards setup"
        actionLabel="Start flashcards"
        actionIcon={Layers}
        minWords={1}
        onStart={setPool}
      />
    );
  }
  return (
    <FirstThenGate firstLabel={`Look through ${pool.length} picture cards`} thenLabel="Tap each card to check the meaning" color={color}>
      <button onClick={() => setPool(null)} className="text-xs font-bold flex items-center gap-1 mb-3 mx-auto min-h-[40px]" style={{ color }}>
        <ArrowLeft size={13} /> Change settings
      </button>
      <Flashcards words={pool} color={color} section={section} />
    </FirstThenGate>
  );
}
