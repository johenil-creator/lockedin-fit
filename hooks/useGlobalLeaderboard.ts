import { useState, useCallback, useEffect } from "react";
import {
  getWeeklyLeaderboard,
  getAllTimeLeaderboard,
} from "../lib/globalLeaderboardService";
import type { GlobalLeaderboardEntry } from "../lib/types";

type Period = "weekly" | "alltime";

type UseGlobalLeaderboardResult = {
  entries: GlobalLeaderboardEntry[];
  period: Period;
  loading: boolean;
  setPeriod: (p: Period) => void;
  refresh: () => Promise<void>;
};

export function useGlobalLeaderboard(): UseGlobalLeaderboardResult {
  const [entries, setEntries] = useState<GlobalLeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<Period>("weekly");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data =
      period === "weekly"
        ? await getWeeklyLeaderboard()
        : await getAllTimeLeaderboard();
    setEntries(data);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, period, loading, setPeriod, refresh };
}
