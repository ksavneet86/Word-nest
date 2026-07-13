"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Copy, Loader2, X } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import type { LearnerSummary, SectionTree } from "@/lib/types";
import { SECTIONS, type SectionKey } from "@/lib/constants";

type ItemKind = "library" | "folder" | "list";

export function MoveCopyModal({
  kind,
  sourceId,
  sourceName,
  currentLearnerId,
  sectionKey,
  sectionColor,
  suggestedLibraryName,
  suggestedFolderName,
  onClose,
  onDone,
}: {
  kind: ItemKind;
  sourceId: string;
  sourceName: string;
  currentLearnerId: string;
  sectionKey: SectionKey;
  sectionColor: string;
  suggestedLibraryName: string;
  suggestedFolderName: string;
  onClose: () => void;
  onDone: (mode: "move" | "copy") => Promise<void>;
}) {
  const [learners, setLearners] = useState<LearnerSummary[] | null>(null);
  const [targetLearnerId, setTargetLearnerId] = useState("");
  const [targetSection, setTargetSection] = useState<SectionKey>(sectionKey);
  const [targetTree, setTargetTree] = useState<SectionTree | null>(null);
  const [libraryName, setLibraryName] = useState(kind !== "library" ? suggestedLibraryName : "");
  const [folderName, setFolderName] = useState(kind === "list" ? suggestedFolderName : "");
  const [mode, setMode] = useState<"move" | "copy">("move");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/learners")
      .then((r) => r.json())
      .then((data) => setLearners(data.learners as LearnerSummary[]))
      .catch(() => setLearners([]));
  }, []);

  useEffect(() => {
    if (!targetLearnerId || kind === "library") return;
    fetch(`/api/tree?learnerId=${targetLearnerId}&section=${targetSection}`)
      .then((r) => r.json())
      .then((data) => setTargetTree(data.tree))
      .catch(() => setTargetTree(null));
  }, [targetLearnerId, kind, targetSection]);

  const existingLibraryNames = targetTree ? Object.keys(targetTree) : [];
  const existingFolderNames =
    targetTree && libraryName.trim() && targetTree[libraryName.trim()] ? Object.keys(targetTree[libraryName.trim()].folders) : [];

  const canSubmit =
    !!targetLearnerId &&
    (kind === "library" || libraryName.trim().length > 0) &&
    (kind !== "list" || folderName.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      if (kind === "library") {
        const res = await fetch(`/api/tree/library/${sourceId}/transfer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetLearnerId, mode }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't move/copy this library");
      } else if (kind === "folder") {
        const libRes = await fetch("/api/tree/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ learnerId: targetLearnerId, section: targetSection, name: libraryName.trim() }),
        });
        if (!libRes.ok) throw new Error((await libRes.json().catch(() => ({}))).error || "Couldn't set up the destination library");
        const { library } = await libRes.json();
        const res = await fetch(`/api/tree/folder/${sourceId}/transfer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetLibraryId: library.id, mode }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't move/copy this folder");
      } else {
        const libRes = await fetch("/api/tree/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ learnerId: targetLearnerId, section: targetSection, name: libraryName.trim() }),
        });
        if (!libRes.ok) throw new Error((await libRes.json().catch(() => ({}))).error || "Couldn't set up the destination library");
        const { library } = await libRes.json();
        const folderRes = await fetch("/api/tree/folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ libraryId: library.id, name: folderName.trim() }),
        });
        if (!folderRes.ok) throw new Error((await folderRes.json().catch(() => ({}))).error || "Couldn't set up the destination folder");
        const { folder } = await folderRes.json();
        const res = await fetch(`/api/tree/list/${sourceId}/transfer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetFolderId: folder.id, mode }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't move/copy this list");
      }
      await onDone(mode);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  };

  const kindLabel = kind === "library" ? "library" : kind === "folder" ? "folder" : "list";

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft size={18} /> Move / copy &quot;{sourceName}&quot;
          </h3>
          <button onClick={onClose} className="min-w-[40px] min-h-[40px] flex items-center justify-center"><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="flex gap-2">
          <Btn variant={mode === "move" ? "solid" : "soft"} color={sectionColor} onClick={() => setMode("move")} className="flex-1">
            <ArrowRightLeft size={14} /> Move
          </Btn>
          <Btn variant={mode === "copy" ? "solid" : "soft"} color={sectionColor} onClick={() => setMode("copy")} className="flex-1">
            <Copy size={14} /> Copy
          </Btn>
        </div>
        <p className="text-xs text-slate-400">
          {mode === "move"
            ? `This ${kindLabel} (and everything inside it) will be moved to the destination below and no longer appear here.`
            : `A copy of this ${kindLabel} (and everything inside it) will be created at the destination below — the original stays here.`}
        </p>

        <div>
          <label className="text-sm font-bold text-slate-700">Send to learner</label>
          {learners === null ? (
            <p className="text-sm text-slate-400 flex items-center gap-2 mt-2"><Loader2 className="animate-spin" size={14} /> Loading learners…</p>
          ) : (
            <div className="flex gap-2 mt-2 flex-wrap">
              {learners.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setTargetLearnerId(l.id)}
                  className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 min-h-[40px]"
                  style={{ borderColor: targetLearnerId === l.id ? sectionColor : "#E5E7EB", color: targetLearnerId === l.id ? sectionColor : "#475569" }}
                >
                  {l.avatarEmoji ? `${l.avatarEmoji} ` : ""}{l.name}
                  {l.id === currentLearnerId ? " (this learner)" : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        {targetLearnerId && kind !== "library" && (
          <div>
            <label className="text-sm font-bold text-slate-700">Section</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {(Object.entries(SECTIONS) as [SectionKey, (typeof SECTIONS)[SectionKey]][]).map(([key, secMeta]) => (
                <button
                  key={key}
                  onClick={() => setTargetSection(key)}
                  className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 min-h-[40px]"
                  style={{ borderColor: targetSection === key ? sectionColor : "#E5E7EB", color: targetSection === key ? sectionColor : "#475569" }}
                >
                  {secMeta.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {targetLearnerId && kind !== "library" && (
          <div>
            <label className="text-sm font-bold text-slate-700">Destination library</label>
            <input
              value={libraryName}
              onChange={(e) => setLibraryName(e.target.value)}
              placeholder="Library name"
              className="w-full mt-2 px-3 py-2 rounded-xl text-sm border-2 border-slate-200"
            />
            {existingLibraryNames.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {existingLibraryNames.map((n) => (
                  <button
                    key={n}
                    onClick={() => setLibraryName(n)}
                    className="px-2 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: `${sectionColor}1a`, color: sectionColor }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {targetLearnerId && kind === "list" && (
          <div>
            <label className="text-sm font-bold text-slate-700">Destination folder</label>
            <input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full mt-2 px-3 py-2 rounded-xl text-sm border-2 border-slate-200"
            />
            {existingFolderNames.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {existingFolderNames.map((n) => (
                  <button
                    key={n}
                    onClick={() => setFolderName(n)}
                    className="px-2 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: `${sectionColor}1a`, color: sectionColor }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Btn color={sectionColor} onClick={submit} disabled={!canSubmit || busy} className="w-full justify-center">
          {busy ? <Loader2 className="animate-spin" size={16} /> : <ArrowRightLeft size={16} />}
          {mode === "move" ? "Move" : "Copy"} {kindLabel}
        </Btn>
      </div>
    </div>
  );
}
