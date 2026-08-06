"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Floating button that appears once the page is scrolled down, and smooth-scrolls back to top. */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-5 z-40 rounded-full p-3.5 shadow-lg bg-slate-800 text-white min-w-[48px] min-h-[48px] flex items-center justify-center"
      aria-label="Scroll to top"
      title="Back to top"
    >
      <ArrowUp size={20} />
    </button>
  );
}
