"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { PictoVisual } from "@/components/ui/PictoVisual";
import { MotionClip } from "@/components/ui/MotionClip";
import { EmptyState } from "@/components/EmptyState";
import { useSettings } from "@/lib/settings-context";
import { speak } from "@/lib/client-helpers";
import type { WordRecord } from "@/lib/types";

export function Flashcards({ words, color, section }: { words: WordRecord[]; color: string; section: string }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const { speechRate } = useSettings();
  if (!words.length) return <EmptyState text="Add some words to this list to start flashcards." />;
  const w = words[idx];
  const isSpelling = section === "spelling";

  const next = () => { setFlipped(false); setIdx((i) => (i + 1) % words.length); };
  const prev = () => { setFlipped(false); setIdx((i) => (i - 1 + words.length) % words.length); };

  return (
    <div className="max-w-md mx-auto text-center">
      <p className="text-sm font-bold text-slate-400 mb-3">{idx + 1} / {words.length}</p>
      <div
        onClick={() => setFlipped((f) => !f)}
        className="cursor-pointer rounded-3xl p-10 shadow-md border-2 min-h-[260px] flex flex-col items-center justify-center gap-4"
        style={{ borderColor: `${color}33`, backgroundColor: `${color}0d` }}
      >
        {!flipped ? (
          <>
            <PictoVisual pictogramId={w.pictogramId} emoji={w.emoji} box="w-28 h-28" emojiSize="text-6xl" />
            <h2 className="text-3xl font-extrabold text-slate-800">{isSpelling ? "🔊 Listen & spell" : w.word}</h2>
            {isSpelling && (
              <Btn color={color} onClick={(e) => { e.stopPropagation(); speak(w.word, speechRate); }}>
                <Volume2 size={16} /> Hear the word
              </Btn>
            )}
            <p className="text-xs text-slate-400">Tap card to flip</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold text-slate-800">{w.word}</h2>
            <p className="text-slate-600">{w.meaning}</p>
            {w.forms?.plural && <p className="text-xs text-slate-400">Plural: {w.forms.plural}</p>}
            {w.forms?.past && <p className="text-xs text-slate-400">Past: {w.forms.past} · Past participle: {w.forms.pastParticiple}</p>}
            {w.sentenceTip && <p className="text-sm italic text-slate-400">&quot;{w.sentenceTip}&quot;</p>}
            <MotionClip word={w} color={color} />
          </>
        )}
      </div>
      <div className="flex justify-center gap-3 mt-5">
        <Btn variant="outline" color={color} onClick={prev}><ChevronLeft size={16} /> Prev</Btn>
        <Btn color={color} onClick={next}>Next <ChevronRight size={16} /></Btn>
      </div>
    </div>
  );
}
