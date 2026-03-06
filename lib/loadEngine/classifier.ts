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
