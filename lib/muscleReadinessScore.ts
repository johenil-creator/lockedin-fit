import type { MuscleGroup, MuscleFatigueMap } from './types';

// ── Region Classification ──────────────────────────────────────────────

const UPPER_MUSCLES: readonly MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'forearms', 'traps', 'lats', 'rear_delts', 'front_delts', 'side_delts',
] as const;

const LOWER_MUSCLES: readonly MuscleGroup[] = [
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
] as const;

// ── Score Thresholds ───────────────────────────────────────────────────

const THRESHOLDS: readonly { min: number; label: string; color: string }[] = [
  { min: 80, label: 'Fresh',     color: '#4CAF50' },
  { min: 60, label: 'Ready',     color: '#00E85C' },
  { min: 40, label: 'Moderate',  color: '#FFEB3B' },
  { min: 20, label: 'Fatigued',  color: '#FF9800' },
  { min: 0,  label: 'Exhausted', color: '#F44336' },
] as const;

// ── Types ──────────────────────────────────────────────────────────────

export type RegionScore = {
  score: number;
  label: string;
  color: string;
  muscleCount: number;
  avgFatigue: number;
};

export type MuscleReadinessResult = {
  upper: RegionScore;
  lower: RegionScore;
  total: RegionScore;
};

// ── Helpers ────────────────────────────────────────────────────────────

export function getRegionScore(fatigue: number): { label: string; color: string } {
  const score = Math.max(0, Math.min(100, 100 - fatigue));
  for (const t of THRESHOLDS) {
    if (score >= t.min) return { label: t.label, color: t.color };
  }
  return { label: 'Exhausted', color: '#F44336' };
}

function computeRegion(
  muscles: readonly MuscleGroup[],
  fatigueMap: MuscleFatigueMap,
): RegionScore {
  let sum = 0;
  for (const m of muscles) {
    sum += fatigueMap[m];
  }
  const avgFatigue = sum / muscles.length;
  const score = Math.max(0, Math.min(100, 100 - avgFatigue));
  const { label, color } = getRegionScore(avgFatigue);
  return { score, label, color, muscleCount: muscles.length, avgFatigue };
}

// ── Main ───────────────────────────────────────────────────────────────

export function computeMuscleReadiness(
  fatigueMap: MuscleFatigueMap,
): MuscleReadinessResult {
  const upper = computeRegion(UPPER_MUSCLES, fatigueMap);
  const lower = computeRegion(LOWER_MUSCLES, fatigueMap);

  // Total across all muscles
  const allMuscles = [...UPPER_MUSCLES, ...LOWER_MUSCLES];
  const total = computeRegion(allMuscles, fatigueMap);

  return { upper, lower, total };
}
