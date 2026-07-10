"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionEntry } from "@/lib/types";

export function useSessionLog(learnerId: string | null) {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);

  const refetch = useCallback(async () => {
    if (!learnerId) return;
    const res = await fetch(`/api/sessions?learnerId=${learnerId}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
    }
  }, [learnerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/deps-change pattern
    refetch();
  }, [refetch]);

  return { sessions, refetch };
}
