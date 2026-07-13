"use client";

import { useState } from "react";
import { Check, Loader2, Mail, Settings2, X } from "lucide-react";
import { ToggleRow } from "@/components/ToggleRow";
import { ShareModal } from "@/components/ShareModal";
import { Btn } from "@/components/ui/Btn";
import type { LearnerSettings } from "@/lib/constants";

export function SettingsPanel({
  settings,
  onUpdate,
  onClose,
  hasPin,
  onSetPin,
  learnerId,
  learnerName,
  onRenameLearner,
  isOwner,
}: {
  settings: LearnerSettings;
  onUpdate: (patch: Partial<LearnerSettings>) => void;
  onClose: () => void;
  hasPin: boolean;
  onSetPin: (pin: string | null) => Promise<void>;
  learnerId: string;
  learnerName: string;
  onRenameLearner: (name: string) => Promise<void>;
  isOwner: boolean;
}) {
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [nameInput, setNameInput] = useState(learnerName);
  const [nameError, setNameError] = useState("");
  const [nameBusy, setNameBusy] = useState(false);

  const savePin = async () => {
    if (pinInput && !/^\d{4}$/.test(pinInput)) {
      setPinError("PIN must be exactly 4 digits");
      return;
    }
    setPinError("");
    await onSetPin(pinInput || null);
    setPinInput("");
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError("Name can't be empty");
      return;
    }
    if (trimmed === learnerName) return;
    setNameBusy(true);
    setNameError("");
    try {
      await onRenameLearner(trimmed);
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Couldn't rename — try again.");
    } finally {
      setNameBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2"><Settings2 size={18} /> Settings</h3>
          <button onClick={onClose} className="min-w-[40px] min-h-[40px] flex items-center justify-center"><X size={20} className="text-slate-400" /></button>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700">Learner name</label>
          <div className="flex gap-2 mt-2 items-start">
            <div className="flex-1">
              <input
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setNameError(""); }}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="w-full px-3 py-2 rounded-xl text-sm border-2 border-slate-200"
              />
              {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
            </div>
            <Btn onClick={saveName} disabled={nameBusy || !nameInput.trim() || nameInput.trim() === learnerName} className="px-4 py-2 text-sm">
              {nameBusy ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Save
            </Btn>
          </div>
        </div>

        <ToggleRow label="Reduce motion" desc="Turns off the bouncing animation on pictures." checked={settings.reduceMotion} onChange={(v) => onUpdate({ reduceMotion: v })} />
        <ToggleRow label="Dyslexia-friendly font" desc="Switches to a rounder, easier-to-read typeface." checked={settings.dyslexiaFont} onChange={(v) => onUpdate({ dyslexiaFont: v })} />
        <ToggleRow label="Sound effects" desc="Gentle chime on quiz answers." checked={settings.soundEnabled} onChange={(v) => onUpdate({ soundEnabled: v })} />
        <ToggleRow label="First–Then session plan" desc="Shows a simple 'first this, then that' plan before practice starts. Off by default." checked={settings.firstThenEnabled} onChange={(v) => onUpdate({ firstThenEnabled: v })} />
        <ToggleRow label="Errorless practice" desc="Quizzes never show a red 'wrong' — just gently reveal the answer. Off by default." checked={settings.errorlessMode} onChange={(v) => onUpdate({ errorlessMode: v })} />
        <ToggleRow label="Daily practice reminder" desc="Emails you if this learner hasn't practiced yet today. Off by default." checked={settings.remindersEnabled} onChange={(v) => onUpdate({ remindersEnabled: v })} />

        <div>
          <label className="text-sm font-bold text-slate-700">Text size</label>
          <div className="flex gap-2 mt-2">
            {(["sm", "md", "lg", "xl"] as const).map((s) => (
              <button
                key={s}
                onClick={() => onUpdate({ textSize: s })}
                className="flex-1 py-2 rounded-xl text-sm font-bold border-2 min-h-[40px]"
                style={{ borderColor: settings.textSize === s ? "#FF7A59" : "#E5E7EB", color: settings.textSize === s ? "#FF7A59" : "#475569" }}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700">Speech rate ({settings.speechRate.toFixed(2)}x)</label>
          <input
            type="range"
            min="0.5"
            max="1.2"
            step="0.05"
            value={settings.speechRate}
            onChange={(e) => onUpdate({ speechRate: parseFloat(e.target.value) })}
            className="w-full mt-2"
          />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <label className="text-sm font-bold text-slate-700">Device PIN {hasPin && <span className="text-xs font-normal text-slate-400">(currently set)</span>}</label>
          <p className="text-xs text-slate-400 mb-2">Optional 4-digit PIN so other learners on this device can&apos;t switch into this profile without it. Leave blank and save to remove it.</p>
          <div className="flex gap-2 items-center">
            <input
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="1234"
              inputMode="numeric"
              className="px-3 py-2 rounded-xl text-sm border-2 border-slate-200 w-24"
            />
            <button onClick={savePin} className="text-sm font-bold text-slate-600 px-3 py-2 min-h-[40px]">Save PIN</button>
          </div>
          {pinError && <p className="text-xs text-red-500 mt-1">{pinError}</p>}
        </div>

        {isOwner && (
          <div className="border-t border-slate-100 pt-4">
            <label className="text-sm font-bold text-slate-700">Sharing</label>
            <p className="text-xs text-slate-400 mb-2">Invite another guardian (e.g. a co-parent) to help manage this learner.</p>
            <Btn variant="soft" onClick={() => setShowShare(true)}><Mail size={15} /> Manage sharing</Btn>
          </div>
        )}

        <p className="text-xs text-slate-400">These preferences are saved automatically for this learner and remembered next time, on any device.</p>
      </div>
      {showShare && <ShareModal learnerId={learnerId} onClose={() => setShowShare(false)} />}
    </div>
  );
}
