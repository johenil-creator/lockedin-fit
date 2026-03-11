/**
 * lockeCoachEngine.ts — Intelligent coaching voice for the adaptive system.
 *
 * Converts recovery/training signals into a CoachOutput:
 *   mood              → drives Locke mascot expression + animation intensity
 *   headline          → punchy 1-line opener (≤42 chars)
 *   subtext           → supporting context (≤90 chars)
 *   tips              → optional 1-3 actionable tips based on context
 *   mascotMood        → LockeMascotMood for expression rendering
 *   animationIntensity → scales animation parameters (savage = high)
 *
 * Mood priority (highest wins):
 *   1. PR hit                         → celebrating
 *   2. Overtrained                    → concerned (recovery emphasis)
 *   3. Deload triggered               → rest_day
 *   4. Readiness < 40                 → rest_day
 *   5. Plateau present                → focused  (plateau-specific messaging)
 *   6. Readiness 40–59                → concerned
 *   7. Readiness ≥ 80 + streak > 7   → savage
 *   8. Readiness ≥ 60 + realization  → focused  (peak block precision)
 *   9. Readiness ≥ 60                 → encouraging
 */

import type { LockeMascotMood } from "../components/Locke/LockeMascot";
import type {
  CoachMood,
  MuscleGroup,
  BlockType,
  BlockWeekPosition,
  PlateauInsight,
  PlateauClassification,
} from "./types";
import { pickHeadline, pickSubtext } from "./lockeCoachPhrases";

// Re-export shared types so consumers can import from one place
export type { CoachMood, MuscleGroup, BlockType, BlockWeekPosition, PlateauInsight };

// ── Input / Output contracts ───────────────────────────────────────────────────

export type CoachInputs = {
  readinessScore: number;          // 0–100
  fatiguedMuscles: MuscleGroup[];  // muscles above fatigue threshold
  isOvertrained: boolean;
  plateauInsight: PlateauInsight | null;
  deloadTriggered: boolean;
  streakDays: number;
  hasPR: boolean;
  blockType: BlockType;
  weekPosition: BlockWeekPosition;
};

/**
 * Extended CoachOutput with mascot-specific rendering fields.
 * Superset of the CoachOutput type defined in lib/types.ts.
 */
export type CoachOutput = {
  mood: CoachMood;
  headline: string;                               // max 42 chars
  subtext: string;                                // max 90 chars
  tips?: string[];                                // 1–3 actionable tips
  mascotMood: LockeMascotMood;                    // expression for <LockeMascot>
  animationIntensity: "low" | "medium" | "high"; // scales animation speed/amplitude
};

// ── CoachMood → LockeMascotMood mapping ──────────────────────────────────────

const MASCOT_MOOD_MAP: Record<CoachMood, LockeMascotMood> = {
  celebrating: "celebrating",
  savage:      "savage",
  encouraging: "encouraging",
  focused:     "focused",
  concerned:   "concerned",
  rest_day:    "neutral",
};

// ── Animation intensity per mood ──────────────────────────────────────────────

const ANIMATION_INTENSITY: Record<CoachMood, CoachOutput["animationIntensity"]> = {
  celebrating: "high",
  savage:      "high",
  encouraging: "medium",
  focused:     "medium",
  concerned:   "low",
  rest_day:    "low",
};

// ── Mood selection ─────────────────────────────────────────────────────────────

function selectMood(inputs: CoachInputs): CoachMood {
  const {
    readinessScore,
    isOvertrained,
    deloadTriggered,
    plateauInsight,
    streakDays,
    hasPR,
    blockType,
    weekPosition,
  } = inputs;

  // 1. PR takes priority — always celebrate genuine achievements
  if (hasPR) return "celebrating";

  // 2. Overtrained — recovery is urgent, flag before anything else
  if (isOvertrained) return "concerned";

  // 3. Deload triggered or pivot_deload week — mandatory rest day tone
  if (deloadTriggered || weekPosition === "pivot_deload") return "rest_day";

  // 4. Very low readiness — body needs genuine recovery
  if (readinessScore < 40) return "rest_day";

  // 5. Plateau active — focused execution can break the stall
  if (plateauInsight !== null) return "focused";

  // 6. Low-mid readiness — honest signal that today needs managing
  if (readinessScore < 60) return "concerned";

  // 7. Prime condition + sustained discipline → savage mode
  if (readinessScore >= 80 && streakDays > 7) return "savage";

  // 8. Realization block or peak week → precision over enthusiasm
  if (readinessScore >= 60 && (blockType === "realization" || weekPosition === "peak")) {
    return "focused";
  }

  // 9. Solid readiness, general training day
  return "encouraging";
}

// ── Contextual tips ───────────────────────────────────────────────────────────

const MUSCLE_TIPS: Partial<Record<MuscleGroup, string>> = {
  chest:       "Give chest 48h before heavy pressing again.",
  back:        "Back fatigue affects every pull — ease off rows.",
  shoulders:   "Shoulders are in every push/pull — manage volume.",
  quads:       "Quad fatigue hits CNS recovery globally.",
  hamstrings:  "Hamstring fatigue increases injury risk — don't rush.",
  glutes:      "Glutes drive every compound lower body movement.",
  biceps:      "Bicep fatigue carries into back training.",
  triceps:     "Tricep fatigue limits every pressing movement.",
  core:        "Core fatigue compromises form on every compound lift.",
  lats:        "Lat fatigue impacts all pulling and overhead work.",
  traps:       "Trap fatigue affects posture and upper back stability.",
  calves:      "Calves recover slowly — stretch and allow 48h before heavy calf work.",
  forearms:    "Forearm fatigue limits grip on every pulling movement — rest and stretch.",
  side_delts:  "Side delts accumulate volume fast via pressing and rows — watch total sets.",
  front_delts: "Front delts are hit hard by all pressing — avoid isolating an already-taxed muscle.",
  rear_delts:  "Rear delts are critical for posture — don't skip recovery or rehab work.",
};

const PLATEAU_TIPS: Record<PlateauClassification, string[]> = {
  under_recovered: [
    "Prioritize sleep — 7-9h per night for optimal adaptation.",
    "Reduce volume 20% this week and let the body catch up.",
    "Under-recovery is often the hidden reason for stalled lifts.",
  ],
  under_stimulated: [
    "Add tempo: try a 3s eccentric for the next 2 weeks.",
    "Shift rep range — if you've been at 5s, try 8s.",
    "Plateau from under-stimulation needs a new training variable.",
  ],
  inconsistent: [
    "Attendance gaps are silently erasing your gains.",
    "Consistency beats intensity — show up first, optimize second.",
    "3 sessions per week, every week, breaks most plateaus.",
  ],
};

const DELOAD_TIPS = [
  "Keep intensity at 40-60% of working weight this week.",
  "Focus on movement quality and range of motion.",
  "Prioritize sleep and nutrition — recovery is the work.",
];

const OVERTRAINED_TIPS = [
  "Active recovery only — walking, light swimming, or stretching.",
  "Aim for 8+ hours of sleep and increase protein intake.",
];

const SAVAGE_TIPS = [
  "High readiness means today is the day to PR — attempt it.",
  "Long streaks build momentum. Don't leave reps on the bar.",
];

function buildTips(mood: CoachMood, inputs: CoachInputs): string[] | undefined {
  const tips: string[] = [];

  switch (mood) {
    case "celebrating":
      // Let the moment breathe — no tips on PR day
      return undefined;

    case "savage":
      tips.push(SAVAGE_TIPS[0]);
      if (inputs.streakDays > 14) tips.push(SAVAGE_TIPS[1]);
      return tips;

    case "rest_day":
      if (inputs.deloadTriggered || inputs.weekPosition === "pivot_deload") {
        return DELOAD_TIPS.slice(0, 2);
      }
      return [DELOAD_TIPS[2]];

    case "concerned":
      if (inputs.isOvertrained) {
        return OVERTRAINED_TIPS;
      }
      // Add top fatigued muscle tip if available
      for (const muscle of inputs.fatiguedMuscles) {
        const tip = MUSCLE_TIPS[muscle];
        if (tip) { tips.push(tip); break; }
      }
      return tips.length > 0 ? tips : undefined;

    case "focused":
      if (inputs.plateauInsight) {
        return PLATEAU_TIPS[inputs.plateauInsight.classification].slice(0, 2);
      }
      if (inputs.blockType === "realization") {
        return ["Peak block — prioritize quality over quantity in every set."];
      }
      return undefined;

    case "encouraging":
      // Surface a muscle recovery note if any groups are fatigued
      for (const muscle of inputs.fatiguedMuscles) {
        const tip = MUSCLE_TIPS[muscle];
        if (tip) { tips.push(tip); break; }
      }
      return tips.length > 0 ? tips : undefined;

    default:
      return undefined;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Compute Locke's coaching output from the current training state.
 *
 * Pure function — no side effects beyond phrase rotation cursors (module-level,
 * in-memory only). Call once per screen mount where coaching context is shown.
 */
export function getCoachOutput(inputs: CoachInputs): CoachOutput {
  const mood = selectMood(inputs);
  const headline = pickHeadline(mood);
  const subtext = pickSubtext(mood);
  const tips = buildTips(mood, inputs);

  return {
    mood,
    headline,
    subtext,
    ...(tips !== undefined && { tips }),
    mascotMood: MASCOT_MOOD_MAP[mood],
    animationIntensity: ANIMATION_INTENSITY[mood],
  };
}

/**
 * Convert a CoachMood to the LockeMascotMood needed for <LockeMascot mood={...} />.
 * Useful for components that already have a mood and just need the visual mapping.
 */
export function coachMoodToMascotMood(mood: CoachMood): LockeMascotMood {
  return MASCOT_MOOD_MAP[mood];
}

/**
 * Returns the animation intensity tier for a given coach mood.
 * Consumers can use this to scale reanimated spring configs, loop speeds, etc.
 */
export function getAnimationIntensity(
  mood: CoachMood
): CoachOutput["animationIntensity"] {
  return ANIMATION_INTENSITY[mood];
}
