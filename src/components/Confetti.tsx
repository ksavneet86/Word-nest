"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings-context";

const PIECES = ["🎉", "⭐", "🎊", "✨", "🏆"];

interface Piece {
  id: number;
  left: number;
  emoji: string;
  delay: number;
}

/** Pass an incrementing `trigger` value to fire a new burst — a fresh number always re-runs the effect, even back-to-back. */
export function Confetti({ trigger }: { trigger: number }) {
  const { reduceMotion } = useSettings();
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (trigger === 0 || reduceMotion) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deriving a burst from a changed trigger prop
    setPieces(
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        emoji: PIECES[Math.floor(Math.random() * PIECES.length)],
        delay: Math.random() * 0.3,
      }))
    );
    const t = setTimeout(() => setPieces([]), 1800);
    return () => clearTimeout(t);
  }, [trigger, reduceMotion]);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute text-2xl"
          style={{ left: `${p.left}%`, top: "-40px", animation: `confetti-fall 1.6s ease-in ${p.delay}s forwards` }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
