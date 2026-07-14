"use client";

import { useState } from "react";
import { ArrowLeft, PencilLine } from "lucide-react";
import { ActivitySetup } from "@/components/ActivitySetup";
import { FillBlank } from "@/components/FillBlank";
import { FirstThenGate } from "@/components/FirstThenGate";
import type { SectionTree, WordRecord } from "@/lib/types";
import type { TreeSelection } from "@/components/LibraryPicker";

export function FillBlankFlow({
  tree,
  selection,
  color,
  onSessionComplete,
}: {
  tree: SectionTree;
  selection: TreeSelection;
  color: string;
  onSessionComplete: (entry: { type: "blank"; correct: number; total: number }) => void;
}) {
  const [pool, setPool] = useState<WordRecord[] | null>(null);

  if (!pool) {
    return (
      <ActivitySetup
        tree={tree}
        selection={selection}
        color={color}
        title="Fill blanks setup"
        actionLabel="Start fill blanks"
        actionIcon={PencilLine}
        onStart={setPool}
      />
    );
  }
  return (
    <FirstThenGate firstLabel="Fill in the missing word" thenLabel="See how many you get right" color={color}>
      <button onClick={() => setPool(null)} className="text-xs font-bold flex items-center gap-1 mb-3 mx-auto min-h-[40px]" style={{ color }}>
        <ArrowLeft size={13} /> Change settings
      </button>
      <FillBlank words={pool} color={color} onSessionComplete={onSessionComplete} />
    </FirstThenGate>
  );
}
