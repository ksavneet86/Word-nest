"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionEntry, StreakInfo } from "@/lib/types";

const EMPTY_STREAK: StreakInfo = { current: 0, longest: 0 };

export function useSessionLog(learnerId: string | null) {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [streak, setStreak] = useState<StreakInfo>(EMPTY_STREAK);

  const refetch = useCallback(async () => {
    if (!learnerId) return;
    const res = await fetch(`/api/sessions?learnerId=${learnerId}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
      setStreak(data.streak ?? EMPTY_STREAK);
    }
  }, [learnerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/deps-change pattern
    refetch();
  }, [refetch]);

  return { sessions, streak, refetch };
}
