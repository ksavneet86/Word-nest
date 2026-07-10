"use client";

import { useState } from "react";
import { Plus, Folder, FileText, Library as LibraryIcon } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import type { SectionTree } from "@/lib/types";

export interface TreeSelection {
  library: string;
  folder: string;
  list: string;
}

export function LibraryPicker({
  tree,
  sectionColor,
  value,
  onChange,
  onCreateLibrary,
  onCreateFolder,
  onCreateList,
}: {
  tree: SectionTree;
  sectionColor: string;
  value: TreeSelection;
  onChange: (value: TreeSelection) => void;
  onCreateLibrary: (name: string) => Promise<void>;
  onCreateFolder: (name: string) => Promise<void>;
  onCreateList: (name: string) => Promise<void>;
}) {
  const libs = Object.keys(tree);
  const [newLib, setNewLib] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [newList, setNewList] = useState("");
  const [busy, setBusy] = useState(false);

  const folders = value.library && tree[value.library] ? Object.keys(tree[value.library].folders) : [];
  const lists =
    value.library && value.folder && tree[value.library]?.folders[value.folder]
      ? Object.keys(tree[value.library].folders[value.folder].lists)
      : [];

  const addLibrary = async () => {
    const name = newLib.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await onCreateLibrary(name);
      onChange({ library: name, folder: "", list: "" });
      setNewLib("");
    } finally {
      setBusy(false);
    }
  };
  const addFolder = async () => {
    const name = newFolder.trim();
    if (!name || !value.library || busy) return;
    setBusy(true);
    try {
      await onCreateFolder(name);
      onChange({ ...value, folder: name, list: "" });
      setNewFolder("");
    } finally {
      setBusy(false);
    }
  };
  const addList = async () => {
    const name = newList.trim();
    if (!name || !value.library || !value.folder || busy) return;
    setBusy(true);
    try {
      await onCreateList(name);
      onChange({ ...value, list: name });
      setNewList("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1"><LibraryIcon size={13} /> Library</label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {libs.map((l) => (
            <button
              key={l}
              onClick={() => onChange({ library: l, folder: "", list: "" })}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 min-h-[40px]"
              style={{ borderColor: value.library === l ? sectionColor : "#E5E7EB", color: value.library === l ? sectionColor : "#475569" }}
            >
              {l}
            </button>
          ))}
          <div className="flex gap-1">
            <input
              value={newLib}
              onChange={(e) => setNewLib(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLibrary()}
              placeholder="New library"
              className="px-2 py-1.5 rounded-xl text-sm border-2 border-slate-200 w-32"
            />
            <Btn variant="soft" color={sectionColor} onClick={addLibrary} disabled={busy}><Plus size={14} /></Btn>
          </div>
        </div>
      </div>

      {value.library && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1"><Folder size={13} /> Folder</label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {folders.map((f) => (
              <button
                key={f}
                onClick={() => onChange({ ...value, folder: f, list: "" })}
                className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 min-h-[40px]"
                style={{ borderColor: value.folder === f ? sectionColor : "#E5E7EB", color: value.folder === f ? sectionColor : "#475569" }}
              >
                {f}
              </button>
            ))}
            <div className="flex gap-1">
              <input
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFolder()}
                placeholder="New folder"
                className="px-2 py-1.5 rounded-xl text-sm border-2 border-slate-200 w-32"
              />
              <Btn variant="soft" color={sectionColor} onClick={addFolder} disabled={busy}><Plus size={14} /></Btn>
            </div>
          </div>
        </div>
      )}

      {value.library && value.folder && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1"><FileText size={13} /> List / File</label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {lists.map((ls) => (
              <button
                key={ls}
                onClick={() => onChange({ ...value, list: ls })}
                className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 min-h-[40px]"
                style={{ borderColor: value.list === ls ? sectionColor : "#E5E7EB", color: value.list === ls ? sectionColor : "#475569" }}
              >
                {ls}
              </button>
            ))}
            <div className="flex gap-1">
              <input
                value={newList}
                onChange={(e) => setNewList(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addList()}
                placeholder="New list"
                className="px-2 py-1.5 rounded-xl text-sm border-2 border-slate-200 w-32"
              />
              <Btn variant="soft" color={sectionColor} onClick={addList} disabled={busy}><Plus size={14} /></Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
