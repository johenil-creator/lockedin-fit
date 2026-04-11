/**
 * lib/challengeCatalog.ts — Static definitions for monthly calisthenics challenges.
 *
 * Each challenge is a 30-day progression with programmed rest days. Schedules
 * are generated deterministically so we can tune a single ladder formula rather
 * than hand-type 30 rows per challenge.
 */

import type { ChallengeDefinition, ChallengeDay, ChallengeSet } from './types';

// ── Schedule builders ────────────────────────────────────────────────────────

/**
 * Build a single-set-per-day progression.
 * Rest days are placed every `restEvery` days.
 */
function buildSingleSetLadder(opts: {
  start: number;
  step: number;
  totalDays: number;
  restEvery: number;
}): ChallengeDay[] {
  const { start, step, totalDays, restEvery } = opts;
  const days: ChallengeDay[] = [];
  let reps = start;
  for (let d = 1; d <= totalDays; d++) {
    if (d % restEvery === 0) {
      days.push({ dayNumber: d, isRest: true });
      continue;
    }
    days.push({
      dayNumber: d,
      isRest: false,
      sets: [{ reps }],
      totalReps: reps,
    });
    reps += step;
  }
  return days;
}

/**
 * Build a 5-set pyramid ladder (e.g. push-ups):
 * Each workout day has 5 sets shaped base,base+1,base+2,base+1,base.
 * Day base starts at `start` and grows by +1 every workout day.
 */
function buildPyramidLadder(opts: {
  start: number;
  totalDays: number;
  restEvery: number;
}): ChallengeDay[] {
  const { start, totalDays, restEvery } = opts;
  const days: ChallengeDay[] = [];
  let base = start;
  for (let d = 1; d <= totalDays; d++) {
    if (d % restEvery === 0) {
      days.push({ dayNumber: d, isRest: true });
      continue;
    }
    const sets: ChallengeSet[] = [
      { reps: base },
      { reps: base + 1 },
      { reps: base + 2 },
      { reps: base + 1 },
      { reps: base },
    ];
    const total = sets.reduce((s, x) => s + x.reps, 0);
    days.push({ dayNumber: d, isRest: false, sets, totalReps: total });
    base += 1;
  }
  return days;
}

/**
 * Build a timed-hold ladder (plank). Treats `reps` as seconds.
 */
function buildHoldLadder(opts: {
  start: number;
  step: number;
  totalDays: number;
  restEvery: number;
}): ChallengeDay[] {
  return buildSingleSetLadder(opts);
}

// ── Catalog ──────────────────────────────────────────────────────────────────

export const CHALLENGE_CATALOG: ChallengeDefinition[] = [
  {
    id: 'pushup-ladder-30',
    title: '30-Day Push-Up Ladder',
    tagline: 'Build chest, shoulder and tricep strength — no gear needed.',
    description:
      'A classic push-up pyramid. Five sets per workout day climbing from base reps up and back down. Rest every third day.',
    exerciseName: 'Push-Up',
    equipment: 'bodyweight',
    targetMuscles: ['chest', 'triceps', 'shoulders'],
    difficulty: 'Beginner',
    totalDays: 30,
    defaultRestSeconds: 60,
    schedule: buildPyramidLadder({ start: 3, totalDays: 30, restEvery: 3 }),
  },
  {
    id: 'crunch-30',
    title: '30-Day Crunch Challenge',
    tagline: 'Carve a stronger core with progressive daily crunches.',
    description:
      'Knock out the prescribed number of crunches each day. Rest days are every 5th day. Break it into sets if needed — just hit the total.',
    exerciseName: 'Crunch',
    equipment: 'bodyweight',
    targetMuscles: ['abs', 'core'],
    difficulty: 'Beginner',
    totalDays: 30,
    defaultRestSeconds: 45,
    schedule: buildSingleSetLadder({ start: 20, step: 5, totalDays: 30, restEvery: 5 }),
  },
  {
    id: 'glute-bridge-30',
    title: '30-Day Glute Bridge Challenge',
    tagline: 'Fire up your glutes and hamstrings every single day.',
    description:
      'Daily glute bridges with progressive overload. Rest every 4th day. Focus on squeezing the glutes at the top of each rep.',
    exerciseName: 'Glute Bridge',
    equipment: 'bodyweight',
    targetMuscles: ['glutes', 'hamstrings'],
    difficulty: 'Beginner',
    totalDays: 30,
    defaultRestSeconds: 45,
    schedule: buildSingleSetLadder({ start: 30, step: 5, totalDays: 30, restEvery: 4 }),
  },
  {
    id: 'squat-30',
    title: '30-Day Squat Challenge',
    tagline: 'Forge powerful legs and glutes — no weights required.',
    description:
      'Bodyweight squats with steady daily increases. Rest every 4th day. Keep your chest up and drive through the heels.',
    exerciseName: 'Bodyweight Squat',
    equipment: 'bodyweight',
    targetMuscles: ['quadriceps', 'glutes', 'hamstrings'],
    difficulty: 'Beginner',
    totalDays: 30,
    defaultRestSeconds: 45,
    schedule: buildSingleSetLadder({ start: 20, step: 5, totalDays: 30, restEvery: 4 }),
  },
  {
    id: 'burpee-30',
    title: '30-Day Burpee Challenge',
    tagline: 'Full-body conditioning that burns fat fast.',
    description:
      'One of the most brutal bodyweight exercises — a full-body burner. Rest every 3rd day. Start conservative and push the tempo.',
    exerciseName: 'Burpee',
    equipment: 'bodyweight',
    targetMuscles: ['full body', 'chest', 'quads'],
    difficulty: 'Intermediate',
    totalDays: 30,
    defaultRestSeconds: 60,
    schedule: buildSingleSetLadder({ start: 5, step: 2, totalDays: 30, restEvery: 3 }),
  },
  {
    id: 'plank-30',
    title: '30-Day Plank Challenge',
    tagline: 'Build elite core stability in under 5 minutes a day.',
    description:
      'A timed hold progression — reps are seconds. Rest every 5th day. Keep your hips level and brace your core the whole time.',
    exerciseName: 'Plank',
    equipment: 'bodyweight',
    targetMuscles: ['abs', 'core', 'shoulders'],
    difficulty: 'Beginner',
    totalDays: 30,
    defaultRestSeconds: 60,
    schedule: buildHoldLadder({ start: 20, step: 10, totalDays: 30, restEvery: 5 }),
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Look up a challenge definition by id. */
export function getChallengeDefinition(id: string): ChallengeDefinition | null {
  return CHALLENGE_CATALOG.find((c) => c.id === id) ?? null;
}

/** The unit used by a challenge — "seconds" for plank, "reps" otherwise. */
export function challengeUnit(def: ChallengeDefinition): 'reps' | 'seconds' {
  return def.id === 'plank-30' ? 'seconds' : 'reps';
}

/** Total prescribed reps (or seconds) across the whole challenge. */
export function totalChallengeVolume(def: ChallengeDefinition): number {
  return def.schedule.reduce(
    (sum, day) => sum + (day.isRest ? 0 : day.totalReps ?? 0),
    0,
  );
}
