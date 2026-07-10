"use client";

import { useState } from "react";
import { useSettings } from "@/lib/settings-context";
import { EmojiCard } from "./EmojiCard";

/** Prefers a real ARASAAC AAC pictogram; falls back to the animated emoji if none is found. */
export function PictoVisual({
  pictogramId,
  emoji,
  forceStill = false,
  box = "w-24 h-24",
  emojiSize = "text-5xl",
}: {
  pictogramId?: string | null;
  emoji?: string | null;
  forceStill?: boolean;
  box?: string;
  emojiSize?: string;
}) {
  const { reduceMotion } = useSettings();
  const animate = !forceStill && !reduceMotion;
  const [failed, setFailed] = useState(false);
  if (!pictogramId || failed) {
    return <EmojiCard emoji={emoji} forceStill={!animate} size={emojiSize} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- external ARASAAC CDN image, next/image not needed here
    <img
      src={`https://static.arasaac.org/pictograms/${pictogramId}/${pictogramId}_500.png`}
      alt=""
      onError={() => setFailed(true)}
      className={`${box} object-contain select-none`}
      style={animate ? { animation: "bounce-soft 1.8s ease-in-out infinite" } : {}}
    />
  );
}
