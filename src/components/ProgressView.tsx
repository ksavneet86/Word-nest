import { EmptyState } from "@/components/EmptyState";
import { PerformanceGraph } from "@/components/PerformanceGraph";
import { FeedbackReport } from "@/components/FeedbackReport";
import type { SectionTree, SessionEntry } from "@/lib/types";

function wordStatus(w: { timesWrong: number; srsInterval: number }): "practice" | "mastered" | "learning" {
  if ((w.timesWrong || 0) > 0) return "practice";
  if ((w.srsInterval || 0) >= 8) return "mastered";
  return "learning";
}

export function ProgressView({
  tree,
  color,
  sessionLog,
  learnerId,
  section,
}: {
  tree: SectionTree;
  color: string;
  sessionLog: SessionEntry[];
  learnerId: string;
  section: string;
}) {
  const rows: Array<{ lib: string; folder: string; listName: string; total: number; mastered: number; practice: number }> = [];

  Object.entries(tree).forEach(([lib, libNode]) => {
    Object.entries(libNode.folders).forEach(([folder, folderNode]) => {
      Object.entries(folderNode.lists).forEach(([listName, listNode]) => {
        const words = listNode.words;
        if (!words.length) return;
        const mastered = words.filter((w) => wordStatus(w) === "mastered").length;
        const practice = words.filter((w) => wordStatus(w) === "practice").length;
        rows.push({ lib, folder, listName, total: words.length, mastered, practice });
      });
    });
  });

  if (!rows.length) return <EmptyState text="Add some words to see progress here." />;
  const totalWords = rows.reduce((a, r) => a + r.total, 0);
  const totalMastered = rows.reduce((a, r) => a + r.mastered, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-center">
        <p className="text-3xl font-extrabold" style={{ color }}>{totalWords ? Math.round((totalMastered / totalWords) * 100) : 0}%</p>
        <p className="text-sm text-slate-500">mastered overall ({totalMastered}/{totalWords} words)</p>
      </div>

      <PerformanceGraph sessionLog={sessionLog} color={color} />

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.lib + r.folder + r.listName} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-bold text-slate-700 text-sm">{r.listName}</p>
              <p className="text-xs text-slate-400">{r.lib} / {r.folder}</p>
            </div>
            <div className="flex gap-2 text-xs font-bold flex-wrap">
              <span className="px-2 py-1 rounded-full bg-green-50 text-green-600">{r.mastered} mastered</span>
              {r.practice > 0 && <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600">{r.practice} need practice</span>}
              <span className="px-2 py-1 rounded-full bg-slate-50 text-slate-500">{r.total} total</span>
            </div>
          </div>
        ))}
      </div>

      <FeedbackReport learnerId={learnerId} section={section} color={color} />
    </div>
  );
}
