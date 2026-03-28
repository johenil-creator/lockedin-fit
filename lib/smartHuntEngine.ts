import { exerciseCatalog } from "../src/data/exerciseCatalog";
import type { ExerciseCatalogEntry, MuscleGroup as CatalogMuscle } from "../src/data/catalogTypes";

// ── Types ────────────────────────────────────────────────────────────────────

export type IntensityTier = "full_send" | "solid_hunt" | "light_prowl" | "den_day";

export type SmartHuntResult = {
  name: string;
  subtitle: string;
  intensityTier: IntensityTier;
  focusLabel: string;
  muscleTargets: { muscle: string; recoveryPct: number }[];
  exercises: { exercise: string; sets: string; reps: string }[];
  reasoning: string;
  exerciseCount: number;
  totalSets: number;
  estimatedMinutes: number;
  readinessScore: number;
};

export type SmartHuntParams = {
  fatigueMap: Record<string, number>;
  readinessScore: number;
  blockType?: "accumulation" | "intensification" | "realization";
  deloadTriggered?: boolean;
  recentSessions?: { completedAt?: string; exercises: { name: string }[] }[];
};

// ── Constants ────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<IntensityTier, string> = {
  full_send: "Full Send",
  solid_hunt: "Solid Hunt",
  light_prowl: "Light Prowl",
  den_day: "Den Day",
};

const VOLUME_SCALE: Record<IntensityTier, number> = {
  full_send: 1.0,
  solid_hunt: 0.85,
  light_prowl: 0.7,
  den_day: 0.5,
};

const EXERCISE_COUNTS: Record<IntensityTier, number> = {
  full_send: 5,
  solid_hunt: 5,
  light_prowl: 4,
  den_day: 3,
};

const COMPOUND_PATTERNS = new Set([
  "squat", "hinge", "horizontal_push", "horizontal_pull",
  "vertical_push", "vertical_pull",
]);

// Split groups using catalog muscle names (no delt sub-groups in catalog)
const PUSH_MUSCLES: CatalogMuscle[] = ["chest", "shoulders", "triceps"];
const PULL_MUSCLES: CatalogMuscle[] = ["back", "lats", "biceps", "traps", "forearms"];
const LEG_MUSCLES: CatalogMuscle[] = ["quads", "hamstrings", "glutes", "calves"];

// Map from lib/types.ts MuscleGroup (16) to catalog MuscleGroup (13)
// The fatigue map has rear_delts/front_delts/side_delts, catalog just has "shoulders"
function normalizeFatigueMap(fm: Record<string, number>): Record<CatalogMuscle, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(fm)) {
    if (k === "rear_delts" || k === "front_delts" || k === "side_delts") {
      // Merge delt sub-groups into shoulders (take max fatigue)
      out["shoulders"] = Math.max(out["shoulders"] ?? 0, v);
    } else {
      out[k] = v;
    }
  }
  return out as Record<CatalogMuscle, number>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTier(readiness: number, deload?: boolean): IntensityTier {
  if (deload) return "den_day";
  if (readiness >= 80) return "full_send";
  if (readiness >= 60) return "solid_hunt";
  if (readiness >= 40) return "light_prowl";
  return "den_day";
}

function getRepRange(
  blockType?: string,
  tier?: IntensityTier,
): { min: number; max: number; mid: string } {
  if (tier === "den_day") return { min: 12, max: 15, mid: "12" };
  switch (blockType) {
    case "intensification": return { min: 4, max: 8, mid: "6" };
    case "realization": return { min: 3, max: 5, mid: "4" };
    default: return { min: 8, max: 12, mid: "10" };
  }
}

function avgRecovery(muscles: CatalogMuscle[], fm: Record<string, number>): number {
  if (muscles.length === 0) return 0;
  const sum = muscles.reduce((s, m) => s + (100 - (fm[m] ?? 0)), 0);
  return sum / muscles.length;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

type SplitGroup = {
  label: string;
  muscles: CatalogMuscle[];
  avgRecovery: number;
};

function pickSplitGroup(fm: Record<string, number>): SplitGroup {
  const groups: SplitGroup[] = [
    { label: "Push Focus", muscles: PUSH_MUSCLES, avgRecovery: avgRecovery(PUSH_MUSCLES, fm) },
    { label: "Pull Focus", muscles: PULL_MUSCLES, avgRecovery: avgRecovery(PULL_MUSCLES, fm) },
    { label: "Leg Focus", muscles: LEG_MUSCLES, avgRecovery: avgRecovery(LEG_MUSCLES, fm) },
  ];
  groups.sort((a, b) => b.avgRecovery - a.avgRecovery);

  // If best group has decent recovery, use it
  if (groups[0].avgRecovery >= 60) return groups[0];

  // Otherwise, find top individual muscles and label as Upper/Full Body
  const allMuscles = [...PUSH_MUSCLES, ...PULL_MUSCLES, ...LEG_MUSCLES];
  const sorted = allMuscles
    .map((m) => ({ muscle: m, recovery: 100 - (fm[m] ?? 0) }))
    .sort((a, b) => b.recovery - a.recovery)
    .slice(0, 4);

  const hasUpper = sorted.some((m) => PUSH_MUSCLES.includes(m.muscle) || PULL_MUSCLES.includes(m.muscle));
  const hasLower = sorted.some((m) => LEG_MUSCLES.includes(m.muscle));

  return {
    label: hasUpper && hasLower ? "Full Body" : "Upper Body",
    muscles: sorted.map((m) => m.muscle),
    avgRecovery: sorted.reduce((s, m) => s + m.recovery, 0) / sorted.length,
  };
}

function selectExercises(
  targetMuscles: CatalogMuscle[],
  count: number,
  exclude: Set<string>,
): ExerciseCatalogEntry[] {
  const targetSet = new Set(targetMuscles);
  const compounds: ExerciseCatalogEntry[] = [];
  const isolations: ExerciseCatalogEntry[] = [];

  for (const entry of exerciseCatalog) {
    if (exclude.has(entry.canonicalName)) continue;
    const hits = entry.primaryMuscles.some((m) => targetSet.has(m));
    if (!hits) continue;
    if (COMPOUND_PATTERNS.has(entry.movementPattern)) {
      compounds.push(entry);
    } else {
      isolations.push(entry);
    }
  }

  // Pick compounds first, then isolations
  const result: ExerciseCatalogEntry[] = [];
  const usedPatterns = new Set<string>();
  const usedMuscles = new Set<string>();

  // Prefer one compound per movement pattern for variety
  for (const entry of compounds) {
    if (result.length >= count) break;
    if (usedPatterns.has(entry.movementPattern)) continue;
    result.push(entry);
    usedPatterns.add(entry.movementPattern);
    entry.primaryMuscles.forEach((m) => usedMuscles.add(m));
  }

  // Fill remaining with isolations targeting uncovered muscles first
  const uncoveredFirst = isolations.sort((a, b) => {
    const aNew = a.primaryMuscles.some((m) => !usedMuscles.has(m)) ? 0 : 1;
    const bNew = b.primaryMuscles.some((m) => !usedMuscles.has(m)) ? 0 : 1;
    return aNew - bNew;
  });

  for (const entry of uncoveredFirst) {
    if (result.length >= count) break;
    if (result.some((r) => r.canonicalName === entry.canonicalName)) continue;
    result.push(entry);
  }

  return result;
}

function getRecentlyTrainedMuscles(
  sessions: { completedAt?: string; exercises: { name: string }[] }[],
): Set<string> {
  const recent = new Set<string>();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const s of sessions) {
    if (!s.completedAt || new Date(s.completedAt).getTime() < cutoff) continue;
    for (const ex of s.exercises) {
      const match = exerciseCatalog.find(
        (c) => c.canonicalName.toLowerCase() === ex.name.toLowerCase(),
      );
      if (match) {
        match.primaryMuscles.forEach((m) => recent.add(m));
      }
    }
  }
  return recent;
}

function buildReasoning(
  split: SplitGroup,
  tier: IntensityTier,
  topTargets: { muscle: string; recoveryPct: number }[],
): string {
  if (tier === "den_day") {
    return "Taking it easy — your body needs recovery. Light movement today.";
  }
  const names = topTargets
    .slice(0, 2)
    .map((t) => capitalize(t.muscle))
    .join(" & ");
  const pct = Math.round(topTargets[0]?.recoveryPct ?? 0);
  if (pct >= 90) return `${names} are ${pct}%+ recovered — ideal targets today.`;
  if (pct >= 70) return `${names} are well recovered — solid session ahead.`;
  return `${names} are the most recovered — smart choice for today.`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function generateSmartHunt(params: SmartHuntParams): SmartHuntResult {
  const {
    fatigueMap,
    readinessScore,
    blockType,
    deloadTriggered,
    recentSessions = [],
  } = params;

  const fm = normalizeFatigueMap(fatigueMap);
  const tier = getTier(readinessScore, deloadTriggered);
  const repRange = getRepRange(blockType, tier);
  const volumeScale = VOLUME_SCALE[tier];
  const exerciseCount = EXERCISE_COUNTS[tier];

  // Penalize recently trained muscles
  const recentMuscles = getRecentlyTrainedMuscles(recentSessions);
  const adjustedFm = { ...fm };
  for (const m of recentMuscles) {
    if (m in adjustedFm) {
      (adjustedFm as Record<string, number>)[m] = Math.min(
        100,
        (adjustedFm as Record<string, number>)[m] + 20,
      );
    }
  }

  // Pick best split group
  const split = pickSplitGroup(adjustedFm);

  // Build muscle targets for display
  const muscleTargets = split.muscles
    .map((m) => ({ muscle: m, recoveryPct: Math.round(100 - (fm[m] ?? 0)) }))
    .sort((a, b) => b.recoveryPct - a.recoveryPct)
    .slice(0, 3);

  // Select exercises
  const exercises = selectExercises(split.muscles, exerciseCount, new Set());

  // Build exercise list with scaled sets
  const baseSets = tier === "den_day" ? 2 : 3;
  const exerciseList = exercises.map((e, i) => {
    // First exercise (compound) gets more sets
    const rawSets = i === 0 ? baseSets + 1 : baseSets;
    const scaledSets = Math.max(2, Math.round(rawSets * volumeScale));
    return {
      exercise: e.canonicalName,
      sets: String(scaledSets),
      reps: repRange.mid,
    };
  });

  const totalSets = exerciseList.reduce((s, e) => s + Number(e.sets), 0);
  const estimatedMinutes = Math.round((totalSets * 2.5) / 5) * 5 || 15;

  return {
    name: "Locke's Hunt",
    subtitle: TIER_LABELS[tier],
    intensityTier: tier,
    focusLabel: split.label,
    muscleTargets,
    exercises: exerciseList,
    reasoning: buildReasoning(split, tier, muscleTargets),
    exerciseCount: exerciseList.length,
    totalSets,
    estimatedMinutes,
    readinessScore,
  };
}

// ── Shuffle ──────────────────────────────────────────────────────────────────

export function shuffleSmartHunt(
  previous: SmartHuntResult,
  params: SmartHuntParams,
): SmartHuntResult {
  const fm = normalizeFatigueMap(params.fatigueMap);
  const tier = getTier(params.readinessScore, params.deloadTriggered);
  const repRange = getRepRange(params.blockType, tier);
  const volumeScale = VOLUME_SCALE[tier];
  const exerciseCount = EXERCISE_COUNTS[tier];

  // Reuse same muscle targets but exclude previous exercises
  const excludeNames = new Set(previous.exercises.map((e) => e.exercise));
  const targetMuscles = previous.muscleTargets.map((t) => t.muscle) as CatalogMuscle[];

  const exercises = selectExercises(targetMuscles, exerciseCount, excludeNames);

  // If we couldn't find enough new exercises, allow some overlap
  if (exercises.length < exerciseCount) {
    const extra = selectExercises(targetMuscles, exerciseCount - exercises.length, new Set());
    for (const e of extra) {
      if (!exercises.some((x) => x.canonicalName === e.canonicalName)) {
        exercises.push(e);
      }
      if (exercises.length >= exerciseCount) break;
    }
  }

  const baseSets = tier === "den_day" ? 2 : 3;
  const exerciseList = exercises.map((e, i) => {
    const rawSets = i === 0 ? baseSets + 1 : baseSets;
    const scaledSets = Math.max(2, Math.round(rawSets * volumeScale));
    return {
      exercise: e.canonicalName,
      sets: String(scaledSets),
      reps: repRange.mid,
    };
  });

  const totalSets = exerciseList.reduce((s, e) => s + Number(e.sets), 0);
  const estimatedMinutes = Math.round((totalSets * 2.5) / 5) * 5 || 15;

  return {
    ...previous,
    exercises: exerciseList,
    exerciseCount: exerciseList.length,
    totalSets,
    estimatedMinutes,
  };
}
