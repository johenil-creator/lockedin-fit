import { useState, useCallback, useEffect } from "react";
import {
  getQuestState,
  getWeeklyObjectiveState,
  claimQuestReward,
  generateDailyQuests,
} from "../lib/questService";
import { useAuth } from "../contexts/AuthContext";
import type { Quest, QuestProgress, WeeklyObjective } from "../lib/types";

type DailyQuestWithProgress = Quest & { progress: QuestProgress };

type UseQuestsResult = {
  dailyQuests: DailyQuestWithProgress[];
  weeklyObjective: WeeklyObjective | null;
  loading: boolean;
  claim: (questId: string) => Promise<number>;
  refresh: () => Promise<void>;
};

export function useQuests(): UseQuestsResult {
  const { user } = useAuth();
  const [dailyQuests, setDailyQuests] = useState<DailyQuestWithProgress[]>([]);
  const [weeklyObjective, setWeeklyObjective] = useState<WeeklyObjective | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [state, weekly] = await Promise.all([
      getQuestState(),
      getWeeklyObjectiveState(),
    ]);

    const quests = generateDailyQuests(state.date);
    const merged: DailyQuestWithProgress[] = quests.map((q, i) => ({
      ...q,
      progress: state.quests[i] ?? { questId: q.id, current: 0, completed: false, claimedAt: null },
    }));

    setDailyQuests(merged);
    setWeeklyObjective(weekly);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const claim = useCallback(
    async (questId: string): Promise<number> => {
      if (!user) return 0;
      const reward = await claimQuestReward(user.uid, questId);
      if (reward > 0) await refresh();
      return reward;
    },
    [user, refresh]
  );

  return { dailyQuests, weeklyObjective, loading, claim, refresh };
}
