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

// ── Viridian Premium Dark ─────────────────────────────────────────────────────
export const lockdInColors: AppThemeColors = {
  bg:          "#0D1117",   // rich dark charcoal (GitHub dark-inspired)
  surface:     "#161B22",   // elevated card surface with subtle warmth
  primary:     "#00E85C",   // slightly toned-down viridian — still punchy for CTAs
  primaryText: "#000000",
  text:        "#E6EDF3",   // soft off-white, easy on the eyes
  muted:       "#7D8590",   // neutral warm grey (not green-tinted)
  mutedBg:     "#1C2128",   // subtle lift from bg for inputs/secondary surfaces
  border:      "#30363D",   // visible but soft border — not green
  danger:      "#F85149",   dangerText: "#ffffff",
  accent:      "#3FB68B",   accentText: "#ffffff",  // muted teal-green for secondary UI
  success:     "#3FB950",   successText: "#000000",  // GitHub-style muted green
};
export const lightViridianColors: AppThemeColors = {
  bg:          "#F6F8FA",   // soft warm grey-white
  surface:     "#FFFFFF",
  primary:     "#1A7F37",   // deep forest viridian
  primaryText: "#FFFFFF",
  text:        "#1F2328",   // near-black warm
  muted:       "#656D76",   // neutral grey
  mutedBg:     "#EFF2F5",   // soft grey for inputs
  border:      "#D0D7DE",   // light neutral border
  danger:      "#CF222E",   dangerText: "#ffffff",
  accent:      "#2D6A4F",   accentText: "#ffffff",
  success:     "#1A7F37",   successText: "#ffffff",
};

// ── Evolution Path glow tokens ────────────────────────────────────────────────
export const glowColors = {
  viridian:       "#00E85C",
  viridianMuted:  "#00E85C60",
  viridianDim:    "#00E85C25",
  lockedOverlay:  "#0D111780",
  pathLine:       "#00E85C40",
  pathLineLit:    "#00E85C",
  nodeBg:         "#161B22",
  currentPulse:   "#00E85CCC",
} as const;

// ── Active palette exports ────────────────────────────────────────────────────
export const lightColors: AppThemeColors = lightViridianColors;
export const darkColors:  AppThemeColors = lockdInColors;

// Static export for non-component code that cannot use hooks
export const theme = { colors: lockdInColors, spacing, radius, typography } as const;
