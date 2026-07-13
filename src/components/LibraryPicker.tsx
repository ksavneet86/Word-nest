"use client";

import { useState } from "react";
import { Plus, Folder, FileText, Library as LibraryIcon, Pencil, Check, X } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import type { SectionTree } from "@/lib/types";

export interface TreeSelection {
  library: string;
  folder: string;
  list: string;
}

type ItemKind = "library" | "folder" | "list";
type EditTarget = { kind: ItemKind; name: string } | null;

export function LibraryPicker({
  tree,
  sectionColor,
  value,
  onChange,
  onCreateLibrary,
  onCreateFolder,
  onCreateList,
  onRenameLibrary,
  onRenameFolder,
  onRenameList,
}: {
  tree: SectionTree;
  sectionColor: string;
  value: TreeSelection;
  onChange: (value: TreeSelection) => void;
  onCreateLibrary: (name: string) => Promise<void>;
  onCreateFolder: (name: string) => Promise<void>;
  onCreateList: (name: string) => Promise<void>;
  onRenameLibrary: (oldName: string, newName: string) => Promise<void>;
  onRenameFolder: (oldName: string, newName: string) => Promise<void>;
  onRenameList: (oldName: string, newName: string) => Promise<void>;
}) {
  const libs = Object.keys(tree);
  const [newLib, setNewLib] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [newList, setNewList] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<EditTarget>(null);
  const [editValue, setEditValue] = useState("");
  const [renameError, setRenameError] = useState("");

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

  const startEdit = (kind: ItemKind, name: string) => {
    setEditing({ kind, name });
    setEditValue(name);
    setRenameError("");
  };
  const cancelEdit = () => {
    setEditing(null);
    setEditValue("");
    setRenameError("");
  };

  const saveEdit = async () => {
    if (!editing || busy) return;
    const newName = editValue.trim();
    if (!newName || newName === editing.name) {
      cancelEdit();
      return;
    }
    setBusy(true);
    setRenameError("");
    try {
      if (editing.kind === "library") {
        await onRenameLibrary(editing.name, newName);
        if (value.library === editing.name) onChange({ ...value, library: newName });
      } else if (editing.kind === "folder") {
        await onRenameFolder(editing.name, newName);
        if (value.folder === editing.name) onChange({ ...value, folder: newName });
      } else {
        await onRenameList(editing.name, newName);
        if (value.list === editing.name) onChange({ ...value, list: newName });
      }
      setEditing(null);
      setEditValue("");
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : "Couldn't rename — try a different name.");
    } finally {
      setBusy(false);
    }
  };

  const renderItem = (kind: ItemKind, name: string, isSelected: boolean, onSelect: () => void) => {
    const isEditing = editing?.kind === kind && editing.name === name;
    if (isEditing) {
      return (
        <div key={`${kind}-${name}`} className="flex items-center gap-1">
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            className="px-2 py-1.5 rounded-xl text-sm border-2 w-32"
            style={{ borderColor: sectionColor }}
          />
          <button onClick={saveEdit} disabled={busy} className="text-green-600 min-w-[40px] min-h-[40px] flex items-center justify-center"><Check size={16} /></button>
          <button onClick={cancelEdit} disabled={busy} className="text-slate-400 min-w-[40px] min-h-[40px] flex items-center justify-center"><X size={16} /></button>
        </div>
      );
    }
    return (
      <div key={`${kind}-${name}`} className="flex items-center gap-0.5">
        <button
          onClick={onSelect}
          className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 min-h-[40px]"
          style={{ borderColor: isSelected ? sectionColor : "#E5E7EB", color: isSelected ? sectionColor : "#475569" }}
        >
          {name}
        </button>
        <button onClick={() => startEdit(kind, name)} className="text-slate-300 hover:text-slate-500 min-w-[32px] min-h-[40px] flex items-center justify-center" title={`Rename ${kind}`}>
          <Pencil size={13} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {renameError && <p className="text-xs text-red-500">{renameError}</p>}

      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1"><LibraryIcon size={13} /> Library</label>
        <div className="flex gap-2 mt-1 flex-wrap items-center">
          {libs.map((l) => renderItem("library", l, value.library === l, () => onChange({ library: l, folder: "", list: "" })))}
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
          <div className="flex gap-2 mt-1 flex-wrap items-center">
            {folders.map((f) => renderItem("folder", f, value.folder === f, () => onChange({ ...value, folder: f, list: "" })))}
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
          <div className="flex gap-2 mt-1 flex-wrap items-center">
            {lists.map((ls) => renderItem("list", ls, value.list === ls, () => onChange({ ...value, list: ls })))}
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
