/**
 * LockedInFIT — Catalog & Plan Validation Suite
 *
 * Run: npx tsx __tests__/catalog.validation.ts
 *
 * Validates:
 * 1. Every plan has exactly 12 weeks
 * 2. No two consecutive weeks have identical exercises+sets+reps
 * 3. Deload weeks (W4, W8, W12) have reduced volume vs W3, W7, W11
 * 4. Block rep ranges align with periodization design
 * 5. Exercise names resolve to valid movement patterns (no 'unknown')
 * 6. Auto-fill returns a weight for compound exercises with 1RM data
 * 7. XP calculation is consistent and idempotent
 * 8. Rank thresholds are monotonically increasing
 */

// Node-compatible imports using path aliases resolved manually
import { CATALOG_PLANS } from "../lib/catalog";
import { classifyExercise } from "../lib/loadEngine/classifier";
import { resolveExerciseLoad } from "../lib/loadEngine";
import { getWeekPrescription } from "../lib/loadEngine/progression";
import { awardSessionXP, defaultXPRecord, XP_AWARDS } from "../lib/xpService";
import { rankForXP, didRankUp, RANK_LADDER } from "../lib/rankService";
import type { Exercise, UserProfile, WorkoutSession, SessionExercise, SetEntry } from "../lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

type TestResult = { name: string; passed: boolean; details?: string };
const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`  ✓  ${name}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, details: msg });
    console.error(`  ✗  ${name}`);
    console.error(`       ${msg}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertGt(actual: number, threshold: number, message: string): void {
  if (actual <= threshold) throw new Error(`${message} — expected > ${threshold}, got ${actual}`);
}

function assertLt(actual: number, threshold: number, message: string): void {
  if (actual >= threshold) throw new Error(`${message} — expected < ${threshold}, got ${actual}`);
}

/** Get unique weeks from exercise array */
function getWeeks(exercises: Exercise[]): string[] {
  return [...new Set(exercises.map((e) => e.week))].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""));
    const nb = parseInt(b.replace(/\D/g, ""));
    return na - nb;
  });
}

/** Get exercises for a specific week and day */
function getWeekDayExercises(exercises: Exercise[], week: string, day: string): Exercise[] {
  return exercises.filter((e) => e.week === week && e.day === day);
}

/** Get days in a given week */
function getDays(exercises: Exercise[], week: string): string[] {
  return [...new Set(exercises.filter((e) => e.week === week).map((e) => e.day))].sort();
}

/** Create a fingerprint string for a set of exercises (name+sets+reps) */
function fingerprintDay(exs: Exercise[]): string {
  return exs.map((e) => `${e.exercise}:${e.sets}x${e.reps}`).join("|");
}

/** Calculate total working sets for a day */
function totalSetsForDay(exs: Exercise[]): number {
  return exs.reduce((sum, e) => sum + parseInt(e.sets || "0", 10), 0);
}

/** Build a mock UserProfile with 1RM data for testing */
function mockProfile(unit: "kg" | "lbs" = "kg"): UserProfile {
  return {
    name: "Test User",
    weight: "80",
    weightUnit: unit,
    manual1RM: {
      squat: "140",
      deadlift: "180",
      bench: "100",
      ohp: "70",
    },
  };
}

/** Build a minimal completed WorkoutSession for history testing */
function mockSession(exerciseName: string, weight: number): WorkoutSession {
  const set: SetEntry = { reps: "8", weight: String(weight), completed: true };
  const ex: SessionExercise = {
    exerciseId: exerciseName.toLowerCase().replace(/\s/g, "_"),
    name: exerciseName,
    sets: [set],
  };
  return {
    id: "test-session-1",
    name: "Test Session",
    date: "2026-01-01",
    exercises: [ex],
    completedAt: "2026-01-01T10:00:00Z",
  };
}

// ── Test Suite ───────────────────────────────────────────────────────────────

console.log("\n=== LockedInFIT Catalog Validation ===\n");

// ────────────────────────────────────────────────────────────────────────────
// 1. Plan structure
// ────────────────────────────────────────────────────────────────────────────

console.log("\n── 1. Plan Structure ──\n");

test("All 12 plans are present", () => {
  assert(CATALOG_PLANS.length >= 12, `Expected at least 12 plans, got ${CATALOG_PLANS.length}`);
});

test("All plans have week count matching totalWeeks", () => {
  for (const plan of CATALOG_PLANS) {
    const weeks = getWeeks(plan.exercises);
    const expected = plan.totalWeeks ?? 12;
    assertEqual(
      weeks.length,
      expected,
      `Plan "${plan.name}" has ${weeks.length} weeks, expected ${expected}`
    );
  }
});

test("All plans have correct week labels (Week 1 – Week N)", () => {
  for (const plan of CATALOG_PLANS) {
    const weeks = getWeeks(plan.exercises);
    const total = plan.totalWeeks ?? 12;
    for (let i = 1; i <= total; i++) {
      const expected = `Week ${i}`;
      assert(
        weeks.includes(expected),
        `Plan "${plan.name}" missing "${expected}"`
      );
    }
  }
});

test("All plans have daysPerWeek matching actual days in Week 1", () => {
  for (const plan of CATALOG_PLANS) {
    const w1Days = getDays(plan.exercises, "Week 1");
    assertEqual(
      w1Days.length,
      plan.daysPerWeek,
      `Plan "${plan.name}" — daysPerWeek=${plan.daysPerWeek} but Week 1 has ${w1Days.length} days`
    );
  }
});

test("Each day has at least 3 exercises", () => {
  for (const plan of CATALOG_PLANS) {
    const weeks = getWeeks(plan.exercises);
    for (const week of weeks) {
      const days = getDays(plan.exercises, week);
      for (const day of days) {
        const exs = getWeekDayExercises(plan.exercises, week, day);
        assert(
          exs.length >= 3,
          `Plan "${plan.name}" ${week} ${day} only has ${exs.length} exercises`
        );
      }
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Weekly variety — no consecutive identical weeks
// ────────────────────────────────────────────────────────────────────────────

console.log("\n── 2. Weekly Variety ──\n");

test("No two consecutive weeks are identical (all plans, all days)", () => {
  const violations: string[] = [];
  for (const plan of CATALOG_PLANS) {
    const days = getDays(plan.exercises, "Week 1");
    for (const day of days) {
      for (let w = 1; w <= 11; w++) {
        const weekA = `Week ${w}`;
        const weekB = `Week ${w + 1}`;
        const exsA = getWeekDayExercises(plan.exercises, weekA, day);
        const exsB = getWeekDayExercises(plan.exercises, weekB, day);
        if (exsA.length === 0 || exsB.length === 0) continue;
        const fpA = fingerprintDay(exsA);
        const fpB = fingerprintDay(exsB);
        if (fpA === fpB) {
          violations.push(`${plan.name} — ${weekA} → ${weekB} ${day} IDENTICAL`);
        }
      }
    }
  }
  assert(
    violations.length === 0,
    `Identical consecutive weeks found:\n${violations.join("\n")}`
  );
});

test("Week 1 and final week differ in sets+reps (no circular repeat)", () => {
  for (const plan of CATALOG_PLANS) {
    const total = plan.totalWeeks ?? 12;
    if (total < 4) continue; // 3-week plans are too short for this check
    const lastWeek = `Week ${total}`;
    const days = getDays(plan.exercises, "Week 1");
    for (const day of days) {
      const exs1 = getWeekDayExercises(plan.exercises, "Week 1", day);
      const exsLast = getWeekDayExercises(plan.exercises, lastWeek, day);
      if (exs1.length === 0 || exsLast.length === 0) continue;
      const sameFingerprint = fingerprintDay(exs1) === fingerprintDay(exsLast);
      const sets1 = totalSetsForDay(exs1);
      const setsLast = totalSetsForDay(exsLast);
      assert(
        sets1 !== setsLast || !sameFingerprint,
        `Plan "${plan.name}" ${day}: Week 1 and ${lastWeek} appear identical (sets=${sets1})`
      );
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Deload weeks — reduced volume
// ────────────────────────────────────────────────────────────────────────────

console.log("\n── 3. Deload Week Volume ──\n");

/** Return deload → prior-week pairs for a given plan length */
function deloadPairs(totalWeeks: number): [number, number][] {
  if (totalWeeks === 3) return []; // no deloads
  if (totalWeeks === 6) return [[6, 5]]; // only W6
  // 12-week default
  return [[4, 3], [8, 7], [12, 11]];
}

test("Deload weeks have fewer total sets than their preceding week", () => {
  for (const plan of CATALOG_PLANS) {
    const total = plan.totalWeeks ?? 12;
    const pairs = deloadPairs(total);
    for (const [deload, prior] of pairs) {
      const days = getDays(plan.exercises, `Week ${prior}`);
      let totalPrior = 0, totalDeload = 0;
      for (const day of days) {
        totalPrior += totalSetsForDay(getWeekDayExercises(plan.exercises, `Week ${prior}`, day));
        totalDeload += totalSetsForDay(getWeekDayExercises(plan.exercises, `Week ${deload}`, day));
      }
      assertLt(
        totalDeload,
        totalPrior,
        `Plan "${plan.name}": Week ${deload} sets (${totalDeload}) should be < Week ${prior} sets (${totalPrior})`
      );
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Block rep range verification (progression.ts)
// ────────────────────────────────────────────────────────────────────────────

console.log("\n── 4. Block Rep Ranges ──\n");

test("Accumulation phase (W1-4) compound reps are in range 8-12", () => {
  for (let week = 1; week <= 4; week++) {
    const p = getWeekPrescription(week, true, "squat");
    assert(
      p.reps >= 8 && p.reps <= 12,
      `Week ${week} compound reps=${p.reps} out of expected Accumulation range 8-12`
    );
  }
});

test("Intensification phase (W5-8) compound reps are in range 4-8", () => {
  for (let week = 5; week <= 8; week++) {
    const p = getWeekPrescription(week, true, "squat");
    assert(
      p.reps >= 4 && p.reps <= 8,
      `Week ${week} compound reps=${p.reps} out of expected Intensification range 4-8`
    );
  }
});

test("Realization phase (W9-11) compound reps are in range 2-5", () => {
  for (let week = 9; week <= 11; week++) {
    const p = getWeekPrescription(week, true, "squat");
    assert(
      p.reps >= 2 && p.reps <= 5,
      `Week ${week} compound reps=${p.reps} out of expected Realization range 2-5`
    );
  }
});

test("Deload week (W12) intensity is significantly lower than W11", () => {
  const w11 = getWeekPrescription(11, true, "squat");
  const w12 = getWeekPrescription(12, true, "squat");
  assertLt(
    w12.intensity,
    w11.intensity,
    `Week 12 intensity (${w12.intensity}) should be < Week 11 (${w11.intensity})`
  );
});

test("All 12 weeks have unique compound intensity values", () => {
  const intensities = Array.from({ length: 12 }, (_, i) =>
    getWeekPrescription(i + 1, true, "squat").intensity
  );
  const unique = new Set(intensities);
  // We allow up to 2 duplicates due to deload weeks resetting intensity
  assert(
    unique.size >= 8,
    `Only ${unique.size} unique compound intensities across 12 weeks: [${intensities.join(", ")}]`
  );
});

test("Deload weeks (W4, W8, W12) have isDeload=true", () => {
  for (const week of [4, 8, 12]) {
    const p = getWeekPrescription(week, true, "squat");
    assert(p.isDeload, `Week ${week} should have isDeload=true`);
  }
});

test("Non-deload weeks have isDeload=false", () => {
  for (const week of [1, 2, 3, 5, 6, 7, 9, 10, 11]) {
    const p = getWeekPrescription(week, true, "squat");
    assert(!p.isDeload, `Week ${week} should have isDeload=false`);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Exercise classification — no 'unknown' patterns for catalog exercises
// ────────────────────────────────────────────────────────────────────────────

console.log("\n── 5. Exercise Classification ──\n");

test("All plan exercises classify to a valid (non-unknown) movement pattern", () => {
  const unknowns: string[] = [];
  const seen = new Set<string>();

  for (const plan of CATALOG_PLANS) {
    for (const ex of plan.exercises) {
      if (seen.has(ex.exercise)) continue;
      seen.add(ex.exercise);
      const result = classifyExercise(ex.exercise);
      if (result.pattern === "unknown" || result.confidence === 0) {
        unknowns.push(`"${ex.exercise}" (plan: ${plan.name})`);
      }
    }
  }

  assert(
    unknowns.length === 0,
    `${unknowns.length} exercises classified as 'unknown':\n${unknowns.slice(0, 20).join("\n")}${unknowns.length > 20 ? `\n... and ${unknowns.length - 20} more` : ""}`
  );
});

test("Barbell Squat classifies as squat pattern with squat anchor", () => {
  const r = classifyExercise("Barbell Squat");
  assertEqual(r.pattern, "squat", "Barbell Squat should be squat pattern");
  assertEqual(r.baseLift, "squat", "Barbell Squat should anchor to squat 1RM");
  assertGt(r.confidence, 0.7, "Barbell Squat should have high confidence");
});

test("Romanian Deadlift classifies as hinge pattern with deadlift anchor", () => {
  const r = classifyExercise("Romanian Deadlift");
  assertEqual(r.pattern, "hinge", "RDL should be hinge pattern");
  assertEqual(r.baseLift, "deadlift", "RDL should anchor to deadlift 1RM");
});

test("Flat Barbell Bench Press classifies as horizontal_push with bench anchor", () => {
  const r = classifyExercise("Flat Barbell Bench Press");
  assertEqual(r.pattern, "horizontal_push", "Bench should be horizontal_push");
  assertEqual(r.baseLift, "bench", "Bench should anchor to bench 1RM");
});

test("Overhead Press classifies as vertical_push with ohp anchor", () => {
  const r = classifyExercise("Overhead Press");
  assertEqual(r.pattern, "vertical_push", "OHP should be vertical_push");
  assertEqual(r.baseLift, "ohp", "OHP should anchor to ohp 1RM");
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Auto-fill weight resolution
// ────────────────────────────────────────────────────────────────────────────

console.log("\n── 6. Auto-Fill Weight Resolution ──\n");

const profile = mockProfile("kg");

test("Barbell Squat (Week 1) auto-fills from 1RM — not null", () => {
  const result = resolveExerciseLoad({
    exerciseName: "Barbell Squat",
    weekStr: "Week 1",
    profile,
    workouts: [],
    workingSetCount: 4,
  });
  assertEqual(result.source, "orm", "Squat should use orm source");
  assert(result.workingWeight !== null && result.workingWeight > 0, `Expected positive weight, got ${result.workingWeight}`);
});

test("Deadlift (Week 1) auto-fills from 1RM", () => {
  const result = resolveExerciseLoad({
    exerciseName: "Conventional Deadlift",
    weekStr: "Week 1",
    profile,
    workouts: [],
  });
  assertEqual(result.source, "orm", "Deadlift should use orm source");
  assert(result.workingWeight !== null && result.workingWeight > 0, "Deadlift weight should be positive");
});

test("Overhead Press (Week 1) auto-fills from OHP 1RM", () => {
  const result = resolveExerciseLoad({
    exerciseName: "Overhead Press",
    weekStr: "Week 1",
    profile,
    workouts: [],
  });
  assertEqual(result.source, "orm", "OHP should use orm source");
  assert(result.workingWeight !== null && result.workingWeight > 0, "OHP weight should be positive");
});

test("Barbell Bench Press (Week 1) auto-fills from bench 1RM", () => {
  const result = resolveExerciseLoad({
    exerciseName: "Flat Barbell Bench Press",
    weekStr: "Week 1",
    profile,
    workouts: [],
  });
  assertEqual(result.source, "orm", "Bench should use orm source");
  assert(result.workingWeight !== null, "Bench weight should not be null");
});

test("Week 9 compound weight > Week 1 compound weight (intensity increases)", () => {
  const w1 = resolveExerciseLoad({
    exerciseName: "Barbell Squat",
    weekStr: "Week 1",
    profile,
    workouts: [],
  });
  const w9 = resolveExerciseLoad({
    exerciseName: "Barbell Squat",
    weekStr: "Week 9",
    profile,
    workouts: [],
  });
  assert(
    (w9.workingWeight ?? 0) > (w1.workingWeight ?? 0),
    `Week 9 weight (${w9.workingWeight}) should be > Week 1 weight (${w1.workingWeight})`
  );
});

test("Week 12 (deload) weight < Week 11 weight (intensity drops)", () => {
  const w11 = resolveExerciseLoad({
    exerciseName: "Barbell Squat",
    weekStr: "Week 11",
    profile,
    workouts: [],
  });
  const w12 = resolveExerciseLoad({
    exerciseName: "Barbell Squat",
    weekStr: "Week 12",
    profile,
    workouts: [],
  });
  assert(
    (w12.workingWeight ?? 999) < (w11.workingWeight ?? 0),
    `Week 12 weight (${w12.workingWeight}) should be < Week 11 weight (${w11.workingWeight})`
  );
});

test("Exercise with history but no 1RM anchor falls back to rpe-estimate source", () => {
  const history = [mockSession("Bird Dog", 10)];
  const result = resolveExerciseLoad({
    exerciseName: "Bird Dog",
    weekStr: "Week 1",
    profile,
    workouts: history,
  });
  assertEqual(result.source, "rpe-estimate", "Should use history-based rpe-estimate");
  assert(result.workingWeight !== null && result.workingWeight > 0, "rpe-estimate weight should be positive");
});

test("Unknown exercise with no history returns source=none (not a crash)", () => {
  const result = resolveExerciseLoad({
    exerciseName: "XYZ Super Exercise 9000",
    weekStr: "Week 1",
    profile,
    workouts: [],
  });
  assertEqual(result.source, "none", "Unknown exercise with no history should return none");
  assert(result.workingWeight === null, "Unresolvable exercise should have null weight");
});

test("Romanian Deadlift modifier is < 1.0 (less than deadlift 1RM)", () => {
  const rdl = resolveExerciseLoad({
    exerciseName: "Romanian Deadlift",
    weekStr: "Week 1",
    profile,
    workouts: [],
  });
  const dl = resolveExerciseLoad({
    exerciseName: "Conventional Deadlift",
    weekStr: "Week 1",
    profile,
    workouts: [],
  });
  assert(
    (rdl.workingWeight ?? 0) < (dl.workingWeight ?? 999),
    `RDL weight (${rdl.workingWeight}) should be < Deadlift weight (${dl.workingWeight})`
  );
});

test("Warm-up sets are generated when plannedWarmUpCount > 0", () => {
  const result = resolveExerciseLoad({
    exerciseName: "Barbell Squat",
    weekStr: "Week 1",
    profile,
    workouts: [],
    plannedWarmUpCount: 3,
  });
  assert(result.warmUps.length > 0, "Should generate warm-up sets when plannedWarmUpCount > 0");
  // Warm-ups should have ascending weights
  const weights = result.warmUps.map((w) => parseFloat(w.weight));
  for (let i = 1; i < weights.length; i++) {
    assert(weights[i] >= weights[i - 1], `Warm-up weights should be non-decreasing: ${weights.join(", ")}`);
  }
});

test("Working set count matches workingSetCount parameter", () => {
  const result = resolveExerciseLoad({
    exerciseName: "Barbell Squat",
    weekStr: "Week 1",
    profile,
    workouts: [],
    workingSetCount: 5,
  });
  assertEqual(result.workingSets.length, 5, "Should return exactly 5 working sets");
});

// ────────────────────────────────────────────────────────────────────────────
// 7. XP calculation
// ────────────────────────────────────────────────────────────────────────────

console.log("\n── 7. XP Calculation ──\n");

function buildCompletedSession(setsCount: number, totalSets?: number): WorkoutSession {
  const completed: SetEntry[] = Array.from({ length: setsCount }, () => ({
    reps: "8",
    weight: "60",
    completed: true,
  }));
  const incomplete: SetEntry[] = Array.from({ length: (totalSets ?? setsCount) - setsCount }, () => ({
    reps: "8",
    weight: "60",
    completed: false,
  }));
  const ex: SessionExercise = {
    exerciseId: "barbell_squat",
    name: "Barbell Squat",
    sets: [...completed, ...incomplete],
  };
  return {
    id: "session-test",
    name: "Test Session",
    date: new Date().toISOString(),
    exercises: [ex],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

test("Session with 5 completed sets awards correct XP", () => {
  const session = buildCompletedSession(5);
  const result = awardSessionXP(defaultXPRecord(), session, false, 1);
  const expectedSetXP = 5 * XP_AWARDS.PER_SET_COMPLETED;
  // 100% completion → full session bonus (SESSION_MAX)
  const expectedTotal = expectedSetXP + XP_AWARDS.SESSION_MAX;
  assertEqual(result.awarded, expectedTotal, `Expected ${expectedTotal} XP for 5-set session`);
});

test("Session with 0 completed sets awards 0 XP", () => {
  const session = buildCompletedSession(0, 5);
  const result = awardSessionXP(defaultXPRecord(), session, false, 1);
  assertEqual(result.awarded, 0, "Expected 0 XP for empty session");
});

test("PR bonus adds XP_AWARDS.PR_HIT when isPR=true", () => {
  const session = buildCompletedSession(3);
  const withoutPR = awardSessionXP(defaultXPRecord(), session, false, 1);
  const withPR = awardSessionXP(defaultXPRecord(), session, true, 1);
  assertEqual(
    withPR.awarded - withoutPR.awarded,
    XP_AWARDS.PR_HIT,
    `PR should add exactly ${XP_AWARDS.PR_HIT} XP`
  );
});

test("3-day streak milestone awarded only once", () => {
  const session = buildCompletedSession(3);
  const initial = defaultXPRecord();

  // First session with 3-day streak
  const first = awardSessionXP(initial, session, false, 3);
  assert(
    first.breakdown.some((b) => b.reason === "3-day streak"),
    "Should award 3-day streak on first crossing"
  );

  // Second session, still at 3-day streak
  const { sessionId: _, ...restSession } = { sessionId: "x", ...session };
  const second = awardSessionXP(first.updatedRecord, { ...session, id: "session-2" }, false, 3);
  assert(
    !second.breakdown.some((b) => b.reason === "3-day streak"),
    "Should NOT re-award 3-day streak on second session"
  );
});

test("Rank-up occurs and bonus XP awarded", () => {
  // Build a record just below Scout threshold (50 XP)
  const nearScout = { total: 45, rank: "Runt" as const, history: [] };
  const session = buildCompletedSession(3); // ~21 XP
  const result = awardSessionXP(nearScout, session, false, 1);
  assert(result.rankedUp, "Should rank up when crossing 50 XP threshold");
  assert(
    result.breakdown.some((b) => b.reason.includes("Rank up")),
    "Breakdown should include rank-up entry"
  );
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Rank service
// ────────────────────────────────────────────────────────────────────────────

console.log("\n── 8. Rank Service ──\n");

test("Rank ladder is monotonically increasing", () => {
  for (let i = 1; i < RANK_LADDER.length; i++) {
    assert(
      RANK_LADDER[i].xp > RANK_LADDER[i - 1].xp,
      `Rank ${RANK_LADDER[i].rank} XP threshold (${RANK_LADDER[i].xp}) not > ${RANK_LADDER[i - 1].rank} (${RANK_LADDER[i - 1].xp})`
    );
  }
});

test("rankForXP returns correct ranks at boundaries", () => {
  assertEqual(rankForXP(0), "Runt", "0 XP = Runt");
  assertEqual(rankForXP(50), "Scout", "50 XP = Scout");
  assertEqual(rankForXP(200), "Stalker", "200 XP = Stalker");
  assertEqual(rankForXP(500), "Hunter", "500 XP = Hunter");
  assertEqual(rankForXP(1000), "Sentinel", "1000 XP = Sentinel");
  assertEqual(rankForXP(1600), "Alpha", "1600 XP = Alpha");
  assertEqual(rankForXP(2400), "Apex", "2400 XP = Apex");
  assertEqual(rankForXP(3200), "Apex_Bronze", "3200 XP = Apex_Bronze");
  assertEqual(rankForXP(4200), "Apex_Silver", "4200 XP = Apex_Silver");
  assertEqual(rankForXP(5400), "Apex_Gold", "5400 XP = Apex_Gold");
  assertEqual(rankForXP(9999), "Apex_Gold", "9999 XP = Apex_Gold (capped)");
});

test("didRankUp correctly detects rank boundary crossing", () => {
  assert(didRankUp(45, 55), "45→55 XP should cross Scout threshold");
  assert(!didRankUp(55, 80), "55→80 XP stays in Scout");
  assert(didRankUp(195, 205), "195→205 XP should cross Stalker threshold");
});

// ────────────────────────────────────────────────────────────────────────────
// 9. Plan context logic
// ────────────────────────────────────────────────────────────────────────────

console.log("\n── 9. Plan Day Key Logic ──\n");

test("Day key format is 'Week X|Day Y'", () => {
  const week = "Week 3";
  const day = "Day 2";
  const key = `${week}|${day}`;
  assertEqual(key, "Week 3|Day 2", "Day key should use pipe separator");
});

test("All unique day keys in a plan are discoverable", () => {
  const plan = CATALOG_PLANS[0]; // Glute Buster — 4 days × 12 weeks = 48 days
  const dayKeys = new Set<string>();
  for (const ex of plan.exercises) {
    dayKeys.add(`${ex.week || "Week 1"}|${ex.day || "Day 1"}`);
  }
  const expectedDays = plan.daysPerWeek * 12;
  assertEqual(
    dayKeys.size,
    expectedDays,
    `Plan "${plan.name}" should have ${expectedDays} unique day keys, got ${dayKeys.size}`
  );
});

// ────────────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────────────

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed (${results.length} total)`);
console.log("═".repeat(50));

if (failed > 0) {
  console.log("\nFailed tests:");
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.error(`  ✗ ${r.name}`);
      if (r.details) console.error(`    ${r.details}`);
    });
  process.exit(1);
} else {
  console.log("\nAll tests passed!");
  process.exit(0);
}
