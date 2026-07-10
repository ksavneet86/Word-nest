"use client";

import { useSettings } from "@/lib/settings-context";
import { EMOJI_FALLBACK } from "@/lib/constants";

export function EmojiCard({
  emoji,
  forceStill = false,
  size = "text-6xl",
}: {
  emoji?: string | null;
  forceStill?: boolean;
  size?: string;
}) {
  const { reduceMotion } = useSettings();
  const animate = !forceStill && !reduceMotion;
  return (
    <div
      className={`${size} inline-block select-none`}
      style={animate ? { animation: "bounce-soft 1.8s ease-in-out infinite" } : {}}
    >
      {emoji || EMOJI_FALLBACK}
    </div>
  );
}
