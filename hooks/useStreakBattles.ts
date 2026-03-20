import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getActiveBattles,
  startBattle as startBattleService,
} from "../lib/streakBattleService";
import type { StreakBattle } from "../lib/types";

type UseStreakBattlesResult = {
  battles: StreakBattle[];
  startBattle: (
    opponentId: string,
    opponentName: string
  ) => Promise<StreakBattle | null>;
  activeBattleWith: (opponentId: string) => StreakBattle | undefined;
};

export function useStreakBattles(): UseStreakBattlesResult {
  const { user } = useAuth();
  const [battles, setBattles] = useState<StreakBattle[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const active = await getActiveBattles(user.uid);
      setBattles(active);
    } catch {
      // Non-critical
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const startBattle = useCallback(
    async (opponentId: string, opponentName: string) => {
      if (!user) return null;
      const battle = await startBattleService(
        user.uid,
        user.displayName ?? "Wolf",
        opponentId,
        opponentName
      );
      await load();
      return battle;
    },
    [user, load]
  );

  const activeBattleWith = useCallback(
    (opponentId: string) =>
      battles.find(
        (b) =>
          b.status === "active" &&
          (b.player1Id === opponentId || b.player2Id === opponentId)
      ),
    [battles]
  );

  return { battles, startBattle, activeBattleWith };
}
