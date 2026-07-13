"use client";

import { useRef, useState } from "react";
import { Plus, Folder, FileText, Library as LibraryIcon, Check, Loader2, Trash2 } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import type { SectionTree } from "@/lib/types";

export interface TreeSelection {
  library: string;
  folder: string;
  list: string;
}

type ItemKind = "library" | "folder" | "list";
type EditTarget = { kind: ItemKind; name: string } | null;

const LONG_PRESS_MS = 2200;

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
  onDeleteLibrary,
  onDeleteFolder,
  onDeleteList,
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
  onDeleteLibrary: (name: string) => Promise<void>;
  onDeleteFolder: (name: string) => Promise<void>;
  onDeleteList: (name: string) => Promise<void>;
}) {
  const libs = Object.keys(tree);
  const [newLib, setNewLib] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [newList, setNewList] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<EditTarget>(null);
  const [editValue, setEditValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [deleting, setDeleting] = useState<EditTarget>(null);
  const [deleteError, setDeleteError] = useState("");

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

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

  const startDelete = (kind: ItemKind, name: string) => {
    setDeleting({ kind, name });
    setDeleteError("");
  };
  const cancelDelete = () => {
    setDeleting(null);
    setDeleteError("");
  };
  const confirmDelete = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    setDeleteError("");
    try {
      if (deleting.kind === "library") {
        await onDeleteLibrary(deleting.name);
      } else if (deleting.kind === "folder") {
        await onDeleteFolder(deleting.name);
      } else {
        await onDeleteList(deleting.name);
      }
      setDeleting(null);
      setEditing(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Couldn't delete — try again.");
    } finally {
      setBusy(false);
    }
  };

  const handlePressStart = (kind: ItemKind, name: string) => {
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      startEdit(kind, name);
    }, LONG_PRESS_MS);
  };
  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const handleClick = (onSelect: () => void) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onSelect();
  };

  const renderItem = (kind: ItemKind, name: string, isSelected: boolean, onSelect: () => void) => {
    const isEditing = editing?.kind === kind && editing.name === name;
    const isDeleting = deleting?.kind === kind && deleting.name === name;

    if (isDeleting) {
      return (
        <div key={`${kind}-${name}`} className="flex flex-col gap-1.5 bg-red-50 rounded-2xl p-2">
          <p className="text-xs font-semibold text-red-600">Delete &quot;{name}&quot;? This can&apos;t be undone.</p>
          {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
          <div className="flex items-center gap-1.5">
            <Btn variant="solid" color="#DC2626" onClick={confirmDelete} disabled={busy} className="px-3 py-1.5 text-xs">
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Delete
            </Btn>
            <button onClick={cancelDelete} disabled={busy} className="text-xs font-bold text-slate-400 px-2 min-h-[40px]">Cancel</button>
          </div>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div key={`${kind}-${name}`} className="flex items-center gap-1.5 bg-slate-50 rounded-2xl p-1.5">
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            className="px-2 py-1.5 rounded-xl text-sm border-2 bg-white w-28"
            style={{ borderColor: sectionColor }}
          />
          <Btn color={sectionColor} onClick={saveEdit} disabled={busy} className="px-3 py-1.5 text-xs">
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Save
          </Btn>
          <button onClick={cancelEdit} disabled={busy} className="text-xs font-bold text-slate-400 px-2 min-h-[40px]">Cancel</button>
          <button onClick={() => startDelete(kind, name)} disabled={busy} className="text-red-400 px-2 min-w-[40px] min-h-[40px] flex items-center justify-center" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      );
    }
    return (
      <button
        key={`${kind}-${name}`}
        onClick={() => handleClick(onSelect)}
        onPointerDown={() => handlePressStart(kind, name)}
        onPointerUp={handlePressEnd}
        onPointerLeave={handlePressEnd}
        onPointerCancel={handlePressEnd}
        onContextMenu={(e) => e.preventDefault()}
        className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 min-h-[40px] select-none"
        style={{
          borderColor: isSelected ? sectionColor : "#E5E7EB",
          color: isSelected ? sectionColor : "#475569",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          touchAction: "manipulation",
        }}
      >
        {name}
      </button>
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

      <p className="text-[11px] text-slate-400">Tip: press and hold a name for a couple of seconds to rename or delete it.</p>
    </div>
  );
}
