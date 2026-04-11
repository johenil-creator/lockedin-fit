import { useState, useCallback, useEffect, useRef } from "react";
import { getPackLeaderboard } from "../lib/packLeaderboardService";
import type { PackLeaderboardEntry } from "../lib/types";

type UsePackLeaderboardResult = {
  entries: PackLeaderboardEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
};

export function usePackLeaderboard(): UsePackLeaderboardResult {
  const [entries, setEntries] = useState<PackLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const data = await getPackLeaderboard();
    if (!mounted.current) return;
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  return { entries, loading, refresh };
}
