import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getCurrentWeekKey, getUserLeague, getLeagueStandings, getLastWeekResult } from "../lib/leagueService";
import { assignUserToLeague } from "../lib/leagueMatchmaker";
import { getFriendIds } from "../lib/xpSync";
import type { League, LeagueStanding, WeekResult } from "../lib/leagueService";
import type { RankLevel } from "../lib/types";

export type UseLeagueResult = {
  league: League | null;
  standings: LeagueStanding[];
  userPosition: number | null;
  lastWeekResult: WeekResult | null;
  friendIds: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useLeague(rank: RankLevel): UseLeagueResult {
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [lastWeekResult, setLastWeekResult] = useState<WeekResult | null>(null);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeagueData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const weekKey = getCurrentWeekKey();

      // Try to get existing league, or assign to one
      let currentLeague = await getUserLeague(user.uid, weekKey);
      if (!currentLeague) {
        const leagueId = await assignUserToLeague(user.uid, rank, weekKey);
        currentLeague = await getUserLeague(user.uid, weekKey);
        if (!currentLeague) {
          currentLeague = { id: leagueId, weekKey, tier: rank, groupNumber: 1 };
        }
      }

      setLeague(currentLeague);

      // Fetch standings, last week result, and friends in parallel
      const [standingsData, weekResult, friends] = await Promise.all([
        getLeagueStandings(currentLeague.id),
        getLastWeekResult(user.uid),
        getFriendIds(user.uid),
      ]);

      // Mark current user and set position
      const markedStandings = standingsData.map((s) => ({
        ...s,
        isCurrentUser: s.userId === user.uid,
      }));

      const myPos = markedStandings.find((s) => s.isCurrentUser)?.position ?? null;

      setStandings(markedStandings);
      setUserPosition(myPos);
      setLastWeekResult(weekResult);
      setFriendIds(friends);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load league");
    } finally {
      setLoading(false);
    }
  }, [user, rank]);

  useEffect(() => {
    fetchLeagueData();
  }, [fetchLeagueData]);

  return {
    league,
    standings,
    userPosition,
    lastWeekResult,
    friendIds,
    loading,
    error,
    refresh: fetchLeagueData,
  };
}
