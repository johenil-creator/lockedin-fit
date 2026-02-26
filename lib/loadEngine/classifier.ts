import type { ExerciseClassification, LoadModifier } from "../types";
import { exerciseCatalog, type ExerciseCatalogEntry } from "./exerciseCatalog";

const DEFAULT_MODIFIER: LoadModifier = { fraction: 1.0, label: "No 1RM anchor" };

// Pre-build a lowercased lookup map for O(1) exact matching on
// canonicalName and every alias.
const nameIndex = new Map<string, ExerciseCatalogEntry>();
for (const entry of exerciseCatalog) {
  nameIndex.set(entry.canonicalName.toLowerCase(), entry);
  for (const alias of entry.aliases) {
    nameIndex.set(alias.toLowerCase(), entry);
  }
}

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
 * 3. No match → pattern: 'unknown', confidence: 0
 */
export function classifyExercise(name: string): ExerciseClassification {
  const lower = name.toLowerCase().trim();

  // ── Step 1: Exact match ─────────────────────────────────────────────────
  const exact = nameIndex.get(lower);
  if (exact) {
    return entryToClassification(exact, 1.0);
  }

  // ── Step 2: Fuzzy word-overlap scoring ──────────────────────────────────
  const inputWords = lower.split(/[\s\-_()]+/).filter(Boolean);
  if (inputWords.length === 0) {
    return { pattern: "unknown", baseLift: null, modifier: DEFAULT_MODIFIER, confidence: 0 };
  }

  let bestEntry: ExerciseCatalogEntry | null = null;
  let bestScore = 0;

  for (const entry of exerciseCatalog) {
    // Check canonical name and all aliases, keep the best score
    const candidates = [entry.canonicalName, ...entry.aliases];
    for (const candidate of candidates) {
      const candidateWords = candidate.toLowerCase().split(/[\s\-_()]+/).filter(Boolean);
      let overlap = 0;
      for (const word of inputWords) {
        if (candidateWords.some((cw) => cw === word || cw.includes(word) || word.includes(cw))) {
          overlap++;
        }
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
    pattern: "unknown",
    baseLift: null,
    modifier: DEFAULT_MODIFIER,
    confidence: 0,
  };
}
