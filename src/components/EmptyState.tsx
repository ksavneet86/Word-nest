import { EmojiCard } from "@/components/ui/EmojiCard";

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-16 text-slate-400">
      <EmojiCard emoji="🌱" forceStill />
      <p className="mt-3 font-semibold">{text}</p>
    </div>
  );
}
