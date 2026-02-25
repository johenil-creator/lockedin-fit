export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 6, md: 8, lg: 12, xl: 16, full: 999 } as const;
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
  bg:          "#050D12",   // near-black, cool deep navy
  surface:     "#0A1A24",   // dark navy surface
  primary:     "#5BBCFF",   // ice blue
  primaryText: "#000000",
  text:        "#E0F4FF",   // cool white
  muted:       "#4A7A95",   // muted blue-grey
  mutedBg:     "#0D1F2C",   // slightly lifted dark navy
  border:      "#152535",   // dark navy border
  danger:      "#FF3B30",   dangerText: "#ffffff",
  accent:      "#1E90FF",   accentText: "#ffffff",  // brighter blue accent
  success:     "#00E676",   successText: "#000000",
};

// ── Ice Blue Light ────────────────────────────────────────────────────────────
export const iceBlueLightColors: AppThemeColors = {
  bg:          "#F0F8FF",   // alice blue
  surface:     "#FFFFFF",
  primary:     "#0077CC",   // deep ice blue
  primaryText: "#FFFFFF",
  text:        "#0A1E2E",   // near-black navy
  muted:       "#4A7A95",
  mutedBg:     "#E0F0FF",
  border:      "#B8D8F0",
  danger:      "#E53E3E",   dangerText: "#ffffff",
  accent:      "#0055AA",   accentText: "#ffffff",
  success:     "#00994A",   successText: "#ffffff",
};

// ── Viridian Green Laser ──────────────────────────────────────────────────────
export const lockdInColors: AppThemeColors = {
  bg: "#07100A", surface: "#0F1F14",
  primary: "#00FF6A", primaryText: "#000000",
  text: "#E8FFF0", muted: "#4A7A58", mutedBg: "#131F16", border: "#1E3828",
  danger: "#FF3B30", dangerText: "#ffffff",
  accent: "#40826D", accentText: "#ffffff",
  success: "#00E676", successText: "#000000",
};
export const lightViridianColors: AppThemeColors = {
  bg: "#F0FFF4", surface: "#FFFFFF",
  primary: "#00994A", primaryText: "#FFFFFF",
  text: "#0A2E14", muted: "#4A7A58", mutedBg: "#E8F5EC", border: "#C3E6CC",
  danger: "#E53E3E", dangerText: "#ffffff",
  accent: "#2D6A4F", accentText: "#ffffff",
  success: "#00994A", successText: "#ffffff",
};

// ── Active palette exports ────────────────────────────────────────────────────
export const lightColors: AppThemeColors = lightViridianColors;
export const darkColors:  AppThemeColors = lockdInColors;

// Static export for non-component code that cannot use hooks
export const theme = { colors: lockdInColors, spacing, radius, typography } as const;
