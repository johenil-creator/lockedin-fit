/**
 * Locke mascot design tokens.
 * All values derived from the Locke Visual Identity Spec.
 */

// ── Fur palette ───────────────────────────────────────────────────────────────
export const FUR = {
  primary:   "#2E2E38",   // main body
  secondary: "#3D3D4A",   // sides, top
  chest:     "#4A4A58",   // chest / muzzle patch
  earInner:  "#5A5A68",   // ear concave
  outline:   "#1A1A22",   // mouth line, brow stroke
} as const;

// ── Eye colours per theme ─────────────────────────────────────────────────────
export const EYE_VIRIDIAN = {
  irisBase:  "#00E676",
  irisRing:  "#00FF6A",
  pupil:     "#061009",
  sclera:    "#141A15",
  glow:      "#00FF6A",
} as const;

export const EYE_ICE = {
  irisBase:  "#5BBCFF",
  irisRing:  "#A8E0FF",
  pupil:     "#05101A",
  sclera:    "#141C22",
  glow:      "#5BBCFF",
} as const;

// ── Rim glow colours by mood ──────────────────────────────────────────────────
export const RIM_GLOW = {
  neutral:          { color: "#00FF6A", opacity: 0.08 },
  encouraging:      { color: "#00FF6A", opacity: 0.22 },
  celebrating:      { color: "#00FF6A", opacity: 0.50 },
  disappointed:     { color: "#5BBCFF", opacity: 0.12 },
  intense:          { color: "#FF3B30", opacity: 0.28 },
  onboarding_guide: { color: "#00FF6A", opacity: 0.15 },
} as const;

// ── Rank config ───────────────────────────────────────────────────────────────
export type RankKey = "runt" | "scout" | "stalker" | "hunter" | "sentinel" | "alpha" | "apex";

export const RANK_CONFIG: Record<RankKey, {
  eyeRings:        number;   // how many stacked iris rings (1–3)
  glowBlur:        number;   // eye bloom stdDeviation
  glowOpacity:     number;   // eye bloom opacity
  collarVisible:   boolean;
  collarGlow:      boolean;
  rimIntensity:    number;   // multiplier on RIM_GLOW opacity (0.4 → 1.0)
  postureHunch:    number;   // body translate Y offset (positive = lower/hunch)
}> = {
  runt:     { eyeRings: 1, glowBlur: 3,  glowOpacity: 0.5,  collarVisible: false, collarGlow: false, rimIntensity: 0.4, postureHunch: 3  },
  scout:    { eyeRings: 1, glowBlur: 5,  glowOpacity: 0.65, collarVisible: false, collarGlow: false, rimIntensity: 0.6, postureHunch: 1  },
  stalker:  { eyeRings: 1, glowBlur: 6,  glowOpacity: 0.75, collarVisible: false, collarGlow: false, rimIntensity: 0.7, postureHunch: 0  },
  hunter:   { eyeRings: 2, glowBlur: 7,  glowOpacity: 0.85, collarVisible: true,  collarGlow: false, rimIntensity: 0.8, postureHunch: 0  },
  sentinel: { eyeRings: 2, glowBlur: 9,  glowOpacity: 0.90, collarVisible: true,  collarGlow: false, rimIntensity: 0.85,postureHunch: 0  },
  alpha:    { eyeRings: 3, glowBlur: 11, glowOpacity: 0.95, collarVisible: true,  collarGlow: true,  rimIntensity: 0.95,postureHunch: 0  },
  apex:     { eyeRings: 3, glowBlur: 14, glowOpacity: 1.0,  collarVisible: true,  collarGlow: true,  rimIntensity: 1.0, postureHunch: 0  },
} as const;

// ── Mood pose offsets ─────────────────────────────────────────────────────────
export const MOOD_POSE = {
  neutral:          { browY: 0,  armY: 0,   tailAngle: 0   },
  encouraging:      { browY: -1, armY: 0,   tailAngle: 20  },
  celebrating:      { browY: -2, armY: -20, tailAngle: 35  },
  disappointed:     { browY: 5,  armY: 0,   tailAngle: -8  },
  intense:          { browY: 3,  armY: -18, tailAngle: 30  },
  onboarding_guide: { browY: -1, armY: -8,  tailAngle: 10  },
} as const;

// ── Size presets ──────────────────────────────────────────────────────────────
export const SIZE = {
  icon: { canvas: 32,  headR: 10, showBody: false },
  full: { canvas: 160, headR: 44, showBody: true  },
} as const;

// ── Eye geometry (shared between LockeSVG and useLockeAnimation) ──────────────
export const EYE = {
  w:   7.5,   // half-width of eye ellipse
  h:   6,     // half-height of eye ellipse
  gap: 13,    // distance from center to each eye
  /** ry of the eyelid ellipse when fully open */
  lidRY: 6 * 0.55,   // eyeH * 0.55 = 3.3
  /** cy offset of eyelid from eye center (sits above eye midpoint) */
  lidCYOffset: -(6 * 0.5),  // -eyeH * 0.5 = -3
} as const;
