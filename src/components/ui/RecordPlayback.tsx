"use client";

import { useRef, useState } from "react";
import { Mic } from "lucide-react";
import type { WordRecord } from "@/lib/types";

/** Lets a child record a short (3s) clip of themselves saying the word and play it back. */
export function RecordPlayback({ word }: { word: WordRecord }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setTimeout(() => {
        if (rec.state === "recording") rec.stop();
        setRecording(false);
      }, 3000);
    } catch {
      setError("Microphone isn't available here.");
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <button
        onClick={start}
        disabled={recording}
        className="text-xs font-bold flex items-center gap-1 text-rose-500 disabled:opacity-50 min-h-[40px]"
      >
        <Mic size={14} /> {recording ? `Recording… (3s)` : "Record my voice"}
      </button>
      {audioUrl && <audio controls src={audioUrl} className="h-8" />}
      {error && <span className="text-xs text-slate-400">{error}</span>}
      <span className="sr-only">{word.word}</span>
    </div>
  );
}
