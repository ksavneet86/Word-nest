"use client";

import { useRef, useState } from "react";
import { Check, FolderPlus, Loader2, PencilLine, Upload, Wand2 } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { LibraryPicker, type TreeSelection } from "@/components/LibraryPicker";
import type { GeneratedWord, SectionTree } from "@/lib/types";
import { uid, compressImageForUpload } from "@/lib/client-helpers";

export function AddWordsPanel({
  tree,
  sectionColor,
  target,
  onTargetChange,
  onCreateLibrary,
  onCreateFolder,
  onCreateList,
  onRenameLibrary,
  onRenameFolder,
  onRenameList,
  onSave,
}: {
  tree: SectionTree;
  sectionColor: string;
  target: TreeSelection;
  onTargetChange: (value: TreeSelection) => void;
  onCreateLibrary: (name: string) => Promise<void>;
  onCreateFolder: (name: string) => Promise<void>;
  onCreateList: (name: string) => Promise<void>;
  onRenameLibrary: (oldName: string, newName: string) => Promise<void>;
  onRenameFolder: (oldName: string, newName: string) => Promise<void>;
  onRenameList: (oldName: string, newName: string) => Promise<void>;
  onSave: (listId: string, target: TreeSelection, words: GeneratedWord[]) => Promise<void>;
}) {
  const [mode, setMode] = useState<"type" | "upload">("type");
  const [rawWords, setRawWords] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [preview, setPreview] = useState<(GeneratedWord & { _key: string })[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const CONTINUE_BATCH_SIZE = 40;

  const canGenerate = target.library && target.folder && target.list;
  const listId = canGenerate ? tree[target.library]?.folders[target.folder]?.lists[target.list]?.id : undefined;

  const seenWordsRef = useRef<Set<string>>(new Set());

  const existingWordSet = () => {
    const existing = new Set<string>();
    const list =
      target.library && target.folder && target.list
        ? tree[target.library]?.folders[target.folder]?.lists[target.list]
        : undefined;
    list?.words.forEach((w) => existing.add(w.word.trim().toLowerCase()));
    return existing;
  };

  /** Marks a raw word string as seen; returns false (and skips it) if it's a duplicate. */
  const markIfNew = (word: string) => {
    const key = word.trim().toLowerCase();
    if (!key || seenWordsRef.current.has(key)) return false;
    seenWordsRef.current.add(key);
    return true;
  };

  const generateFromTyped = async () => {
    const typed = rawWords.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
    if (!typed.length) return;
    seenWordsRef.current = existingWordSet();
    const words = typed.filter(markIfNew);
    const skipped = typed.length - words.length;
    if (!words.length) {
      setError("All of those words are already in this list.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice(skipped ? `Skipped ${skipped} word${skipped === 1 ? "" : "s"} already in this list.` : "");
    try {
      const res = await fetch("/api/words/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPreview((data.words as GeneratedWord[]).map((g) => ({ ...g, _key: uid() })));
    } catch {
      setError("Couldn't generate meanings. Try again.");
    }
    setLoading(false);
  };

  const generateRemaining = async (words: string[], doneSoFar: number, total: number) => {
    if (!words.length) {
      setNotice("");
      setGeneratingMore(false);
      return;
    }
    setGeneratingMore(true);
    setNotice(`Generating meanings for the rest of the list… ${doneSoFar}/${total} words done`);
    const batch = words.slice(0, CONTINUE_BATCH_SIZE);
    const rest = words.slice(CONTINUE_BATCH_SIZE);
    try {
      const res = await fetch("/api/words/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: batch }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Couldn't generate meanings for the rest of the list — the words already found are still below.");
        setNotice("");
        setGeneratingMore(false);
        return;
      }
      const generated = ((data.words ?? []) as GeneratedWord[]).filter((g) => markIfNew(g.word));
      setPreview((prev) => [...prev, ...generated.map((g) => ({ ...g, _key: uid() }))]);
      await generateRemaining(rest, doneSoFar + batch.length, total);
    } catch {
      setError("Couldn't generate meanings for the rest of the list — the words already found are still below.");
      setNotice("");
      setGeneratingMore(false);
    }
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setLoading(true);
    setError("");
    setNotice("");
    seenWordsRef.current = existingWordSet();
    try {
      const upload = await compressImageForUpload(file);
      const formData = new FormData();
      formData.append("file", upload);
      const res = await fetch("/api/words/extract", { method: "POST", body: formData });
      if (res.status === 413) {
        setError("That file is too large — try a smaller photo or a lower-resolution scan.");
        setLoading(false);
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Couldn't read that file. Try a clearer image or PDF.");
        setLoading(false);
        return;
      }
      const rawGenerated = (data.words ?? []) as GeneratedWord[];
      if (!rawGenerated.length) {
        setError("No words found in that file.");
        setLoading(false);
        return;
      }
      const words = rawGenerated.filter((g) => markIfNew(g.word));
      const skippedFirstBatch = rawGenerated.length - words.length;
      setPreview(words.map((g) => ({ ...g, _key: uid() })));
      setLoading(false);

      let leftoverDeduped: string[] = [];
      if (
        typeof data.foundCount === "number" &&
        typeof data.processedCount === "number" &&
        data.foundCount > data.processedCount &&
        Array.isArray(data.allWords)
      ) {
        const leftoverRaw = (data.allWords as string[]).slice(data.processedCount);
        leftoverDeduped = leftoverRaw.filter(markIfNew);
      }

      if (leftoverDeduped.length) {
        generateRemaining(leftoverDeduped, words.length, words.length + leftoverDeduped.length);
      } else if (!words.length && skippedFirstBatch) {
        setError("All the words found are already in this list.");
      } else if (skippedFirstBatch) {
        setNotice(`Skipped ${skippedFirstBatch} word${skippedFirstBatch === 1 ? "" : "s"} already in this list.`);
      }
      return;
    } catch {
      setError("Couldn't read that file. Try a clearer image or PDF.");
    }
    setLoading(false);
  };

  const save = async () => {
    if (!listId) return;
    await onSave(listId, target, preview);
    setPreview([]);
    setRawWords("");
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <h3 className="font-extrabold text-slate-700 mb-3 flex items-center gap-2"><FolderPlus size={18} style={{ color: sectionColor }} /> Choose where to save</h3>
        <LibraryPicker
          tree={tree}
          sectionColor={sectionColor}
          value={target}
          onChange={onTargetChange}
          onCreateLibrary={onCreateLibrary}
          onCreateFolder={onCreateFolder}
          onCreateList={onCreateList}
          onRenameLibrary={onRenameLibrary}
          onRenameFolder={onRenameFolder}
          onRenameList={onRenameList}
        />
      </div>

      {canGenerate && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="flex gap-2 mb-4">
            <Btn variant={mode === "type" ? "solid" : "soft"} color={sectionColor} onClick={() => setMode("type")}><PencilLine size={16} /> Type words</Btn>
            <Btn variant={mode === "upload" ? "solid" : "soft"} color={sectionColor} onClick={() => setMode("upload")}><Upload size={16} /> Upload PDF/Image</Btn>
          </div>

          {mode === "type" ? (
            <div className="space-y-3">
              <textarea
                value={rawWords}
                onChange={(e) => setRawWords(e.target.value)}
                placeholder="e.g. abundant, candid, meticulous"
                className="w-full border-2 border-slate-200 rounded-2xl p-3 h-24 text-sm"
              />
              <Btn color={sectionColor} onClick={generateFromTyped} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />} Generate meanings
              </Btn>
            </div>
          ) : (
            <div className="space-y-3">
              <label
                htmlFor="wordnest-file-input"
                className="inline-flex items-center gap-2 justify-center rounded-2xl font-bold px-4 py-2.5 cursor-pointer select-none min-h-[40px]"
                style={{ backgroundColor: `${sectionColor}1a`, color: sectionColor }}
              >
                <Upload size={16} /> Choose file
                <input
                  id="wordnest-file-input"
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </label>

              <div
                tabIndex={0}
                onPaste={(e) => {
                  const f = e.clipboardData?.files?.[0];
                  if (f) { handleFile(f); return; }
                  const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
                  const blob = item?.getAsFile();
                  if (blob) handleFile(blob);
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDragOver(false);
                  const f = e.dataTransfer?.files?.[0];
                  if (f) handleFile(f);
                }}
                className="rounded-2xl border-2 border-dashed p-5 text-center text-sm cursor-text outline-none"
                style={{ borderColor: dragOver ? sectionColor : "#E2E8F0", backgroundColor: dragOver ? `${sectionColor}0d` : "transparent", color: "#64748B" }}
              >
                If &quot;Choose file&quot; doesn&apos;t open a dialog, click here and paste (Ctrl/Cmd+V) a copied image or PDF —
                or drag a file in from your computer.
              </div>

              {fileName && !loading && <p className="text-sm text-slate-500">Selected: {fileName}</p>}
              {loading && <p className="text-sm flex items-center gap-2 text-slate-500"><Loader2 className="animate-spin" size={16} /> Reading file &amp; generating meanings…</p>}
            </div>
          )}
          {notice && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-2">
              {generatingMore && <Loader2 className="animate-spin" size={14} />} {notice}
            </p>
          )}
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      )}

      {preview.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-700">Preview ({preview.length} words)</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {preview.map((w) => (
              <div key={w._key} className="flex items-center gap-3 text-sm border-b border-slate-100 pb-2">
                <span className="text-xl">{w.emoji}</span>
                <div className="flex-1">
                  <span className="font-bold">{w.word}</span> <span className="text-slate-500">— {w.meaning}</span>
                </div>
              </div>
            ))}
          </div>
          <Btn color={sectionColor} onClick={save}><Check size={16} /> Save {preview.length} words to {target.list}</Btn>
          {generatingMore && <p className="text-xs text-slate-400">More words are still being added below — you can wait for all of them or save what&apos;s here now.</p>}
        </div>
      )}
    </div>
  );
}
