/**
 * Sanitize weight input.
 * - Up to 3 whole digits (max 999)
 * - Decimal allowed with up to 2 decimal places (e.g. "225.5", "100.05")
 */
export function sanitizeWeight(raw: string): string {
  let v = raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

  const dot = v.indexOf(".");
  if (dot === -1) {
    return v.slice(0, 3);
  }

  const whole = v.slice(0, dot).slice(0, 3);
  const frac = v.slice(dot + 1).slice(0, 2);
  return whole + "." + frac;
}
