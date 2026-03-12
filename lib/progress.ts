import type { WorkoutSession } from "./types";

export type ExerciseProgress = {
  sessionId: string;
  sessionName: string;
  date: string;
  maxWeight: number;
  totalReps: number;
  completedSets: number;
  /** Epley estimated 1RM from the best set this session */
  estimated1RM: number;
  /** Total volume load (sum of weight × reps for completed sets) */
  volumeLoad: number;
  /** Best single set: weight × reps */
  bestSet: { weight: number; reps: number } | null;
  /** True if this session's estimated 1RM was a new all-time PR at that point */
  isPR: boolean;
};

/** Epley formula: weight × (1 + reps / 30). Returns 0 for bodyweight (0 weight). */
function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function getExerciseProgress(
  workouts: WorkoutSession[],
  exerciseName: string
): ExerciseProgress[] {
  let runningBest1RM = 0;

  const completed = workouts
    .filter((w) => !w.isActive)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return completed
    .map((w) => {
      const ex = w.exercises.find(
        (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
      );
      if (!ex) return null;
      const done = ex.sets.filter((s) => s.completed && !s.isWarmUp);
      const weights = done.map((s) => parseFloat(s.weight) || 0);
      const reps = done.map((s) => parseInt(s.reps) || 0);

      // Best set (highest volume single set)
      let bestSet: { weight: number; reps: number } | null = null;
      let bestSetVolume = 0;
      for (let i = 0; i < done.length; i++) {
        const vol = weights[i] * reps[i];
        if (vol > bestSetVolume) {
          bestSetVolume = vol;
          bestSet = { weight: weights[i], reps: reps[i] };
        }
      }

      // Estimated 1RM from best set
      const estimated1RM = bestSet ? epley1RM(bestSet.weight, bestSet.reps) : 0;

      // Volume load
      const volumeLoad = done.reduce(
        (sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0),
        0
      );

      // PR check
      const isPR = estimated1RM > runningBest1RM && estimated1RM > 0;
      if (estimated1RM > runningBest1RM) runningBest1RM = estimated1RM;

      return {
        sessionId: w.id,
        sessionName: w.name,
        date: w.date,
        maxWeight: weights.length ? Math.max(...weights) : 0,
        totalReps: reps.reduce((a, b) => a + b, 0),
        completedSets: done.length,
        estimated1RM,
        volumeLoad,
        bestSet,
        isPR,
      };
    })
    .filter(Boolean) as ExerciseProgress[];
}

export function getUniqueExerciseNames(workouts: WorkoutSession[]): string[] {
  const names = new Set<string>();
  for (const w of workouts) {
    if (w.isActive) continue;
    for (const ex of w.exercises) names.add(ex.name);
  }
  return Array.from(names).sort();
}

export function getSessionsByDate(
  workouts: WorkoutSession[]
): Record<string, WorkoutSession[]> {
  const map: Record<string, WorkoutSession[]> = {};
  for (const w of workouts) {
    if (w.isActive) continue;
    const dateStr = (w.completedAt ?? w.date).slice(0, 10);
    if (!map[dateStr]) map[dateStr] = [];
    map[dateStr].push(w);
  }
  return map;
}

/** Trend direction based on 3-session rolling average. */
export type TrendDirection = 'up' | 'flat' | 'down';

export function getTrend(data: ExerciseProgress[], metric: 'estimated1RM' | 'volumeLoad' | 'maxWeight'): TrendDirection {
  if (data.length < 3) return 'flat';
  const recent = data.slice(-3);
  const older = data.slice(-6, -3);
  if (older.length === 0) return 'flat';
  const recentAvg = recent.reduce((s, d) => s + d[metric], 0) / recent.length;
  const olderAvg = older.reduce((s, d) => s + d[metric], 0) / older.length;
  const pctChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  if (pctChange > 3) return 'up';
  if (pctChange < -3) return 'down';
  return 'flat';
}

/** Get overview stats across all exercises. */
export function getProgressOverview(workouts: WorkoutSession[]) {
  const completed = workouts.filter(w => !w.isActive && w.completedAt);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const thisWeekSessions = completed.filter(w => new Date(w.completedAt!).getTime() > weekAgo.getTime());

  // Count total PRs across all exercises
  const exerciseNames = getUniqueExerciseNames(workouts);
  let totalPRs = 0;
  let recentPRs: { exercise: string; value: number; date: string }[] = [];

  for (const name of exerciseNames) {
    const progress = getExerciseProgress(workouts, name);
    for (const p of progress) {
      if (p.isPR) {
        totalPRs++;
        recentPRs.push({ exercise: name, value: p.estimated1RM, date: p.date });
      }
    }
  }

  // Sort PRs by date descending, take top 5
  recentPRs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  recentPRs = recentPRs.slice(0, 5);

  // Weekly volume change
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const lastWeekSessions = completed.filter(w => {
    const t = new Date(w.completedAt!).getTime();
    return t > twoWeeksAgo.getTime() && t <= weekAgo.getTime();
  });

  const thisWeekVolume = thisWeekSessions.reduce((sum, w) => {
    return sum + w.exercises.reduce((s, ex) => {
      return s + ex.sets.filter(set => set.completed && !set.isWarmUp).reduce(
        (vs, set) => vs + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0
      );
    }, 0);
  }, 0);

  const lastWeekVolume = lastWeekSessions.reduce((sum, w) => {
    return sum + w.exercises.reduce((s, ex) => {
      return s + ex.sets.filter(set => set.completed && !set.isWarmUp).reduce(
        (vs, set) => vs + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0
      );
    }, 0);
  }, 0);

  const volumeChange = lastWeekVolume > 0
    ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
    : 0;

  return {
    totalSessions: completed.length,
    thisWeekSessions: thisWeekSessions.length,
    totalPRs,
    recentPRs,
    thisWeekVolume,
    volumeChange,
  };
}
