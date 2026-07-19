"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { collectWords } from "@/lib/collect-words";
import type { SectionTree, WordRecord } from "@/lib/types";
import type { TreeSelection } from "@/components/LibraryPicker";

const MAX_RESULTS = 20;

export function WordSearch({
  tree,
  color,
  onJumpTo,
}: {
  tree: SectionTree;
  color: string;
  onJumpTo: (target: TreeSelection, wordId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const allWords = useMemo(() => collectWords(tree, { library: "", folder: "", list: "" }, "library"), [tree]);

  const q = query.trim().toLowerCase();
  const results: WordRecord[] = q
    ? allWords.filter((w) => w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q)).slice(0, MAX_RESULTS)
    : [];

  const jump = (w: WordRecord) => {
    onJumpTo({ library: w._loc.library, folder: w._loc.folder, list: w._loc.list }, w.id);
    setQuery("");
  };

  return (
    <div className="relative mb-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a word…"
          className="w-full pl-9 pr-9 py-2.5 rounded-2xl text-sm border-2 border-slate-200"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {q && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-2xl border border-slate-100 shadow-lg max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No words match &quot;{query}&quot;.</p>
          ) : (
            results.map((w) => (
              <button
                key={w.id}
                onClick={() => jump(w)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 min-h-[48px]"
              >
                <span className="text-xl shrink-0">{w.emoji}</span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-700 truncate">{w.word}</p>
                  <p className="text-xs text-slate-400 truncate">{w._loc.library} / {w._loc.folder} / {w._loc.list}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
