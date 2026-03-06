export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const;
export const typography = {
  title:      { fontSize: 32, fontWeight: "700" as const },
  heading:    { fontSize: 22, fontWeight: "700" as const },
  subheading: { fontSize: 17, fontWeight: "600" as const },
  body:       { fontSize: 15 },
  small:      { fontSize: 13 },
  caption:    { fontSize: 12 },
} as const;

export type AppThemeColors = {
  bg: string; surface: string;
  primary: string; primaryText: string;
  text: string; muted: string; mutedBg: string; border: string;
  danger: string; dangerText: string;
  accent: string; accentText: string;
  success: string; successText: string;
};

// ── Ice Blue Dark (primary brand skin) ───────────────────────────────────────
export const iceBlueDarkColors: AppThemeColors = {
  bg:          "#0D1117",   // rich dark charcoal
  surface:     "#161B22",   // elevated card surface
  primary:     "#58A6FF",   // ice blue
  primaryText: "#000000",
  text:        "#E6EDF3",   // soft off-white
  muted:       "#7D8590",   // neutral grey
  mutedBg:     "#1C2128",   // subtle lift for inputs
  border:      "#30363D",   // soft border
  danger:      "#F85149",   dangerText: "#ffffff",
  accent:      "#1F6FEB",   accentText: "#ffffff",  // brighter blue accent
  success:     "#3FB950",   successText: "#000000",
};

// ── Ice Blue Light ────────────────────────────────────────────────────────────
export const iceBlueLightColors: AppThemeColors = {
  bg:          "#F6F8FA",   // soft grey-white
  surface:     "#FFFFFF",
  primary:     "#0969DA",   // deep ice blue
  primaryText: "#FFFFFF",
  text:        "#1F2328",   // near-black warm
  muted:       "#656D76",   // neutral grey
  mutedBg:     "#EFF2F5",   // soft grey for inputs
  border:      "#D0D7DE",   // light neutral border
  danger:      "#CF222E",   dangerText: "#ffffff",
  accent:      "#0550AE",   accentText: "#ffffff",
  success:     "#1A7F37",   successText: "#ffffff",
};

// ── Phthalo Green Premium Dark ────────────────────────────────────────────────
export const lockdInColors: AppThemeColors = {
  bg:          "#0D1117",   // rich dark charcoal (GitHub dark-inspired)
  surface:     "#161B22",   // elevated card surface with subtle warmth
  primary:     "#00875A",   // deep phthalo green — premium CTA
  primaryText: "#FFFFFF",
  text:        "#E6EDF3",   // soft off-white, easy on the eyes
  muted:       "#9DA5B0",   // lifted grey — passes AA on all dark surfaces
  mutedBg:     "#242C38",   // visible lift from surface for inputs
  border:      "#3D444D",   // clearly visible border
  danger:      "#F85149",   dangerText: "#ffffff",
  accent:      "#006B47",   accentText: "#FFFFFF",   // deep phthalo accent
  success:     "#00875A",   successText: "#FFFFFF",   // phthalo success
};
export const lightViridianColors: AppThemeColors = {
  bg:          "#F6F8FA",   // soft warm grey-white
  surface:     "#FFFFFF",
  primary:     "#005C3A",   // deep phthalo for light mode
  primaryText: "#FFFFFF",
  text:        "#1F2328",   // near-black warm
  muted:       "#656D76",   // neutral grey
  mutedBg:     "#EFF2F5",   // soft grey for inputs
  border:      "#D0D7DE",   // light neutral border
  danger:      "#CF222E",   dangerText: "#ffffff",
  accent:      "#004D31",   accentText: "#ffffff",
  success:     "#005C3A",   successText: "#ffffff",
};

// ── Evolution Path glow tokens ────────────────────────────────────────────────
export const glowColors = {
  viridian:       "#00875A",
  viridianMuted:  "#00875A60",
  viridianDim:    "#00875A25",
  lockedOverlay:  "#0D111780",
  pathLine:       "#00875A40",
  pathLineLit:    "#00875A",
  nodeBg:         "#161B22",
  currentPulse:   "#00875ACC",
} as const;

// ── Workout-specific metric colors (always pure black bg, ignores theme) ──
export const workoutMetricColors = {
  elapsed:   "#FFD60A",   // Yellow — hero timer
  distance:  "#30D158",   // Green
  pace:      "#64D2FF",   // Light blue
  rounds:    "#BF5AF2",   // Purple
  rpe:       "#FF9F0A",   // Orange — intensity
  work:      "#30D158",   // Green — WORK phase
  rest:      "#FF375F",   // Pink — REST phase
  bg:        "#000000",   // Pure black
  label:     "#98989D",   // Small gray label
  ctrlEnd:   "#FF3B30",   // Red — End button
  ctrlPause: "#FFD60A",   // Yellow — Pause button
  ctrlResume:"#30D158",   // Green — Resume button
} as const;

// ── Shadow elevation presets ─────────────────────────────────────────────────
export const shadowLight = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 4,
} as const;

export const shadowMedium = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 6,
} as const;

export const shadowHeavy = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.14,
  shadowRadius: 16,
  elevation: 8,
} as const;

export type ShadowPreset = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};
export type ShadowElevation = 'light' | 'medium' | 'heavy';
export const shadowPresets: Record<ShadowElevation, ShadowPreset> = {
  light: shadowLight,
  medium: shadowMedium,
  heavy: shadowHeavy,
};

// ── Gradient color tokens ───────────────────────────────────────────────────
export const darkGradients = {
  primaryGradient: [lockdInColors.primary, lockdInColors.primary + '00'] as [string, string],
  surfaceGradient: [lockdInColors.surface, lockdInColors.mutedBg] as [string, string],
} as const;

export const lightGradients = {
  primaryGradient: [lightViridianColors.primary, lightViridianColors.primary + '00'] as [string, string],
  surfaceGradient: [lightViridianColors.surface, lightViridianColors.mutedBg] as [string, string],
} as const;

// ── Active palette exports ────────────────────────────────────────────────────
export const lightColors: AppThemeColors = lightViridianColors;
export const darkColors:  AppThemeColors = lockdInColors;

// Static export for non-component code that cannot use hooks
export const theme = { colors: lockdInColors, spacing, radius, typography } as const;
