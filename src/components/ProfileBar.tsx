"use client";

import { useState } from "react";
import { Plus, UserRound } from "lucide-react";
import type { LearnerSummary } from "@/lib/types";

export function ProfileBar({
  learners,
  activeId,
  onSwitch,
  onAdd,
}: {
  learners: LearnerSummary[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onAdd: (name: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const submit = async () => {
    if (name.trim()) {
      await onAdd(name.trim());
      setName("");
    }
    setAdding(false);
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {learners.map((p) => (
        <button
          key={p.id}
          onClick={() => onSwitch(p.id)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 flex items-center gap-1 min-h-[40px]"
          style={{ borderColor: p.id === activeId ? "#334155" : "#E5E7EB", color: p.id === activeId ? "#334155" : "#94A3B8" }}
        >
          <UserRound size={12} /> {p.avatarEmoji ? `${p.avatarEmoji} ` : ""}{p.name}
        </button>
      ))}
      {adding ? (
        <div className="flex gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Name"
            className="px-2 py-1 rounded-xl text-xs border-2 border-slate-200 w-24"
          />
          <button onClick={submit} className="text-xs font-bold text-slate-500 px-1 min-h-[40px]">Add</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs font-bold text-slate-400 px-2 py-1.5 flex items-center gap-1 min-h-[40px]">
          <Plus size={12} /> New learner
        </button>
      )}
    </div>
  );
}
