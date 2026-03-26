import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../contexts/AuthContext";
import { getCurrentWeekKey, getUserLeague, getLeagueStandings, getLastWeekResult } from "../lib/leagueService";
import { assignUserToLeague } from "../lib/leagueMatchmaker";
import { getFriendIds } from "../lib/xpSync";
import type { League, LeagueStanding, WeekResult } from "../lib/leagueService";
import type { RankLevel } from "../lib/types";

const CACHE_KEY = "@lockedinfit/league-cache";

type CachedLeagueData = {
  weekKey: string;
  league: League;
  standings: LeagueStanding[];
  userPosition: number | null;
  lastWeekResult: WeekResult | null;
  friendIds: string[];
  cachedAt: number;
};

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
  const didHydrate = useRef(false);

  // Step 1: Hydrate from cache instantly
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    AsyncStorage.getItem(CACHE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const cached: CachedLeagueData = JSON.parse(raw);
        const weekKey = getCurrentWeekKey();
        // Only use cache from the current week
        if (cached.weekKey === weekKey) {
          const marked = cached.standings.map((s) => ({
            ...s,
            isCurrentUser: s.userId === user.uid,
            rank: s.userId === user.uid ? rank : s.rank,
          }));
          setLeague(cached.league);
          setStandings(marked);
          setUserPosition(cached.userPosition);
          setLastWeekResult(cached.lastWeekResult);
          setFriendIds(cached.friendIds);
          didHydrate.current = true;
          setLoading(false);
        }
      } catch { /* corrupt cache, ignore */ }
    });
  }, [user, rank]);

  const fetchLeagueData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Only show loading skeleton if we have no cached data
      if (!didHydrate.current) setLoading(true);
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

      // Mark current user, override rank with local XP-derived rank
      const markedStandings = standingsData.map((s) => ({
        ...s,
        isCurrentUser: s.userId === user.uid,
        rank: s.userId === user.uid ? rank : s.rank,
      }));

      const myPos = markedStandings.find((s) => s.isCurrentUser)?.position ?? null;

      setStandings(markedStandings);
      setUserPosition(myPos);
      setLastWeekResult(weekResult);
      setFriendIds(friends);

      // Persist to cache for instant next load
      const cachePayload: CachedLeagueData = {
        weekKey,
        league: currentLeague,
        standings: standingsData,
        userPosition: myPos,
        lastWeekResult: weekResult,
        friendIds: friends,
        cachedAt: Date.now(),
      };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload)).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load league");
    } finally {
      setLoading(false);
    }
  }, [user, rank]);

  // Step 2: Always fetch fresh data (background refresh if cache hit)
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
