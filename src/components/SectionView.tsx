"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownAZ, ArrowUpAZ, Brain, BookOpen, CheckSquare, Clock, Download, Layers, Loader2, Mail, MessageCircle,
  PencilLine, Plus, Puzzle, Sparkles, Trash2, TrendingUp,
} from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { EmptyState } from "@/components/EmptyState";
import { WordDetailCard } from "@/components/WordDetailCard";
import { LibraryPicker, type TreeSelection } from "@/components/LibraryPicker";
import { AddWordsPanel } from "@/components/AddWordsPanel";
import { MoveCopyModal } from "@/components/MoveCopyModal";
import { Flashcards } from "@/components/Flashcards";
import { SentenceBuilder } from "@/components/SentenceBuilder";
import { FillBlank } from "@/components/FillBlank";
import { QuizFlow } from "@/components/QuizFlow";
import { SpellingGameSetup } from "@/components/SpellingGameSetup";
import { ProgressView } from "@/components/ProgressView";
import { FirstThenGate } from "@/components/FirstThenGate";
import { ExtendedGenerator } from "@/components/ExtendedGenerator";
import { useSectionTree } from "@/lib/hooks/useSectionTree";
import { useSessionLog } from "@/lib/hooks/useSessionLog";
import { SECTIONS, type SectionKey } from "@/lib/constants";
import { exportPDF, shareText } from "@/lib/export";
import type { GeneratedWord, WordRecord } from "@/lib/types";

const TABS = [
  { key: "browse", label: "Browse", icon: BookOpen },
  { key: "add", label: "Add words", icon: Plus },
  { key: "flash", label: "Flashcards", icon: Layers },
  { key: "spell", label: "Spell it!", icon: Sparkles },
  { key: "sentence", label: "Sentences", icon: Puzzle },
  { key: "quiz", label: "Quiz", icon: Brain },
  { key: "blank", label: "Fill blanks", icon: PencilLine },
  { key: "progress", label: "Progress", icon: TrendingUp },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SectionView({
  sectionKey,
  learnerId,
  learnerName,
}: {
  sectionKey: SectionKey;
  learnerId: string;
  learnerName: string;
}) {
  const meta = SECTIONS[sectionKey];
  const { tree, refetch } = useSectionTree(learnerId, sectionKey);
  const { sessions, streak, refetch: refetchSessions } = useSessionLog(learnerId);

  const [tab, setTab] = useState<TabKey>("browse");
  const [selection, setSelection] = useState<TreeSelection>({ library: "", folder: "", list: "" });
  const [sortBy, setSortBy] = useState<"az" | "za" | "recent">("az");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState("");
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ kind: "library" | "folder" | "list"; id: string; name: string } | null>(null);

  const listNode = selection.list ? tree[selection.library]?.folders[selection.folder]?.lists[selection.list] : undefined;
  const words = useMemo(() => listNode?.words ?? [], [listNode]);

  const sortedWords = useMemo(() => {
    const arr = [...words];
    if (sortBy === "az") arr.sort((a, b) => a.word.localeCompare(b.word));
    else if (sortBy === "za") arr.sort((a, b) => b.word.localeCompare(a.word));
    else if (sortBy === "recent") arr.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    return arr;
  }, [words, sortBy]);

  const categories = useMemo(() => Array.from(new Set(words.map((w) => w.category).filter((c) => c && c !== "other"))), [words]);
  const filteredWords = categoryFilter === "all" ? sortedWords : sortedWords.filter((w) => w.category === categoryFilter);

  const isExtendedList = sectionKey === "elevenPlus" && selection.list === "Extended List (500+ words)";

  // Reset selection/select-mode whenever the active list changes (React's recommended
  // "adjust state during render" pattern, since this isn't syncing with an external system).
  const [selectResetKey, setSelectResetKey] = useState(selection.list);
  if (selectResetKey !== selection.list) {
    setSelectResetKey(selection.list);
    setSelectMode(false);
    setSelectedIds(new Set());
    setConfirmingBulkDelete(false);
    setBulkDeleteError("");
  }

  const onSessionComplete = async (entry: { type: "quiz" | "blank" | "sentence"; correct: number; total: number }) => {
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId, section: sectionKey, listId: listNode?.id ?? null, ...entry }),
    });
    await Promise.all([refetch(), refetchSessions()]);
  };

  const onAnswer = async (word: WordRecord, correct: boolean, points?: number) => {
    await fetch("/api/quiz/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: word.id, correct, points }),
    });
  };

  const createLibrary = async (name: string) => {
    await fetch("/api/tree/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId, section: sectionKey, name }),
    });
    await refetch();
  };
  const createFolder = async (name: string) => {
    const libraryId = tree[selection.library]?.id;
    if (!libraryId) return;
    await fetch("/api/tree/folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libraryId, name }),
    });
    await refetch();
  };
  const createList = async (name: string) => {
    const folderId = tree[selection.library]?.folders[selection.folder]?.id;
    if (!folderId) return;
    await fetch("/api/tree/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId, name }),
    });
    await refetch();
  };

  const renameLibrary = async (oldName: string, newName: string) => {
    const libraryId = tree[oldName]?.id;
    if (!libraryId) return;
    const res = await fetch(`/api/tree/library/${libraryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Couldn't rename library");
    }
    await refetch();
  };
  const renameFolder = async (oldName: string, newName: string) => {
    const folderId = tree[selection.library]?.folders[oldName]?.id;
    if (!folderId) return;
    const res = await fetch(`/api/tree/folder/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Couldn't rename folder");
    }
    await refetch();
  };
  const renameList = async (oldName: string, newName: string) => {
    const listId = tree[selection.library]?.folders[selection.folder]?.lists[oldName]?.id;
    if (!listId) return;
    const res = await fetch(`/api/tree/list/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Couldn't rename list");
    }
    await refetch();
  };

  const deleteLibrary = async (name: string) => {
    const libraryId = tree[name]?.id;
    if (!libraryId) return;
    const res = await fetch(`/api/tree/library/${libraryId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Couldn't delete library");
    }
    if (selection.library === name) setSelection({ library: "", folder: "", list: "" });
    await refetch();
  };
  const deleteFolder = async (name: string) => {
    const folderId = tree[selection.library]?.folders[name]?.id;
    if (!folderId) return;
    const res = await fetch(`/api/tree/folder/${folderId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Couldn't delete folder");
    }
    if (selection.folder === name) setSelection({ ...selection, folder: "", list: "" });
    await refetch();
  };
  const deleteList = async (name: string) => {
    const listId = tree[selection.library]?.folders[selection.folder]?.lists[name]?.id;
    if (!listId) return;
    const res = await fetch(`/api/tree/list/${listId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Couldn't delete list");
    }
    if (selection.list === name) setSelection({ ...selection, list: "" });
    await refetch();
  };

  const requestMove = (kind: "library" | "folder" | "list", name: string) => {
    let id: string | undefined;
    if (kind === "library") id = tree[name]?.id;
    else if (kind === "folder") id = tree[selection.library]?.folders[name]?.id;
    else id = tree[selection.library]?.folders[selection.folder]?.lists[name]?.id;
    if (!id) return;
    setMoveTarget({ kind, id, name });
  };

  const onMoveDone = async (mode: "move" | "copy") => {
    await refetch();
    if (mode === "move" && moveTarget) {
      if (moveTarget.kind === "library" && selection.library === moveTarget.name) {
        setSelection({ library: "", folder: "", list: "" });
      } else if (moveTarget.kind === "folder" && selection.folder === moveTarget.name) {
        setSelection({ ...selection, folder: "", list: "" });
      } else if (moveTarget.kind === "list" && selection.list === moveTarget.name) {
        setSelection({ ...selection, list: "" });
      }
    }
  };

  const saveWords = async (listId: string, target: TreeSelection, words: GeneratedWord[]) => {
    await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, words }),
    });
    await refetch();
    setSelection(target);
    setTab("browse");
  };

  const deleteWord = async (id: string) => {
    await fetch(`/api/words/${id}`, { method: "DELETE" });
    await refetch();
  };

  const toggleWordSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllWords = () => setSelectedIds(new Set(filteredWords.map((w) => w.id)));
  const clearSelectedWords = () => setSelectedIds(new Set());

  const deleteSelectedWords = async () => {
    if (!listNode || selectedIds.size === 0) return;
    setBulkDeleteBusy(true);
    setBulkDeleteError("");
    try {
      const res = await fetch("/api/words", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: listNode.id, ids: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't delete the selected words");
      }
      setSelectedIds(new Set());
      setSelectMode(false);
      setConfirmingBulkDelete(false);
      await refetch();
    } catch (e) {
      setBulkDeleteError(e instanceof Error ? e.message : "Couldn't delete the selected words");
    } finally {
      setBulkDeleteBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="rounded-2xl p-3" style={{ backgroundColor: meta.soft }}>
          <meta.icon size={22} style={{ color: meta.color }} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">{meta.label}</h2>
          {selection.list && <p className="text-sm text-slate-400">{selection.library} / {selection.folder} / {selection.list} · {words.length} words</p>}
        </div>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.filter((t) => t.key !== "spell" || sectionKey === "spelling").map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold min-h-[40px]"
            style={tab === t.key ? { backgroundColor: meta.color, color: "white" } : { backgroundColor: meta.soft, color: meta.color }}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "add" && (
        <AddWordsPanel
          tree={tree}
          sectionColor={meta.color}
          target={selection}
          onTargetChange={setSelection}
          onCreateLibrary={createLibrary}
          onCreateFolder={createFolder}
          onCreateList={createList}
          onRenameLibrary={renameLibrary}
          onRenameFolder={renameFolder}
          onRenameList={renameList}
          onDeleteLibrary={deleteLibrary}
          onDeleteFolder={deleteFolder}
          onDeleteList={deleteList}
          onRequestMove={requestMove}
          onSave={saveWords}
        />
      )}

      {tab !== "add" && tab !== "progress" && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-5">
          <LibraryPicker
            tree={tree}
            sectionColor={meta.color}
            value={selection}
            onChange={setSelection}
            onCreateLibrary={createLibrary}
            onCreateFolder={createFolder}
            onCreateList={createList}
            onRenameLibrary={renameLibrary}
            onRenameFolder={renameFolder}
            onRenameList={renameList}
            onDeleteLibrary={deleteLibrary}
            onDeleteFolder={deleteFolder}
            onDeleteList={deleteList}
            onRequestMove={requestMove}
          />
        </div>
      )}

      {moveTarget && (
        <MoveCopyModal
          kind={moveTarget.kind}
          sourceId={moveTarget.id}
          sourceName={moveTarget.name}
          currentLearnerId={learnerId}
          sectionKey={sectionKey}
          sectionColor={meta.color}
          suggestedLibraryName={selection.library}
          suggestedFolderName={selection.folder}
          onClose={() => setMoveTarget(null)}
          onDone={onMoveDone}
        />
      )}

      {tab === "browse" && isExtendedList && (
        <ExtendedGenerator learnerId={learnerId} generatedCount={words.length} color={meta.color} onGenerated={refetch} />
      )}

      {tab === "browse" &&
        (selection.list ? (
          words.length ? (
            <>
              <div className="flex items-center gap-2 mb-4 flex-wrap justify-between">
                <div className="flex gap-2 flex-wrap">
                  <Btn variant="soft" color={meta.color} onClick={() => exportPDF(selection.list, filteredWords)}><Download size={15} /> Print / Save PDF</Btn>
                  <Btn variant="soft" color={meta.color} onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(selection.list)}&body=${encodeURIComponent(shareText(selection.list, filteredWords))}`, "_blank")}><Mail size={15} /> Share via Gmail</Btn>
                  <Btn variant="soft" color={meta.color} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText(selection.list, filteredWords))}`, "_blank")}><MessageCircle size={15} /> Share via WhatsApp</Btn>
                  <Btn
                    variant={selectMode ? "solid" : "soft"}
                    color={meta.color}
                    onClick={() => setSelectMode((s) => !s)}
                  >
                    <CheckSquare size={15} /> {selectMode ? "Cancel select" : "Select"}
                  </Btn>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setSortBy("az")} title="A to Z" className="p-2 rounded-xl min-w-[40px] min-h-[40px]" style={sortBy === "az" ? { backgroundColor: meta.color, color: "white" } : { backgroundColor: meta.soft, color: meta.color }}><ArrowDownAZ size={15} /></button>
                  <button onClick={() => setSortBy("za")} title="Z to A" className="p-2 rounded-xl min-w-[40px] min-h-[40px]" style={sortBy === "za" ? { backgroundColor: meta.color, color: "white" } : { backgroundColor: meta.soft, color: meta.color }}><ArrowUpAZ size={15} /></button>
                  <button onClick={() => setSortBy("recent")} title="Recently added" className="p-2 rounded-xl min-w-[40px] min-h-[40px]" style={sortBy === "recent" ? { backgroundColor: meta.color, color: "white" } : { backgroundColor: meta.soft, color: meta.color }}><Clock size={15} /></button>
                </div>
              </div>

              {selectMode && (
                <div className="flex items-center gap-2 mb-4 flex-wrap bg-slate-50 rounded-2xl p-3">
                  <Btn variant="soft" color={meta.color} onClick={selectAllWords}>Select all ({filteredWords.length})</Btn>
                  <Btn variant="soft" color={meta.color} onClick={clearSelectedWords}>Clear</Btn>
                  <span className="text-sm text-slate-500">{selectedIds.size} selected</span>
                  {!confirmingBulkDelete ? (
                    <Btn
                      variant="solid"
                      color="#DC2626"
                      onClick={() => setConfirmingBulkDelete(true)}
                      disabled={selectedIds.size === 0}
                      className="ml-auto"
                    >
                      <Trash2 size={15} /> Delete selected
                    </Btn>
                  ) : (
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                      <span className="text-sm font-semibold text-red-600">
                        Delete {selectedIds.size} word{selectedIds.size === 1 ? "" : "s"}? This can&apos;t be undone.
                      </span>
                      <Btn variant="solid" color="#DC2626" onClick={deleteSelectedWords} disabled={bulkDeleteBusy}>
                        {bulkDeleteBusy ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />} Confirm
                      </Btn>
                      <button onClick={() => setConfirmingBulkDelete(false)} disabled={bulkDeleteBusy} className="text-xs font-bold text-slate-400 px-2 min-h-[40px]">Cancel</button>
                    </div>
                  )}
                  {bulkDeleteError && <p className="text-xs text-red-500 w-full">{bulkDeleteError}</p>}
                </div>
              )}

              {categories.length > 0 && (
                <div className="flex gap-1.5 mb-4 flex-wrap">
                  <button onClick={() => setCategoryFilter("all")} className="px-3 py-1 rounded-full text-xs font-bold min-h-[40px]" style={categoryFilter === "all" ? { backgroundColor: meta.color, color: "white" } : { backgroundColor: meta.soft, color: meta.color }}>All</button>
                  {categories.map((c) => (
                    <button key={c} onClick={() => setCategoryFilter(c)} className="px-3 py-1 rounded-full text-xs font-bold capitalize min-h-[40px]" style={categoryFilter === c ? { backgroundColor: meta.color, color: "white" } : { backgroundColor: meta.soft, color: meta.color }}>{c}</button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {filteredWords.map((w) => (
                  <WordDetailCard
                    key={w.id}
                    w={w}
                    color={meta.color}
                    showSpellingMode={sectionKey === "spelling"}
                    onDelete={() => deleteWord(w.id)}
                    selectMode={selectMode}
                    selected={selectedIds.has(w.id)}
                    onToggleSelect={() => toggleWordSelected(w.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState text="No words yet — add some from the Add words tab." />
          )
        ) : (
          <EmptyState text="Pick or create a library / folder / list above to see words." />
        ))}

      {tab === "flash" &&
        (selection.list ? (
          <FirstThenGate firstLabel={`Look through ${sortedWords.length} picture cards`} thenLabel="Tap each card to check the meaning" color={meta.color}>
            <Flashcards words={sortedWords} color={meta.color} section={sectionKey} />
          </FirstThenGate>
        ) : (
          <EmptyState text="Pick a list above first." />
        ))}

      {tab === "spell" &&
        (selection.list ? (
          <SpellingGameSetup words={sortedWords} color={meta.color} onAnswer={onAnswer} onSessionComplete={onSessionComplete} />
        ) : (
          <EmptyState text="Pick a list above first." />
        ))}

      {tab === "sentence" &&
        (selection.list ? (
          <FirstThenGate firstLabel="Build sentences from word tiles" thenLabel="Check each one when you're ready" color={meta.color}>
            <SentenceBuilder words={sortedWords} color={meta.color} onSessionComplete={onSessionComplete} />
          </FirstThenGate>
        ) : (
          <EmptyState text="Pick a list above first." />
        ))}

      {tab === "quiz" && (
        <QuizFlow tree={tree} selection={selection} color={meta.color} onAnswer={onAnswer} onSessionComplete={onSessionComplete} />
      )}

      {tab === "blank" &&
        (selection.list ? (
          <FirstThenGate firstLabel="Fill in the missing word" thenLabel="See how many you get right" color={meta.color}>
            <FillBlank words={words} color={meta.color} onSessionComplete={onSessionComplete} />
          </FirstThenGate>
        ) : (
          <EmptyState text="Pick a list above first." />
        ))}

      {tab === "progress" && (
        <ProgressView
          tree={tree}
          color={meta.color}
          sessionLog={sessions}
          streak={streak}
          learnerId={learnerId}
          learnerName={learnerName}
          section={sectionKey}
        />
      )}
    </div>
  );
}
