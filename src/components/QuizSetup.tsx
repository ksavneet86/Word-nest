"use client";

import { useState } from "react";
import { Brain, Settings2, TriangleAlert } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { collectWords } from "@/lib/collect-words";
import { shuffle } from "@/lib/client-helpers";
import type { SectionTree, WordRecord } from "@/lib/types";
import type { TreeSelection } from "@/components/LibraryPicker";

export function QuizSetup({
  tree,
  selection,
  color,
  onStart,
}: {
  tree: SectionTree;
  selection: TreeSelection;
  color: string;
  onStart: (words: WordRecord[]) => void;
}) {
  const [level, setLevel] = useState<"list" | "folder" | "library">("list");
  const [difficulty, setDifficulty] = useState("any");
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [onlyDue, setOnlyDue] = useState(false);
  const [count, setCount] = useState("15");
  const [now] = useState(() => Date.now());

  const scopeReady =
    level === "list" ? !!selection.list : level === "folder" ? !!(selection.library && selection.folder) : !!selection.library;
  const pool = scopeReady
    ? collectWords(tree, selection, level).filter(
        (w) =>
          (difficulty === "any" || w.difficulty === difficulty) &&
          (!onlyWrong || (w.timesWrong || 0) > 0) &&
          (!onlyDue || (w.srsDue || 0) <= now)
      )
    : [];

  const startQuiz = () => {
    const n = count === "all" ? pool.length : Math.min(parseInt(count, 10), pool.length);
    onStart(shuffle(pool).slice(0, n));
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm max-w-md mx-auto space-y-4">
      <h3 className="font-extrabold text-slate-700 flex items-center gap-2"><Settings2 size={18} style={{ color }} /> Quiz setup</h3>

      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Scope</label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {([["list", "This list"], ["folder", "Whole folder"], ["library", "Whole library"]] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setLevel(v)}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 min-h-[40px]"
              style={{ borderColor: level === v ? color : "#E5E7EB", color: level === v ? color : "#475569" }}
            >
              {l}
            </button>
          ))}
        </div>
        {!scopeReady && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><TriangleAlert size={12} /> Pick the {level} above using the library picker first.</p>}
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Difficulty</label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {([["any", "Any"], ["low", "Low"], ["moderate", "Moderate"], ["high", "High"]] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setDifficulty(v)}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 min-h-[40px]"
              style={{ borderColor: difficulty === v ? color : "#E5E7EB", color: difficulty === v ? color : "#475569" }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Number of questions</label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {([["10", "10"], ["15", "15"], ["20", "20"], ["30", "30"], ["all", "All"]] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setCount(v)}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 min-h-[40px]"
              style={{ borderColor: count === v ? color : "#E5E7EB", color: count === v ? color : "#475569" }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} />
        Only words I&apos;ve got wrong before
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <input type="checkbox" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} />
        Only words due for review (spaced repetition)
      </label>

      <p className="text-sm text-slate-500">{pool.length} word{pool.length === 1 ? "" : "s"} match — quiz will use {count === "all" ? pool.length : Math.min(parseInt(count, 10), pool.length)} of them.</p>
      <Btn color={color} disabled={pool.length < 3} onClick={startQuiz}><Brain size={16} /> Start quiz</Btn>
    </div>
  );
}
