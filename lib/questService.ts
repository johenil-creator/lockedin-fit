import AsyncStorage from "@react-native-async-storage/async-storage";
import { earnFangs } from "./fangsService";
import { currentWeekKey } from "./packUtils";
import type { Quest, QuestProgress, DailyQuestState, WeeklyObjective, QuestMetric } from "./types";

const QUEST_STATE_KEY = "@lockedinfit/quest-state";
const WEEKLY_OBJ_KEY = "@lockedinfit/weekly-objective";

// ── Quest Pools ─────────────────────────────────────────────────────────────

export const DAILY_QUEST_POOL: Quest[] = [
  { id: "d_10sets", title: "Iron Grind", description: "Complete 10 sets", metric: "sets", target: 10, reward: 3, type: "daily" },
  { id: "d_20xp", title: "XP Harvest", description: "Earn 20 XP", metric: "xp", target: 20, reward: 3, type: "daily" },
  { id: "d_workout", title: "Show Up", description: "Complete a workout", metric: "sessions", target: 1, reward: 2, type: "daily" },
  { id: "d_3exercises", title: "Variety Pack", description: "Do 3 different exercises", metric: "exercises", target: 3, reward: 3, type: "daily" },
  { id: "d_streak", title: "Keep the Fire", description: "Maintain your streak", metric: "streak_maintain", target: 1, reward: 2, type: "daily" },
  { id: "d_cardio15", title: "Cardio Kick", description: "Log 15 minutes of cardio", metric: "cardio_minutes", target: 15, reward: 4, type: "daily" },
  { id: "d_5sets", title: "Quick Pump", description: "Complete 5 sets", metric: "sets", target: 5, reward: 2, type: "daily" },
  { id: "d_50xp", title: "XP Rush", description: "Earn 50 XP", metric: "xp", target: 50, reward: 5, type: "daily" },
  { id: "d_2workouts", title: "Double Down", description: "Complete 2 workouts", metric: "sessions", target: 2, reward: 4, type: "daily" },
  { id: "d_5exercises", title: "Full Spread", description: "Do 5 different exercises", metric: "exercises", target: 5, reward: 4, type: "daily" },
  { id: "d_pr", title: "PR Hunter", description: "Attempt a personal record", metric: "pr_attempt", target: 1, reward: 5, type: "daily" },
  { id: "d_15sets", title: "Volume King", description: "Complete 15 sets", metric: "sets", target: 15, reward: 4, type: "daily" },
  { id: "d_30xp", title: "Steady Gains", description: "Earn 30 XP", metric: "xp", target: 30, reward: 3, type: "daily" },
  { id: "d_cardio10", title: "Easy Cardio", description: "Log 10 minutes of cardio", metric: "cardio_minutes", target: 10, reward: 3, type: "daily" },
  { id: "d_cardio30", title: "Endurance Test", description: "Log 30 minutes of cardio", metric: "cardio_minutes", target: 30, reward: 6, type: "daily" },
  { id: "d_20sets", title: "Beast Mode", description: "Complete 20 sets", metric: "sets", target: 20, reward: 5, type: "daily" },
  { id: "d_4exercises", title: "Mixed Training", description: "Do 4 different exercises", metric: "exercises", target: 4, reward: 3, type: "daily" },
  { id: "d_10xp", title: "Quick XP", description: "Earn 10 XP", metric: "xp", target: 10, reward: 2, type: "daily" },
  { id: "d_8sets", title: "Solid Session", description: "Complete 8 sets", metric: "sets", target: 8, reward: 3, type: "daily" },
  { id: "d_cardio20", title: "Cardio Push", description: "Log 20 minutes of cardio", metric: "cardio_minutes", target: 20, reward: 5, type: "daily" },
];

export const WEEKLY_QUEST_POOL: Quest[] = [
  { id: "w_50sets", title: "Weekly Grind", description: "Complete 50 sets this week", metric: "sets", target: 50, reward: 15, type: "weekly" },
  { id: "w_3sessions", title: "Consistency", description: "Complete 3 workouts this week", metric: "sessions", target: 3, reward: 10, type: "weekly" },
  { id: "w_100xp", title: "XP Blitz", description: "Earn 100 XP this week", metric: "xp", target: 100, reward: 12, type: "weekly" },
  { id: "w_5sessions", title: "Dedicated", description: "Complete 5 workouts this week", metric: "sessions", target: 5, reward: 20, type: "weekly" },
  { id: "w_100sets", title: "Iron Week", description: "Complete 100 sets this week", metric: "sets", target: 100, reward: 25, type: "weekly" },
  { id: "w_200xp", title: "XP Marathon", description: "Earn 200 XP this week", metric: "xp", target: 200, reward: 20, type: "weekly" },
  { id: "w_streak5", title: "5-Day Streak", description: "Maintain a 5-day streak", metric: "streak_maintain", target: 5, reward: 18, type: "weekly" },
  { id: "w_15exercises", title: "Exercise Explorer", description: "Do 15 different exercises", metric: "exercises", target: 15, reward: 15, type: "weekly" },
];

// ── Deterministic Hash ──────────────────────────────────────────────────────

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate 3 daily quests deterministically from date.
 * Same date always produces the same 3 quests.
 */
export function generateDailyQuests(date: string): Quest[] {
  const seed = hashString(`daily-${date}`);
  const pool = [...DAILY_QUEST_POOL];
  const selected: Quest[] = [];

  for (let i = 0; i < 3; i++) {
    const idx = (seed + i * 7 + i * i * 3) % pool.length;
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return selected;
}

/**
 * Generate the weekly objective deterministically from week key.
 */
export function generateWeeklyObjective(weekKey: string): Quest {
  const seed = hashString(`weekly-${weekKey}`);
  return WEEKLY_QUEST_POOL[seed % WEEKLY_QUEST_POOL.length];
}

// ── Quest State Management ──────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// currentWeekKey imported from ./packUtils (ISO 8601 week numbering)

/**
 * Get current quest state, auto-regenerating if date has changed.
 */
export async function getQuestState(): Promise<DailyQuestState> {
  const today = todayKey();
  const raw = await AsyncStorage.getItem(QUEST_STATE_KEY);

  if (raw) {
    try {
      const state: DailyQuestState = JSON.parse(raw);
      if (state.date === today) return state;
    } catch (e) {
      if (__DEV__) console.warn("[questService] getQuestState parse failed:", e);
    }
  }

  // Generate fresh quests for today
  const quests = generateDailyQuests(today);
  const state: DailyQuestState = {
    date: today,
    quests: quests.map((q) => ({
      questId: q.id,
      current: 0,
      completed: false,
      claimedAt: null,
    })),
    refreshedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(QUEST_STATE_KEY, JSON.stringify(state));
  return state;
}

/**
 * Get current weekly objective state.
 */
export async function getWeeklyObjectiveState(): Promise<WeeklyObjective> {
  const weekKey = currentWeekKey();
  const raw = await AsyncStorage.getItem(WEEKLY_OBJ_KEY);

  if (raw) {
    try {
      const obj: WeeklyObjective = JSON.parse(raw);
      if (obj.weekKey === weekKey) return obj;
    } catch (e) {
      if (__DEV__) console.warn("[questService] getWeeklyObjectiveState parse failed:", e);
    }
  }

  const quest = generateWeeklyObjective(weekKey);
  const obj: WeeklyObjective = {
    weekKey,
    quest,
    progress: { questId: quest.id, current: 0, completed: false, claimedAt: null },
  };

  await AsyncStorage.setItem(WEEKLY_OBJ_KEY, JSON.stringify(obj));
  return obj;
}

/**
 * Update quest progress for a given metric.
 */
export async function updateQuestProgress(
  metric: QuestMetric,
  amount: number
): Promise<void> {
  // Update daily quests
  const state = await getQuestState();
  const today = todayKey();
  const dailyQuests = generateDailyQuests(today);

  let changed = false;
  for (let i = 0; i < state.quests.length; i++) {
    const quest = dailyQuests.find((q) => q.id === state.quests[i].questId);
    if (!quest || quest.metric !== metric || state.quests[i].completed) continue;

    state.quests[i].current += amount;
    if (state.quests[i].current >= quest.target) {
      state.quests[i].completed = true;
    }
    changed = true;
  }

  if (changed) {
    await AsyncStorage.setItem(QUEST_STATE_KEY, JSON.stringify(state));
  }

  // Update weekly objective
  const weeklyState = await getWeeklyObjectiveState();
  if (weeklyState.quest.metric === metric && !weeklyState.progress.completed) {
    weeklyState.progress.current += amount;
    if (weeklyState.progress.current >= weeklyState.quest.target) {
      weeklyState.progress.completed = true;
    }
    await AsyncStorage.setItem(WEEKLY_OBJ_KEY, JSON.stringify(weeklyState));
  }
}

/**
 * Claim a quest reward — adds Fangs to balance.
 */
export async function claimQuestReward(
  userId: string,
  questId: string
): Promise<number> {
  // Check daily quests
  const state = await getQuestState();
  const today = todayKey();
  const dailyQuests = generateDailyQuests(today);

  const idx = state.quests.findIndex((q) => q.questId === questId);
  if (idx >= 0 && state.quests[idx].completed && !state.quests[idx].claimedAt) {
    const quest = dailyQuests.find((q) => q.id === questId);
    if (quest) {
      state.quests[idx].claimedAt = new Date().toISOString();
      await AsyncStorage.setItem(QUEST_STATE_KEY, JSON.stringify(state));
      await earnFangs(userId, quest.reward, `quest_${questId}`);
      return quest.reward;
    }
  }

  // Check weekly objective
  const weeklyState = await getWeeklyObjectiveState();
  if (
    weeklyState.progress.questId === questId &&
    weeklyState.progress.completed &&
    !weeklyState.progress.claimedAt
  ) {
    weeklyState.progress.claimedAt = new Date().toISOString();
    await AsyncStorage.setItem(WEEKLY_OBJ_KEY, JSON.stringify(weeklyState));
    await earnFangs(userId, weeklyState.quest.reward, `quest_${questId}`);
    return weeklyState.quest.reward;
  }

  return 0;
}
