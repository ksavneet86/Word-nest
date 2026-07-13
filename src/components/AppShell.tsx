"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Award, Loader2, Settings2, Sparkles, Star } from "lucide-react";
import { ProfileBar } from "@/components/ProfileBar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SectionView } from "@/components/SectionView";
import { AvatarShop } from "@/components/AvatarShop";
import { BadgesModal } from "@/components/BadgesModal";
import { SettingsContext } from "@/lib/settings-context";
import { SECTIONS, SETTINGS_DEFAULTS, ZOOM_LEVELS, type SectionKey, type LearnerSettings } from "@/lib/constants";
import type { LearnerSummary } from "@/lib/types";

const ACTIVE_LEARNER_KEY = "wordnest-active-learner";

export function AppShell() {
  const [learners, setLearners] = useState<LearnerSummary[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<LearnerSettings>(SETTINGS_DEFAULTS);
  const [hasPin, setHasPin] = useState(false);
  const [isOwner, setIsOwner] = useState(true);
  const [points, setPoints] = useState(0);
  const [unlockedAvatars, setUnlockedAvatars] = useState<string[]>([]);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const [section, setSection] = useState<SectionKey>("vocab");
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarShop, setShowAvatarShop] = useState(false);
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/learners");
      const data = await res.json();
      let list: LearnerSummary[] = data.learners;
      if (list.length === 0) {
        const created = await fetch("/api/learners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Learner 1" }),
        }).then((r) => r.json());
        list = [{ id: created.learner.id, name: created.learner.name, avatarEmoji: null, hasPin: false }];
      }
      setLearners(list);
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_LEARNER_KEY) : null;
      const initial = stored && list.some((l) => l.id === stored) ? stored : list[0].id;
      setActiveId(initial);
    })();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    window.localStorage.setItem(ACTIVE_LEARNER_KEY, activeId);
    fetch(`/api/learners/${activeId}`)
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.learner.settings);
        setHasPin(data.learner.hasPin);
        setIsOwner(data.learner.isOwner);
        setPoints(data.learner.points);
        setUnlockedAvatars(data.learner.unlockedAvatars);
        setAvatarEmoji(data.learner.avatarEmoji);
      });
  }, [activeId]);

  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", String(ZOOM_LEVELS[settings.textSize]));
    document.body.classList.toggle("dyslexia-font", settings.dyslexiaFont);
  }, [settings.textSize, settings.dyslexiaFont]);

  const updateSettings = async (patch: Partial<LearnerSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (!activeId) return;
    await fetch(`/api/learners/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: patch }),
    });
  };

  const setPin = async (pin: string | null) => {
    if (!activeId) return;
    const res = await fetch(`/api/learners/${activeId}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    setHasPin(data.hasPin);
  };

  const renameLearner = async (name: string) => {
    if (!activeId) return;
    const res = await fetch(`/api/learners/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Couldn't rename learner");
    }
    setLearners((prev) => prev?.map((l) => (l.id === activeId ? { ...l, name } : l)) ?? prev);
  };

  const addLearner = async (name: string) => {
    const res = await fetch("/api/learners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setLearners((prev) => [...(prev || []), { id: data.learner.id, name: data.learner.name, avatarEmoji: null, hasPin: false }]);
    setActiveId(data.learner.id);
  };

  const openAvatarShop = async () => {
    if (activeId) {
      const data = await fetch(`/api/learners/${activeId}`).then((r) => r.json());
      setPoints(data.learner.points);
      setUnlockedAvatars(data.learner.unlockedAvatars);
      setAvatarEmoji(data.learner.avatarEmoji);
    }
    setShowAvatarShop(true);
  };

  if (!learners || !activeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FAFC]">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <SettingsContext.Provider value={settings}>
      <div className="min-h-screen bg-[#F7FAFC]">
        <header className="px-5 pt-6 pb-4 bg-white border-b border-slate-100 sticky top-0 z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-2xl bg-slate-800 p-2"><Sparkles size={18} className="text-white" /></div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-800">WordNest</h1>
                <p className="text-xs text-slate-400">Vocabulary, spelling &amp; word-play for young learners</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openAvatarShop} className="rounded-full px-3 py-2 bg-amber-50 text-amber-600 text-sm font-bold flex items-center gap-1 min-h-[40px]">
                <Star size={15} /> {points}
              </button>
              <button onClick={() => setShowBadges(true)} className="rounded-full p-2.5 bg-amber-50 text-amber-500 min-w-[40px] min-h-[40px]"><Award size={18} /></button>
              <button onClick={() => setShowSettings(true)} className="rounded-full p-2.5 bg-slate-100 text-slate-500 min-w-[40px] min-h-[40px]"><Settings2 size={18} /></button>
              <UserButton />
            </div>
          </div>
          <ProfileBar learners={learners} activeId={activeId} onSwitch={setActiveId} onAdd={addLearner} />
        </header>

        <nav className="px-5 py-3 flex gap-2 overflow-x-auto bg-white border-b border-slate-100">
          {(Object.entries(SECTIONS) as [SectionKey, (typeof SECTIONS)[SectionKey]][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold transition-all min-h-[40px]"
              style={section === key ? { backgroundColor: meta.color, color: "white" } : { backgroundColor: meta.soft, color: meta.color }}
            >
              <meta.icon size={15} /> {meta.label}
            </button>
          ))}
        </nav>

        <main className="px-5 py-6 max-w-3xl mx-auto">
          <SectionView
            key={`${activeId}-${section}`}
            sectionKey={section}
            learnerId={activeId}
            learnerName={learners.find((l) => l.id === activeId)?.name ?? "Learner"}
          />
        </main>

        <footer className="text-center text-[11px] text-slate-300 pb-6 pt-2">
          Picture symbols by ARASAAC (arasaac.org), CC BY-NC-SA · Government of Aragón
        </footer>

        {showSettings && (
          <SettingsPanel
            settings={settings}
            onUpdate={updateSettings}
            onClose={() => setShowSettings(false)}
            hasPin={hasPin}
            onSetPin={setPin}
            learnerId={activeId}
            learnerName={learners.find((l) => l.id === activeId)?.name ?? ""}
            onRenameLearner={renameLearner}
            isOwner={isOwner}
          />
        )}

        {showAvatarShop && (
          <AvatarShop
            learnerId={activeId}
            points={points}
            unlockedAvatars={unlockedAvatars}
            currentAvatar={avatarEmoji}
            onClose={() => setShowAvatarShop(false)}
            onChange={(newPoints, newUnlocked, newAvatar) => {
              setPoints(newPoints);
              setUnlockedAvatars(newUnlocked);
              setAvatarEmoji(newAvatar);
              setLearners((prev) => prev?.map((l) => (l.id === activeId ? { ...l, avatarEmoji: newAvatar } : l)) ?? prev);
            }}
          />
        )}

        {showBadges && <BadgesModal learnerId={activeId} onClose={() => setShowBadges(false)} />}
      </div>
    </SettingsContext.Provider>
  );
}
