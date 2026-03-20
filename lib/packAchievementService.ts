import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PackAchievement, PackAchievementId } from "./types";

const STORAGE_KEY = "@lockedinfit/pack-achievements";

// ── Achievement Definitions ──────────────────────────────────────────────────

export const PACK_ACHIEVEMENT_DEFS: PackAchievement[] = [
  { id: "first_challenge",          name: "First Steps",     description: "Complete your first pack challenge",            icon: "\u{1F3AF}", unlockedAt: null },
  { id: "collective_100_workouts",  name: "Century Club",    description: "Pack completes 100 total workouts",             icon: "\u{1F4AF}", unlockedAt: null },
  { id: "collective_500_workouts",  name: "Iron Legion",     description: "Pack completes 500 total workouts",             icon: "\u2694\uFE0F",  unlockedAt: null },
  { id: "all_active_week",          name: "Full House",      description: "Every member works out in the same week",       icon: "\u{1F3E0}", unlockedAt: null },
  { id: "boss_defeated",            name: "Boss Slayer",     description: "Defeat a pack boss",                            icon: "\u{1F5E1}\uFE0F",  unlockedAt: null },
  { id: "5_bosses_defeated",        name: "Raid Leader",     description: "Defeat 5 pack bosses",                          icon: "\u{1F451}", unlockedAt: null },
  { id: "war_won",                  name: "Battle Victor",   description: "Win a pack war",                                icon: "\u{1F3C6}", unlockedAt: null },
  { id: "5_wars_won",               name: "War Machine",     description: "Win 5 pack wars",                               icon: "\u{1F480}", unlockedAt: null },
  { id: "10_member_pack",           name: "Growing Pack",    description: "Reach 10 pack members",                         icon: "\u{1F43A}", unlockedAt: null },
  { id: "pack_level_5",             name: "Established",     description: "Reach pack level 5",                            icon: "\u{1F3DB}\uFE0F",  unlockedAt: null },
  { id: "pack_level_10",            name: "Legendary Pack",  description: "Reach pack level 10",                           icon: "\u2B50",    unlockedAt: null },
];

// ── Stats input for achievement checking ─────────────────────────────────────

type PackAchievementStats = {
  challengesDone: number;
  totalWorkouts: number;
  allActiveThisWeek: boolean;
  bossesDefeated: number;
  warsWon: number;
  memberCount: number;
  packLevel: number;
  currentAchievements: PackAchievementId[];
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Pure function: check which achievements are newly unlocked based on stats.
 * Returns only the IDs that were NOT already in currentAchievements.
 */
export function checkPackAchievements(
  stats: PackAchievementStats
): PackAchievementId[] {
  const newlyUnlocked: PackAchievementId[] = [];
  const already = new Set(stats.currentAchievements);

  const checks: [PackAchievementId, boolean][] = [
    ["first_challenge",          stats.challengesDone >= 1],
    ["collective_100_workouts",  stats.totalWorkouts >= 100],
    ["collective_500_workouts",  stats.totalWorkouts >= 500],
    ["all_active_week",          stats.allActiveThisWeek],
    ["boss_defeated",            stats.bossesDefeated >= 1],
    ["5_bosses_defeated",        stats.bossesDefeated >= 5],
    ["war_won",                  stats.warsWon >= 1],
    ["5_wars_won",               stats.warsWon >= 5],
    ["10_member_pack",           stats.memberCount >= 10],
    ["pack_level_5",             stats.packLevel >= 5],
    ["pack_level_10",            stats.packLevel >= 10],
  ];

  for (const [id, condition] of checks) {
    if (condition && !already.has(id)) {
      newlyUnlocked.push(id);
    }
  }

  return newlyUnlocked;
}

/**
 * Load saved achievements from AsyncStorage.
 */
export async function loadPackAchievements(): Promise<PackAchievement[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [...PACK_ACHIEVEMENT_DEFS];
    return JSON.parse(raw);
  } catch (e) {
    if (__DEV__) console.warn("[packAchievementService] caught:", e);
    return [...PACK_ACHIEVEMENT_DEFS];
  }
}

/**
 * Save achievements to AsyncStorage.
 */
export async function savePackAchievements(
  achievements: PackAchievement[]
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
}

/**
 * Unlock achievements by their IDs and persist the updated list.
 */
export async function unlockAchievements(
  ids: PackAchievementId[]
): Promise<PackAchievement[]> {
  const achievements = await loadPackAchievements();
  const now = new Date().toISOString();

  for (const achievement of achievements) {
    if (ids.includes(achievement.id) && !achievement.unlockedAt) {
      achievement.unlockedAt = now;
    }
  }

  await savePackAchievements(achievements);
  return achievements;
}
