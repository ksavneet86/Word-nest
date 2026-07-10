"use client";

import { useState } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import type { WordRecord } from "@/lib/types";

/** For words hard to show in a still image (quick, slow, shy…), fetch a short looping clip on demand. */
export function MotionClip({ word, color = "#7C6FF0" }: { word: WordRecord; color?: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [triedNone, setTriedNone] = useState(false);
  if (!word.needsMotion) return null;

  const show = async () => {
    setOpen(true);
    if (url || triedNone) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/gif?query=${encodeURIComponent(word.visualQuery || word.word)}`);
      const data = await res.json();
      if (data.url) setUrl(data.url);
      else setTriedNone(true);
    } catch {
      setTriedNone(true);
    }
    setLoading(false);
  };

  return (
    <div className="mt-3">
      {!open ? (
        <button onClick={show} className="text-xs font-bold flex items-center gap-1.5 min-h-[40px]" style={{ color }}>
          <PlayCircle size={15} /> Watch a short clip of &quot;{word.word}&quot;
        </button>
      ) : loading ? (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Loader2 className="animate-spin" size={13} /> Finding a clip…
        </p>
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element -- external Giphy CDN, animated GIF
        <img src={url} alt="" className="rounded-2xl mt-1 max-h-40 border border-slate-100" />
      ) : (
        <p className="text-xs text-slate-400">No clip found for this word — the picture above is the best we have.</p>
      )}
    </div>
  );
}
