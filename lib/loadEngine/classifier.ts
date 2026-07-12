import type { ExerciseClassification, LoadModifier } from "../types";
import { exerciseCatalog, type ExerciseCatalogEntry, type Equipment } from "./exerciseCatalog";

const DEFAULT_MODIFIER: LoadModifier = { fraction: 1.0, label: "No 1RM anchor" };

// Pre-build a lowercased lookup map for O(1) exact matching on
// canonicalName and every alias. Runs once at import time.
const indexStart = typeof performance !== "undefined" ? performance.now() : Date.now();
const nameIndex = new Map<string, ExerciseCatalogEntry>();
for (const entry of exerciseCatalog) {
  nameIndex.set(entry.canonicalName.toLowerCase(), entry);
  for (const alias of entry.aliases) {
    nameIndex.set(alias.toLowerCase(), entry);
  }
}
const indexMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - indexStart;

if (typeof __DEV__ !== "undefined" && __DEV__) {
  console.log(
    `[classifier] Index built: ${exerciseCatalog.length} catalog entries, ${nameIndex.size} lookup keys, ${indexMs.toFixed(1)}ms`
  );
}

/** Max catalog entries to scan during fuzzy fallback. */
const FUZZY_SCAN_CAP = 200;

/**
 * Build the result object from a catalog entry.
 */
function entryToClassification(
  entry: ExerciseCatalogEntry,
  confidence: number,
): ExerciseClassification {
  const baseLift = entry.anchorLift ?? null;
  const fraction = entry.modifier ?? 1.0;
  const modifier: LoadModifier = baseLift
    ? { fraction, label: `${Math.round(fraction * 100)}% of ${baseLift.toUpperCase()} 1RM` }
    : DEFAULT_MODIFIER;

  return {
    catalogId: entry.id,
    pattern: entry.movementPattern,
    baseLift,
    modifier,
    confidence,
  };
}

/**
 * Classify an exercise name into a movement pattern, base lift, modifier,
 * and confidence score.
 *
 * Algorithm:
 * 1. Exact match on canonicalName or alias → confidence 1.0
 * 2. Fuzzy: score each catalog entry by how many words overlap with the
 *    input name. Best overlap wins. Confidence = overlapWords / totalWords.
 *    Capped at FUZZY_SCAN_CAP entries to prevent frame drops.
 * 3. No match → pattern: 'unknown', confidence: 0
 */
export function classifyExercise(name: string): ExerciseClassification {
  const lower = name.toLowerCase().trim();

  // ── Step 1: Exact match ─────────────────────────────────────────────────
  const exact = nameIndex.get(lower);
  if (exact) {
    return entryToClassification(exact, 1.0);
  }

  // ── Step 2: Fuzzy word-overlap scoring (capped) ───────────────────────
  const inputWords = lower.split(/[\s\-_()]+/).filter(Boolean);
  if (inputWords.length === 0) {
    return { catalogId: null, pattern: "unknown", baseLift: null, modifier: DEFAULT_MODIFIER, confidence: 0 };
  }

  let bestEntry: ExerciseCatalogEntry | null = null;
  let bestScore = 0;
  let comparisons = 0;

  for (const entry of exerciseCatalog) {
    if (comparisons >= FUZZY_SCAN_CAP) break;
    comparisons++;

    const candidates = [entry.canonicalName, ...entry.aliases];
    for (const candidate of candidates) {
      const candidateWords = candidate.toLowerCase().split(/[\s\-_()]+/).filter(Boolean);
      let overlap = 0;
      for (const word of inputWords) {
        if (
          candidateWords.some(
            (cw) =>
              cw === word ||
              (cw.length >= 3 && word.length >= 3 && (cw.includes(word) || word.includes(cw)))
          )
        )
          overlap++;
      }
      if (overlap > bestScore) {
        bestScore = overlap;
        bestEntry = entry;
      }
    }
  }

  if (bestEntry && bestScore > 0) {
    const confidence = Math.min(bestScore / inputWords.length, 1.0);
    return entryToClassification(bestEntry, confidence);
  }

  // ── Step 3: No match ────────────────────────────────────────────────────
  return {
    catalogId: null,
    pattern: "unknown",
    baseLift: null,
    modifier: DEFAULT_MODIFIER,
    confidence: 0,
  };
}

/**
 * Look up the catalog equipment type for an exercise by name.
 * Uses the pre-built nameIndex for O(1) lookup.
 * Returns null if the exercise isn't found in the catalog.
 */
export function getExerciseEquipment(name: string): Equipment | null {
  const entry = nameIndex.get(name.toLowerCase().trim());
  return entry?.equipment ?? null;
}

// ── Timed / isometric exercise detection ────────────────────────────────────

/** Catalog IDs that are definitively timed exercises. */
const TIMED_IDS = new Set([
  "plank",
  "side_plank",
  "l_sit",
  "hollow_hold",
  "back_extension_hold",
  "copenhagen_plank",
  "front_lever",
  "tuck_planche",
  "planche_lean",
  "wall_handstand_hold",
]);

/**
 * Catalog IDs that are definitively reps-based exercises whose names might
 * otherwise trigger a false-positive match in TIMED_PATTERNS.
 *
 * Example: "Hollow Rock" contains the word "hollow" which matches the
 * TIMED_PATTERNS \bhollow\b token, but the exercise is counted in reps.
 */
const REPS_IDS = new Set([
  "hollow_rock",       // reps — "hollow" word triggers false-positive pattern match
  "tuck_dragon_flag",  // reps — explicitly listed for clarity
  "windshield_wipers", // reps
  "v_ups",             // reps
  "front_lever_raise", // reps — dynamic raise and lower from hang, not a static hold
]);

const UNILATERAL_IDS = new Set([
  // Timed + unilateral (isometric holds, one side at a time)
  'side_plank',
  'copenhagen_plank',
  // Reps + unilateral (strength exercises, one side at a time)
  'pistol_squat',
  'shrimp_squat',
  'skater_squat',
  'single_leg_back_extension',
  'natural_leg_extension',        // single-leg variant
  'bulgarian_split_squat',
  'single_leg_dumbbell_rdl',
  'single_leg_romanian_deadlift_db',
  'single_leg_glute_bridge',
  'single_leg_leg_curl',
  'leg_curl_single_leg',
  'leg_extension_single_leg',
  'leg_press_single_leg',
  'single_leg_glute_kickback',
  'hip_thrust_single_leg',
  'hip_thrust_b_stance',
  'b_stance_dumbbell_rdl',
  'kickstand_rdl',
  'single_arm_row',
  'dumbbell_row',
  'row_dumbbell',
  'meadows_row',
  'kroc_row',
  'landmine_press',
  'single_arm_dumbbell_shoulder_press',
  'single_arm_cable_curl',
  'single_arm_lat_pulldown',
  'lat_pulldown_single_arm',
  'cable_row_single_arm',
  'cable_lateral_raise',
  'cable_tricep_kickback',
  'tricep_extension_single_arm',
  'lat_pulldown_half_kneeling',
  'glute_kickback_cable',
  'cable_glute_kickback',
  'suitcase_carry',
  'overhead_carry',
  'waiter_walk',
]);

/** Name patterns that indicate a timed/isometric exercise. */
const TIMED_PATTERNS = /\b(plank|hold|iso(?:metric)?|l[- ]sit|dead\s*hang|wall\s*sit|hollow|planche|lever)\b/i;

/**
 * Returns true if the exercise should use duration (seconds) instead of reps.
 *
 * Resolution order:
 * 1. Catalog ID in TIMED_IDS → true  (highest confidence, explicit allow-list)
 * 2. Catalog ID in REPS_IDS  → false (explicit deny-list blocks pattern false-positives)
 * 3. TIMED_PATTERNS regex on name → pattern-based fallback for uncatalogued names
 */
export function isExerciseTimed(name: string): boolean {
  const entry = nameIndex.get(name.toLowerCase().trim());
  if (entry) {
    if (TIMED_IDS.has(entry.id)) return true;
    if (REPS_IDS.has(entry.id)) return false;
  }
  return TIMED_PATTERNS.test(name);
}

/**
 * Returns true if the exercise is unilateral (one side at a time).
 *
 * Resolution order:
 * 1. Catalog ID in UNILATERAL_IDS → true  (explicit allow-list)
 * 2. Catalog entry's isUnilateral field → true (catalog-level flag)
 * 3. Pattern fallback on name for uncatalogued exercises
 */
export function isExerciseUnilateral(exerciseName: string): boolean {
  const entry = nameIndex.get(exerciseName.toLowerCase().trim());
  if (entry) {
    // Check UNILATERAL_IDS by catalog id
    if (UNILATERAL_IDS.has(entry.id)) return true;
    // Check catalog's isUnilateral field if present
    if ((entry as any).isUnilateral) return true;
    return false;
  }
  // Pattern fallback for uncatalogued exercises
  return /\bsingle[- ](leg|arm)\b|\bper\s*side\b|\bunilateral\b/i.test(exerciseName);
}

/**
 * Parse a reps field that may contain a time expression and return the
 * target duration in whole seconds.
 *
 * Examples:
 * - "8s hold" → 8
 * - "8s" → 8
 * - "20-30s" → 20 (lower bound)
 * - "max" → 0 (open-ended countup)
 * - "0" → 0
 * - "60" → 60 (plain number treated as seconds for timed exercises)
 * - "" → 0
 *
 * Returns 0 as the default/fallback.
 */
export function getTimedTargetSeconds(repsStr: string): number {
  const s = repsStr.trim().toLowerCase();
  if (!s || s === "max") return 0;

  // "20-30s" or "20-30" → take the lower bound
  const rangeMatch = s.match(/^(\d+)\s*-\s*\d+/);
  if (rangeMatch) return parseInt(rangeMatch[1], 10);

  // "8s hold", "8s", "30 s" → extract leading number
  const secMatch = s.match(/^(\d+)\s*s/);
  if (secMatch) return parseInt(secMatch[1], 10);

  // Plain number → treat as seconds
  const plainMatch = s.match(/^(\d+)$/);
  if (plainMatch) return parseInt(plainMatch[1], 10);

  return 0;
}

/**
 * Returns true when the reps string signals an open-ended max hold
 * (countup mode).
 *
 * - "max" → true
 * - "0" → true
 * - "0s" → true
 * - everything else → false
 */
export function isCountupMode(repsStr: string): boolean {
  const s = repsStr.trim().toLowerCase();
  return s === "max" || s === "0" || s === "0s";
}
