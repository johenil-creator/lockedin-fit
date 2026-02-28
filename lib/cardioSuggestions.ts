// lib/cardioSuggestions.ts — Preset cardio templates shown on the cardio setup screen.

// ── Types ─────────────────────────────────────────────────────────────────────

export type CardioModality =
  | "running"
  | "cycling"
  | "rowing"
  | "walking"
  | "swimming"
  | "elliptical"
  | "stairclimber"
  | "jump_rope"
  | "other";

export type CardioSuggestion = {
  id: string;
  name: string;
  description: string;
  /** Emoji or icon name used in the UI */
  icon: string;
  modality: CardioModality;
  /** Perceived effort 1-10 */
  intensity: number;
};

// ── Navigation params shape returned by startFromSuggestion ──────────────────
// All values are strings because Expo Router params are always strings.

export type CardioSessionParams = {
  modality: string;
  intensity: string;
  name: string;
};

// ── Preset catalogue ──────────────────────────────────────────────────────────

export const CARDIO_SUGGESTIONS: CardioSuggestion[] = [
  {
    id: "zone2_builder",
    name: "Zone 2 Builder",
    description: "Steady hunter's pace. Build the engine that runs all day.",
    icon: "\u{1F3C3}",
    modality: "running",
    intensity: 5,
  },
  {
    id: "recovery_walk",
    name: "Recovery Walk",
    description: "Wolves rest too. Active recovery keeps you sharp.",
    icon: "\u{1F6B6}",
    modality: "walking",
    intensity: 3,
  },
  {
    id: "low_impact_ride",
    name: "Low Impact Ride",
    description: "Smooth kill. Low impact, high efficiency.",
    icon: "\u{1F6B4}",
    modality: "cycling",
    intensity: 5,
  },
  {
    id: "endurance_builder",
    name: "Endurance Builder",
    description: "Hunt for hours. Stamina wins wars.",
    icon: "\u{1F3AF}",
    modality: "running",
    intensity: 6,
  },
  {
    id: "conditioning_row",
    name: "Conditioning Row",
    description: "Beast mode. Full-body punishment built for hunters.",
    icon: "\u{1F6A3}",
    modality: "rowing",
    intensity: 8,
  },
  {
    id: "jump_rope_burn",
    name: "Jump Rope Burn",
    description: "Fast-twitch fury. No gear, pure results.",
    icon: "\u27B0",
    modality: "jump_rope",
    intensity: 7,
  },
];

// ── Helper ─────────────────────────────────────────────────────────────────────

/**
 * Converts a suggestion into navigation params for the cardio session screen.
 * All values are stringified because Expo Router useLocalSearchParams() always
 * returns strings. The consuming screen (app/cardio-session.tsx) parses them.
 */
export function startFromSuggestion(suggestion: CardioSuggestion): CardioSessionParams {
  return {
    modality: suggestion.modality,
    intensity: String(suggestion.intensity),
    name: suggestion.name,
  };
}
