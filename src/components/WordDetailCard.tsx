"use client";

import { useState } from "react";
import { Volume2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PictoVisual } from "@/components/ui/PictoVisual";
import { MotionClip } from "@/components/ui/MotionClip";
import { RecordPlayback } from "@/components/ui/RecordPlayback";
import { useSettings } from "@/lib/settings-context";
import { speak } from "@/lib/client-helpers";
import { POS_COLORS } from "@/lib/constants";
import type { WordRecord } from "@/lib/types";

export function WordDetailCard({ w, color, showSpellingMode }: { w: WordRecord; color: string; showSpellingMode?: boolean }) {
  const [showSyn, setShowSyn] = useState(false);
  const { speechRate } = useSettings();
  const forms = w.forms || {};
  const hasNounForms = forms.singular || forms.plural;
  const hasVerbForms = forms.present || forms.past || forms.pastParticiple;

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl p-3" style={{ backgroundColor: `${color}15` }}>
            <PictoVisual pictogramId={w.pictogramId} emoji={w.emoji} box="w-16 h-16" emojiSize="text-4xl" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-extrabold text-slate-800">
                {showSpellingMode ? w.word.replace(/[a-zA-Z]/g, "_ ") : w.word}
              </h3>
              {w.pos && <Badge color={POS_COLORS[w.pos] || color}>{w.pos}</Badge>}
              {w.difficulty && <Badge color="#94A3B8">{w.difficulty}</Badge>}
              {w.category && w.category !== "other" && <Badge color="#38BDF8">{w.category}</Badge>}
            </div>
            <p className="text-slate-600 mt-1">{w.meaning}</p>
          </div>
        </div>
        <button
          onClick={() => speak(w.word, speechRate)}
          className="shrink-0 rounded-full p-2.5 min-w-[40px] min-h-[40px]"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Volume2 size={18} />
        </button>
      </div>

      {w.sentenceTip && (
        <p className="mt-3 text-sm italic text-slate-500 bg-slate-50 rounded-xl px-3 py-2">&quot;{w.sentenceTip}&quot;</p>
      )}

      {hasNounForms && (
        <div className="mt-3 flex gap-4 flex-wrap text-sm">
          <div><span className="font-bold text-slate-700">Singular: </span>{forms.singular || w.word}</div>
          <div><span className="font-bold text-slate-700">Plural: </span>{forms.plural || "—"}</div>
        </div>
      )}
      {hasVerbForms && (
        <div className="mt-3 flex gap-4 flex-wrap text-sm">
          <div><span className="font-bold text-slate-700">Present: </span>{forms.present || w.word}</div>
          <div><span className="font-bold text-slate-700">Past: </span>{forms.past || "—"}</div>
          <div><span className="font-bold text-slate-700">Past participle: </span>{forms.pastParticiple || "—"}</div>
        </div>
      )}

      <MotionClip word={w} color={color} />
      <RecordPlayback word={w} />

      <button onClick={() => setShowSyn((s) => !s)} className="mt-3 text-xs font-bold flex items-center gap-1 min-h-[40px]" style={{ color }}>
        {showSyn ? <EyeOff size={14} /> : <Eye size={14} />} {showSyn ? "Hide" : "Show"}{" "}synonyms &amp; antonyms
      </button>
      {showSyn && (
        <div className="mt-2 flex gap-4 flex-wrap text-sm">
          <div><span className="font-bold text-slate-700">Synonyms: </span>{(w.synonyms || []).join(", ") || "—"}</div>
          <div><span className="font-bold text-slate-700">Antonyms: </span>{(w.antonyms || []).join(", ") || "—"}</div>
        </div>
      )}
    </div>
  );
}
