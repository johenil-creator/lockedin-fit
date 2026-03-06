/**
 * Muscle Energy State Engine
 *
 * Maps fatigue values (0-100) to 6 gamified energy states with visual properties
 * for the interactive muscle heatmap. Pure functions, no React dependencies.
 */

import type { MuscleGroup, MuscleFatigueMap } from './types';

// ── Energy State Type ────────────────────────────────────────────────────────

export type MuscleEnergyState =
  | 'dormant'
  | 'primed'
  | 'charged'
  | 'strained'
  | 'overloaded'
  | 'peak';

export type MuscleVisualState = {
  state: MuscleEnergyState;
  label: string;
  fill: string;
  fillOpacity: number;
  glowColor: string | null;
  glowOpacity: number;
  glowRadius: number;
  shouldPulse: boolean;
  shouldShimmer: boolean;
};

// ── Constants ────────────────────────────────────────────────────────────────

/** Fatigue thresholds for each state (inclusive lower bound). */
const THRESHOLDS = {
  dormant: 0,
  primed: 1,
  charged: 21,
  strained: 46,
  overloaded: 66,
  peak: 85,
} as const;

/** Colors for dark mode fills. */
const DARK_FILLS = {
  dormant: '#2A3340',
  primed: '#4CAF50',
  chargedGreen: '#00875A',
  chargedBlue: '#58A6FF',
  strained: '#FFEB3B',
  overloaded: '#FF9800',
  peak: '#F44336',
} as const;

/** Colors for light mode fills. */
const LIGHT_FILLS = {
  dormant: '#C8BFB6', // slightly darker than light skin tone (#EDE8E2)
  primed: '#4CAF50',
  chargedGreen: '#00875A',
  chargedBlue: '#58A6FF',
  strained: '#FFEB3B',
  overloaded: '#FF9800',
  peak: '#F44336',
} as const;

/** Glow colors per state (null means no glow). */
const GLOW_COLORS: Record<MuscleEnergyState, string | null> = {
  dormant: null,
  primed: null,
  charged: '#58A6FF',
  strained: '#FFC107', // warm amber glow
  overloaded: '#FF9800',
  peak: '#F44336',
} as const;

/** Human-readable labels. */
const LABELS: Record<MuscleEnergyState, string> = {
  dormant: 'Dormant',
  primed: 'Primed',
  charged: 'Charged',
  strained: 'Strained',
  overloaded: 'Overloaded',
  peak: 'Peak',
} as const;

/** Legend colors (dark mode defaults). */
const STATE_COLORS: Record<MuscleEnergyState, string> = {
  dormant: DARK_FILLS.dormant,
  primed: DARK_FILLS.primed,
  charged: DARK_FILLS.chargedGreen,
  strained: DARK_FILLS.strained,
  overloaded: DARK_FILLS.overloaded,
  peak: DARK_FILLS.peak,
} as const;

/** All energy states for legend rendering (ordered low → high fatigue). */
export const ENERGY_STATES: readonly {
  state: MuscleEnergyState;
  label: string;
  color: string;
}[] = [
  { state: 'dormant', label: 'Dormant', color: DARK_FILLS.dormant },
  { state: 'primed', label: 'Primed', color: DARK_FILLS.primed },
  { state: 'charged', label: 'Charged', color: DARK_FILLS.chargedGreen },
  { state: 'strained', label: 'Strained', color: DARK_FILLS.strained },
  { state: 'overloaded', label: 'Overloaded', color: DARK_FILLS.overloaded },
  { state: 'peak', label: 'Peak', color: DARK_FILLS.peak },
] as const;

/**
 * Return energy state legend entries with colors correct for the current theme.
 * Prefer this over ENERGY_STATES directly — that array hardcodes dark-mode fills.
 */
export function getEnergyStatesForTheme(
  isDark: boolean,
): { state: MuscleEnergyState; label: string; color: string }[] {
  const fills = isDark ? DARK_FILLS : LIGHT_FILLS;
  return [
    { state: 'dormant', label: 'Dormant', color: fills.dormant },
    { state: 'primed', label: 'Primed', color: fills.primed },
    { state: 'charged', label: 'Charged', color: fills.chargedGreen },
    { state: 'strained', label: 'Strained', color: fills.strained },
    { state: 'overloaded', label: 'Overloaded', color: fills.overloaded },
    { state: 'peak', label: 'Peak', color: fills.peak },
  ];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Linear interpolation between two values. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Parse a hex color string to [r, g, b]. */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Convert [r, g, b] to a hex color string. */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b))
      .toString(16)
      .slice(1)
      .toUpperCase()
  );
}

/** Interpolate between two hex colors at t ∈ [0, 1]. */
function lerpColor(colorA: string, colorB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);
  return rgbToHex(lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t));
}

/** Classify fatigue into an energy state. */
function classifyState(fatigue: number): MuscleEnergyState {
  if (fatigue <= 0) return 'dormant';
  if (fatigue <= 20) return 'primed';
  if (fatigue <= 45) return 'charged';
  if (fatigue <= 65) return 'strained';
  if (fatigue <= 84) return 'overloaded';
  return 'peak';
}

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Map a fatigue value (0-100) to a full visual state descriptor.
 *
 * All interpolation is smooth within each state range — no hard visual steps.
 */
export function getEnergyState(
  fatigue: number,
  isDark: boolean,
): MuscleVisualState {
  const f = clamp(fatigue, 0, 100);
  const state = classifyState(f);
  const fills = isDark ? DARK_FILLS : LIGHT_FILLS;

  let fill: string;
  let fillOpacity: number;
  let glowColor: string | null;
  let glowOpacity: number;
  let glowRadius: number;

  switch (state) {
    case 'dormant': {
      fill = fills.dormant;
      fillOpacity = 0.15; // nearly invisible — muscle shape defined by outline, not color block
      glowColor = null;
      glowOpacity = 0;
      glowRadius = 0;
      break;
    }

    case 'primed': {
      // fatigue 1-20 → smooth ramp in opacity, gentle tint only
      const t = (f - 1) / 19; // 0 at fatigue=1, 1 at fatigue=20
      fill = fills.primed;
      fillOpacity = lerp(0.25, 0.40, t);
      glowColor = null;
      glowOpacity = 0;
      glowRadius = 0;
      break;
    }

    case 'charged': {
      // fatigue 21-45 → gradient blend green→blue, "healthy energy" soft glow
      const t = (f - 21) / 24; // 0 at fatigue=21, 1 at fatigue=45
      fill = lerpColor(fills.chargedGreen, fills.chargedBlue, t);
      fillOpacity = lerp(0.40, 0.55, t);
      glowColor = GLOW_COLORS.charged;
      glowOpacity = lerp(0.06, 0.12, t);
      glowRadius = lerp(1, 2.5, t);
      break;
    }

    case 'strained': {
      // fatigue 46-65 → warm yellow, "working hard, caution" amber glow
      const t = (f - 46) / 19; // 0 at fatigue=46, 1 at fatigue=65
      fill = fills.strained;
      fillOpacity = lerp(0.45, 0.60, t);
      glowColor = GLOW_COLORS.strained;
      glowOpacity = lerp(0.08, 0.18, t);
      glowRadius = lerp(1.5, 3, t);
      break;
    }

    case 'overloaded': {
      // fatigue 66-84 → deep orange, "burning, needs rest" glow
      const t = (f - 66) / 18; // 0 at fatigue=66, 1 at fatigue=84
      fill = fills.overloaded;
      fillOpacity = lerp(0.55, 0.70, t);
      glowColor = GLOW_COLORS.overloaded;
      glowOpacity = lerp(0.12, 0.25, t);
      glowRadius = lerp(2, 4, t);
      break;
    }

    case 'peak': {
      // fatigue 85-100 → vivid red, "on fire, alive, urgent" intense glow
      const t = (f - 85) / 15; // 0 at fatigue=85, 1 at fatigue=100
      fill = fills.peak;
      fillOpacity = lerp(0.65, 0.85, t); // capped at 0.85 — outline always shows through
      glowColor = GLOW_COLORS.peak;
      glowOpacity = lerp(0.15, 0.35, t);
      glowRadius = lerp(2.5, 5, t);
      break;
    }
  }

  return {
    state,
    label: LABELS[state],
    fill,
    fillOpacity,
    glowColor,
    glowOpacity,
    glowRadius,
    shouldPulse: state === 'peak',
    shouldShimmer: state === 'charged',
  };
}

/**
 * Batch-convert an entire fatigue map to visual states.
 * Muscles absent from the map default to "dormant" (fatigue = 0).
 */
export function getEnergyStates(
  fatigueMap: Partial<MuscleFatigueMap>,
  isDark: boolean,
): Record<string, MuscleVisualState> {
  const result: Record<string, MuscleVisualState> = {};
  for (const [muscle, fatigue] of Object.entries(fatigueMap)) {
    result[muscle] = getEnergyState(fatigue ?? 0, isDark);
  }
  return result;
}

// ── Metadata Helpers ─────────────────────────────────────────────────────────

/** Get the canonical color for an energy state (dark-mode default). */
export function getStateColor(state: MuscleEnergyState): string {
  return STATE_COLORS[state];
}

/** Get the human-readable label for an energy state. */
export function getStateLabel(state: MuscleEnergyState): string {
  return LABELS[state];
}

// ── Supercompensation Detection ──────────────────────────────────────────────

/**
 * Detect whether a muscle is in the supercompensation window.
 *
 * Supercompensation occurs when fatigue was previously high (above the Charged
 * ceiling of 45) and has now recovered into the Charged range (21-45).
 * This is the optimal training window.
 *
 * @param currentFatigue  - Current fatigue level (0-100)
 * @param previousFatigue - Previous fatigue level, if available
 * @returns true if the muscle is in the supercompensation window
 */
export function isInSupercompensation(
  currentFatigue: number,
  previousFatigue?: number,
): boolean {
  const inChargedRange =
    currentFatigue >= THRESHOLDS.charged && currentFatigue <= 45;
  if (!inChargedRange) return false;

  // If we have previous data, verify fatigue actually dropped from above
  if (previousFatigue !== undefined) {
    return previousFatigue > 45;
  }

  // Without history, we rely on the fatigue being in the charged range alone
  return true;
}
