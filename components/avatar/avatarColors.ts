/**
 * Color utilities for the parameterized Locke avatar.
 * Derives lighter/darker shades from a base hex color.
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  if (!result) return { r: 139, g: 115, b: 85 }; // default fur fallback
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) =>
        clamp(x)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Make a color lighter by blending toward white. amount: 0-1 */
export function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

/** Make a color darker by scaling toward black. amount: 0-1 */
export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** Return hex + alpha suffix for RN style props */
export function withAlpha(hex: string, alpha: number): string {
  const a = clamp(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return hex + a;
}
