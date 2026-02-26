import {
  exerciseCatalog,
  type ExerciseCatalogEntry,
} from "../data/exerciseCatalog";

export type { ExerciseCatalogEntry } from "../data/exerciseCatalog";

/** Normalize: lowercase, trim, remove punctuation, collapse spaces. */
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// Build name → entry lookup from canonicalName + aliases (runs once at import)
const indexStart = typeof performance !== "undefined" ? performance.now() : Date.now();
const nameIndex = new Map<string, ExerciseCatalogEntry>();
for (const entry of exerciseCatalog) {
  nameIndex.set(normalize(entry.canonicalName), entry);
  for (const alias of entry.aliases) {
    nameIndex.set(normalize(alias), entry);
  }
}
const indexMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - indexStart;

if (typeof __DEV__ !== "undefined" && __DEV__) {
  console.log(
    `[exerciseMatch] Index built: ${exerciseCatalog.length} catalog entries, ${nameIndex.size} lookup keys, ${indexMs.toFixed(1)}ms`
  );
}

/** Max catalog entries to scan during fuzzy fallback. */
const FUZZY_SCAN_CAP = 200;

/** Exact normalized match, then fuzzy word-overlap fallback (capped). */
export function findExercise(name: string): ExerciseCatalogEntry | null {
  const key = normalize(name);

  // O(1) exact match
  const exact = nameIndex.get(key);
  if (exact) return exact;

  // Fuzzy word-overlap — capped at FUZZY_SCAN_CAP comparisons
  const inputWords = key.split(/\s+/).filter(Boolean);
  if (inputWords.length === 0) return null;

  let bestEntry: ExerciseCatalogEntry | null = null;
  let bestScore = 0;
  let comparisons = 0;

  for (const entry of exerciseCatalog) {
    if (comparisons >= FUZZY_SCAN_CAP) break;
    comparisons++;

    for (const candidate of [entry.canonicalName, ...entry.aliases]) {
      const cWords = normalize(candidate).split(/\s+/).filter(Boolean);
      let overlap = 0;
      for (const w of inputWords) {
        if (
          cWords.some(
            (c) =>
              c === w ||
              (c.length >= 3 && w.length >= 3 && (c.includes(w) || w.includes(c)))
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

  // Require at least half the input words to match
  if (bestEntry && bestScore >= Math.ceil(inputWords.length / 2)) {
    return bestEntry;
  }

  return null;
}

/** Add a custom entry to the runtime index. */
export function addCustomEntry(entry: ExerciseCatalogEntry): void {
  nameIndex.set(normalize(entry.canonicalName), entry);
  for (const alias of entry.aliases) {
    nameIndex.set(normalize(alias), entry);
  }
}
