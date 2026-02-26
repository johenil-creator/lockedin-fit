import type { ExerciseClassification, MovementPattern, OrmLiftKey, LoadModifier } from "../types";
import { KEYWORD_RULES, MODIFIER_RULES, EXACT_OVERRIDES } from "./exerciseCatalog";

const DEFAULT_MODIFIER: LoadModifier = { fraction: 1.0, label: "100% of 1RM" };

/**
 * Classify an exercise name into a movement pattern, base lift, modifier, and confidence.
 *
 * Algorithm:
 * 1. Exact-match in EXACT_OVERRIDES → confidence 1.0
 * 2. Keyword scoring against KEYWORD_RULES (additive per pattern)
 * 3. Apply MODIFIER_RULES (longest keyword match wins)
 * 4. Confidence = clamp(bestScore / 12, 0.3, 1.0)
 * 5. No matches → pattern: 'unknown', confidence: 0
 */
export function classifyExercise(name: string): ExerciseClassification {
  const lower = name.toLowerCase().trim();

  // ── Step 1: Exact override ────────────────────────────────────────────────
  const exact = EXACT_OVERRIDES[lower];
  if (exact) {
    return {
      pattern: exact.pattern,
      baseLift: exact.baseLift,
      modifier: {
        fraction: exact.modifierFraction,
        label: exact.baseLift
          ? `${Math.round(exact.modifierFraction * 100)}% of ${exact.baseLift.toUpperCase()} 1RM`
          : "No base lift",
      },
      confidence: 1.0,
    };
  }

  // ── Step 2: Keyword scoring ───────────────────────────────────────────────
  // Accumulate scores per pattern, tracking the best baseLift per pattern
  const patternScores: Record<string, number> = {};
  const patternBaseLift: Record<string, OrmLiftKey | null> = {};

  for (const [keyword, rule] of Object.entries(KEYWORD_RULES)) {
    if (lower.includes(keyword)) {
      const p = rule.pattern;
      const prevScore = patternScores[p] ?? 0;
      patternScores[p] = prevScore + rule.score;

      // Keep the baseLift from the highest-scoring keyword for this pattern
      if (!patternBaseLift[p] || rule.score > prevScore) {
        patternBaseLift[p] = rule.baseLift;
      }
    }
  }

  // Find the winning pattern
  let bestPattern: MovementPattern = "unknown";
  let bestScore = 0;
  let bestBaseLift: OrmLiftKey | null = null;

  for (const [pattern, score] of Object.entries(patternScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern as MovementPattern;
      bestBaseLift = patternBaseLift[pattern] ?? null;
    }
  }

  // No keyword matches at all
  if (bestScore === 0) {
    return {
      pattern: "unknown",
      baseLift: null,
      modifier: DEFAULT_MODIFIER,
      confidence: 0,
    };
  }

  // ── Step 3: Apply modifier rules ──────────────────────────────────────────
  let bestModifier: LoadModifier = DEFAULT_MODIFIER;
  let bestModifierLength = 0;

  for (const rule of MODIFIER_RULES) {
    if (
      lower.includes(rule.keyword) &&
      rule.keyword.length > bestModifierLength
    ) {
      // Only apply if the modifier's baseLift matches our detected baseLift
      // or if we don't have a baseLift yet (adopt the modifier's)
      if (bestBaseLift === rule.forBaseLift || bestBaseLift === null) {
        bestModifier = rule.modifier;
        bestModifierLength = rule.keyword.length;
        // Adopt the modifier's baseLift if we didn't have one
        if (bestBaseLift === null) {
          bestBaseLift = rule.forBaseLift;
        }
      }
    }
  }

  // ── Step 4: Confidence ────────────────────────────────────────────────────
  const confidence = Math.min(Math.max(bestScore / 12, 0.3), 1.0);

  return {
    pattern: bestPattern,
    baseLift: bestBaseLift,
    modifier: bestModifier,
    confidence,
  };
}
