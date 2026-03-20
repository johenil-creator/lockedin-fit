import AsyncStorage from "@react-native-async-storage/async-storage";
import { postActivity } from "./activityService";
import type { MilestoneType, RankLevel } from "./types";

// ── Storage Key ────────────────────────────────────────────────────────────

const MILESTONES_KEY = "@lockedinfit/milestones-achieved";

// ── Milestone Definitions ──────────────────────────────────────────────────

type MilestoneDef = {
  type: MilestoneType;
  label: string;
  threshold: number;
};

export const MILESTONE_DEFS: MilestoneDef[] = [
  // Workout count milestones
  { type: "workout_100",    label: "Century Club",        threshold: 100 },
  { type: "workout_250",    label: "Iron Veteran",        threshold: 250 },
  { type: "workout_500",    label: "Legend Status",       threshold: 500 },
  // Rank milestones
  { type: "rank_sentinel",  label: "Sentinel Achieved",   threshold: 0 },
  { type: "rank_alpha",     label: "Alpha Achieved",      threshold: 0 },
  { type: "rank_apex",      label: "Apex Achieved",       threshold: 0 },
  // Streak milestones
  { type: "streak_30",      label: "30-Day Streak",       threshold: 30 },
  { type: "streak_100",     label: "100-Day Streak",      threshold: 100 },
  { type: "streak_365",     label: "365-Day Streak",      threshold: 365 },
  // PR count milestones
  { type: "pr_count_10",    label: "10 Personal Records", threshold: 10 },
  { type: "pr_count_50",    label: "50 Personal Records", threshold: 50 },
];

// ── Rank milestone mapping ─────────────────────────────────────────────────

const RANK_MILESTONE_MAP: Partial<Record<RankLevel, MilestoneType>> = {
  Sentinel:    "rank_sentinel",
  Alpha:       "rank_alpha",
  Apex:        "rank_apex",
  Apex_Bronze: "rank_apex",
  Apex_Silver: "rank_apex",
  Apex_Gold:   "rank_apex",
};

// ── Core Functions ─────────────────────────────────────────────────────────

/**
 * Load the list of already-achieved milestone IDs from storage.
 */
export async function loadAchievedMilestones(): Promise<MilestoneType[]> {
  const raw = await AsyncStorage.getItem(MILESTONES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    if (__DEV__) console.warn("[milestoneService] caught:", e);
    return [];
  }
}

/**
 * Save the achieved milestones list to storage.
 */
export async function saveAchievedMilestones(achieved: MilestoneType[]): Promise<void> {
  await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(achieved));
}

/**
 * Check which milestones are newly earned based on current stats.
 * Returns only milestones that are NOT in the `achieved` list.
 */
export function checkMilestones(
  workoutCount: number,
  streakDays: number,
  prCount: number,
  rank: RankLevel,
  achieved: MilestoneType[]
): MilestoneType[] {
  const newlyEarned: MilestoneType[] = [];

  for (const def of MILESTONE_DEFS) {
    if (achieved.includes(def.type)) continue;

    // Workout milestones
    if (def.type.startsWith("workout_") && workoutCount >= def.threshold) {
      newlyEarned.push(def.type);
      continue;
    }

    // Streak milestones
    if (def.type.startsWith("streak_") && streakDays >= def.threshold) {
      newlyEarned.push(def.type);
      continue;
    }

    // PR count milestones
    if (def.type.startsWith("pr_count_") && prCount >= def.threshold) {
      newlyEarned.push(def.type);
      continue;
    }

    // Rank milestones
    if (def.type.startsWith("rank_")) {
      const rankMilestone = RANK_MILESTONE_MAP[rank];
      if (rankMilestone === def.type) {
        newlyEarned.push(def.type);
      }
    }
  }

  return newlyEarned;
}

/**
 * Post a milestone activity event to the social feed.
 */
export async function postMilestoneActivity(
  userId: string,
  displayName: string,
  milestoneType: MilestoneType,
  value: number
): Promise<void> {
  const def = MILESTONE_DEFS.find((d) => d.type === milestoneType);
  await postActivity(userId, displayName, "milestone", {
    milestoneType,
    label: def?.label ?? milestoneType,
    value,
  });
}

/**
 * Get the label for a milestone type.
 */
export function getMilestoneLabel(type: MilestoneType): string {
  const def = MILESTONE_DEFS.find((d) => d.type === type);
  return def?.label ?? type;
}
