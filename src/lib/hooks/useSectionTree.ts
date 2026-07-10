"use client";

import { useCallback, useEffect, useState } from "react";
import type { SectionTree } from "@/lib/types";

export function useSectionTree(learnerId: string | null, section: string) {
  const [tree, setTree] = useState<SectionTree>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!learnerId) return;
    setLoading(true);
    const res = await fetch(`/api/tree?learnerId=${learnerId}&section=${section}`);
    if (res.ok) {
      const data = await res.json();
      setTree(data.tree);
    }
    setLoading(false);
  }, [learnerId, section]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/deps-change pattern
    refetch();
  }, [refetch]);

  return { tree, loading, refetch };
}
