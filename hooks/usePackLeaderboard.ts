import { useState, useCallback, useEffect } from "react";
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

  const refresh = useCallback(async () => {
    const data = await getPackLeaderboard();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, refresh };
}
