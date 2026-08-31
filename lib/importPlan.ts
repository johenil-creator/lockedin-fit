/**
 * importPlan.ts — Import pipeline for workout plan CSV/Excel/JSON files.
 *
 * Extracted from plan.tsx to keep parsing logic independently testable.
 * Handles: CSV, Excel (.xlsx), Google Sheets URL, and JSON exports.
 */

import type { Exercise } from "./types";
import { isExerciseTimed } from "./loadEngine/classifier";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DayGroup = { day: string; exercises: Exercise[] };
export type WeekGroup = { week: string; days: DayGroup[] };

export type ParsedPlanSummary = {
  totalWeeks: number;
  totalDays: number;
  totalExercises: number;
  missingSetsReps: number; // exercises lacking both sets and reps
};

export type ValidationResult =
  | { valid: false; error: string }
  | { valid: true; warnings: string[]; summary: ParsedPlanSummary };

// ── Constants ─────────────────────────────────────────────────────────────────

/** Reject files larger than this. */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// ── Alternative-name parsing ──────────────────────────────────────────────────

/**
 * Equipment-only prefixes — when a name consists solely of one of these words,
 * it carries no noun and needs the noun extracted from the second alternative.
 * e.g. "Barbell or Dumbbell Curls" → partA="Barbell", partB="Dumbbell Curls"
 *      → altA = "Barbell Curls", altB = "Dumbbell Curls"
 */
const EQUIPMENT_PREFIX_RE = /^(barbell|dumbbell|cable|band|machine|smith|kettlebell|bodyweight|bw|ez[- ]?bar|trap[- ]?bar|hex[- ]?bar)$/i;

/**
 * Parse exercise names that list alternatives (e.g. "Barbell or Dumbbell Curl",
 * "Pull-ups (or Chin-ups)", "Bench Press / Dumbbell Press").
 *
 * Returns `primary` (the name to use by default) and `alternatives` (full list,
 * including primary) when multiple options exist; just `primary` when the name
 * is unambiguous.
 */
function parseAlternativeNames(raw: string): { primary: string; alternatives?: string[] } {
  // Pattern 1: "Name [or Alternative]" / "Name (or Alternative)"
  const bracketMatch = raw.match(/^(.+?)\s*[\[(]or\s+([^\])]+)[\])]\s*$/i);
  if (bracketMatch) {
    const a = bracketMatch[1].trim();
    const b = bracketMatch[2].trim();
    return { primary: a, alternatives: [a, b] };
  }

  // Pattern 2: "Name / Alternative" — treat slash as OR
  const slashIdx = raw.indexOf('/');
  if (slashIdx > 0) {
    const a = raw.slice(0, slashIdx).trim();
    const b = raw.slice(slashIdx + 1).trim();
    if (a.length >= 2 && b.length >= 2) {
      return { primary: a, alternatives: [a, b] };
    }
  }

  // Pattern 3: "EquipWord or EquipWord? Noun" — e.g. "Barbell or Dumbbell Curls"
  const orMatch = raw.match(/^(.+?)\s+or\s+(.+)$/i);
  if (orMatch) {
    const partA = orMatch[1].trim();
    const partB = orMatch[2].trim();
    if (EQUIPMENT_PREFIX_RE.test(partA)) {
      // partA is equipment-only; extract noun from partB
      const bWords = partB.split(/\s+/);
      if (EQUIPMENT_PREFIX_RE.test(bWords[0]) && bWords.length > 1) {
        const noun = bWords.slice(1).join(' ');
        const altA = `${partA} ${noun}`;
        return { primary: altA, alternatives: [altA, partB] };
      }
      // partB doesn't start with an equipment word — use partB as-is for altB
      const altA = partA; // e.g. "Barbell" alone — imperfect but user will see the choice
      return { primary: altA, alternatives: [altA, partB] };
    }
    // Generic "A or B" — both parts are full exercise names
    return { primary: partA, alternatives: [partA, partB] };
  }

  return { primary: raw };
}

// ── Isometric-note detection ──────────────────────────────────────────────────

/**
 * Returns true when a notes/comments cell indicates the set should be held
 * isometrically (time-based) rather than counted in reps.
 */
const ISOMETRIC_NOTE_RE = /\b(iso(?:metric)?(?:\s+hold)?|static\s+hold)\b/i;
function notesIndicateTimed(notes: string): boolean {
  return ISOMETRIC_NOTE_RE.test(notes);
}

// ── Side-detection ────────────────────────────────────────────────────────────

// Matches side suffixes like "(Left)", "(R)", "- Left Leg", " L", " R"
const SIDE_SUFFIX_RE = /\s*[\(\[]\s*(left|right|l|r)\s*[\)\]]\s*$|\s*[-–—]\s*(left|right)\s*(leg|arm|side)?\s*$|\s+([LR])\s*$/i;
// Matches "per side" / "each side" in notes/comments
const PER_SIDE_NOTE_RE = /\bper\s*side\b|\beach\s*side\b|\beach\s*leg\b|\beach\s*arm\b/i;

function extractSide(raw: string): { side: 'L' | 'R' | null; cleaned: string } {
  const match = raw.match(SIDE_SUFFIX_RE);
  if (!match) return { side: null, cleaned: raw };
  const token = (match[1] || match[2] || match[4] || '').toLowerCase();
  const side: 'L' | 'R' = /^(l|left)$/.test(token) ? 'L' : 'R';
  return { side, cleaned: raw.replace(SIDE_SUFFIX_RE, '').trim() };
}

// ── URL parsing ───────────────────────────────────────────────────────────────

export function parseGoogleSheetsUrl(url: string): { id: string; gid?: string } | null {
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  return { id: match[1], gid: gidMatch?.[1] };
}

export function looksLikeHtml(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith("<!") || t.startsWith("<html") || t.startsWith("<HTML");
}

// ── Sanitizers ───────────────────────────────────────────────────────────────

/**
 * Sanitize a numeric cell value. Returns the original string if it's a
 * reasonable number within [min, max], otherwise returns "" so the app
 * falls back to its default.
 *
 * Guards against Excel date serial numbers (e.g. 44355) leaking through
 * as reps or sets when raw:false is not applied.
 */
function sanitizeNumeric(val: string, min: number, max: number): string {
  if (!val) return "";
  // Handle ranges like "8-12" — keep as-is (session screen parses these)
  if (/^\d+\s*[-–]\s*\d+$/.test(val)) return val;
  const n = parseInt(val, 10);
  if (isNaN(n) || n < min || n > max) return "";
  return String(n);
}

/**
 * Parse rest time from various spreadsheet formats into seconds string.
 * Handles: "90", "1:30", "1 min", "60s", "1-2 min", "2:00".
 * Returns "" if unparseable (falls back to default 90s in session).
 */
function sanitizeRestTime(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();

  // "M:SS" format (e.g. "1:30" → 90, "2:00" → 120)
  const mmss = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (mmss) {
    const secs = parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10);
    if (secs > 0 && secs <= 600) return String(secs);
    return "";
  }

  // "N min" or "N minutes" (e.g. "2 min" → 120)
  const minMatch = trimmed.match(/^(\d+)\s*min/i);
  if (minMatch) {
    const secs = parseInt(minMatch[1], 10) * 60;
    if (secs > 0 && secs <= 600) return String(secs);
    return "";
  }

  // "Ns" format (e.g. "90s" → 90)
  const secMatch = trimmed.match(/^(\d+)\s*s(?:ec)?/i);
  if (secMatch) {
    const secs = parseInt(secMatch[1], 10);
    if (secs > 0 && secs <= 600) return String(secs);
    return "";
  }

  // Plain number — validate it's a reasonable rest time in seconds
  const n = parseInt(trimmed, 10);
  if (!isNaN(n) && n >= 10 && n <= 600) return String(n);

  // Unreasonable value (e.g. Excel date serial) — discard
  return "";
}

// ── Timed reps parser ─────────────────────────────────────────────────────────

/**
 * Parses a reps string that may contain a time expression and returns the
 * numeric seconds as a string suitable for storage in the `reps` field.
 *
 * Examples:
 *   "8s hold"      → "8"
 *   "8s"           → "8"
 *   "8 sec hold"   → "8"
 *   "8 seconds"    → "8"
 *   "20-30s"       → "20"   (lower bound of range)
 *   "20-30 sec"    → "20"
 *   "30-45s"       → "30"
 *   "max"          → "0"    (0 signals open-ended countup mode)
 *   "max hold"     → "0"
 *   "AMRAP"        → "0"    (as many reps as possible → countup)
 *   "failure"      → "0"
 *   "hold"         → "0"    (standalone "hold" → countup)
 *   "8"            → "8"    (already numeric — pass through)
 *   "6-8"          → "6-8"  (rep range — pass through unchanged, not timed)
 *   "8 each"       → "8"    (strip "each")
 *   "10 each"      → "10"
 * Returns null if the string does not look time-based at all (caller keeps original).
 */
export function parseTimedReps(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  // "max", "max hold", "max effort", etc. → 0 (countup mode)
  if (trimmed === "max" || trimmed.startsWith("max ")) return "0";

  // "AMRAP" (as many reps/rounds as possible) → 0 (countup mode)
  if (trimmed === "amrap") return "0";

  // "failure", "to failure" → 0 (countup mode)
  if (trimmed === "failure" || trimmed === "to failure") return "0";

  // "hold" (standalone) → 0 (countup mode)
  if (trimmed === "hold") return "0";

  // "20-30s", "20-30 sec", "20-30 seconds" — timed range, take lower bound
  const timedRange = trimmed.match(/^(\d+)\s*[-–]\s*\d+\s*s(?:ec(?:onds?)?)?/);
  if (timedRange) return timedRange[1];

  // "8s hold", "8s each", "15s", "8sec", "8 sec", "8 seconds", "8 second"
  const secMatch = trimmed.match(/^(\d+)\s*s(?:ec(?:onds?)?)?\b/);
  if (secMatch) return secMatch[1];

  // "N each" — strip "each", return number
  const eachMatch = trimmed.match(/^(\d+)\s+each$/);
  if (eachMatch) return eachMatch[1];

  // Plain number — pass through as-is
  if (/^\d+$/.test(trimmed)) return trimmed;

  // Plain rep range like "6-8" — not timed, return null so caller keeps original
  if (/^\d+\s*[-–]\s*\d+$/.test(trimmed)) return null;

  return null;
}

// ── Core parser ───────────────────────────────────────────────────────────────

/**
 * Universal parser for 2D string arrays (CSV or Excel rows).
 *
 * Handles two layouts:
 *  A) Simple — first row is the real header (Week, Day, Exercise, Sets, Reps, Weight, Comments)
 *  B) Complex — metadata rows precede the real header, which may repeat once per week
 *     (e.g. Jeff Nippard-style: rows of setup info, then ",Week 1,Exercise,Warm-up Sets,Working Sets,...")
 *
 * Strategy:
 *  1. Scan rows until we find one where a cell exactly equals "exercise" (case-insensitive).
 *     That row is the header.
 *  2. Map column indices for each field using exact-then-partial matching; prefer
 *     "working sets" over "warm-up sets".
 *  3. Walk remaining rows:
 *     - If a row has "exercise" in the exercise column → it's a repeated week-header; extract week.
 *     - The column just before "exercise" carries day-session labels (e.g. "FULL BODY 1:").
 *     - Forward-fill currentWeek and currentDay.
 */
export function smartParse(rawInput: unknown[][]): Exercise[] {
  // Normalize: ensure every row is a dense array of strings (no nulls, numbers, or holes)
  const rawRows: string[][] = rawInput
    .filter((r): r is unknown[] => Array.isArray(r))
    .map(row => Array.from({ length: row.length }, (_, i) => String(row[i] ?? "")));

  const cell = (row: string[], i: number) =>
    i >= 0 && i < row.length ? row[i].trim() : "";

  // 1. Find header row
  let hIdx = -1;
  let exCol = -1;
  for (let i = 0; i < rawRows.length; i++) {
    for (let j = 0; j < rawRows[i].length; j++) {
      const val = rawRows[i][j].toLowerCase().trim();
      if (val === "exercise" || val === "exercise name" || val === "exercises") {
        hIdx = i; exCol = j; break;
      }
    }
    if (hIdx >= 0) break;
  }
  if (hIdx < 0) return [];

  // 2. Build column index map
  const hRow = rawRows[hIdx].map(c => c.toLowerCase().trim());
  const indexOf = (...terms: string[]): number => {
    for (const t of terms) { const i = hRow.indexOf(t); if (i >= 0) return i; }
    for (const t of terms) { const i = hRow.findIndex(h => h.includes(t)); if (i >= 0) return i; }
    return -1;
  };

  // Prefer "working sets" over "warm-up sets"
  const setCol = indexOf("working sets", "working set", "sets", "set");
  const repCol = indexOf("reps", "rep", "repetition");
  const wtCol  = indexOf("load (lbs)", "load", "weight", "kg", "lbs");
  const ntCol  = indexOf("notes", "note", "comments", "comment", "cue");
  const wuCol  = indexOf("warm-up sets", "warmup sets", "warm up sets", "warmup", "wu sets");
  const rtCol  = indexOf("rest time", "rest (sec)", "rest (seconds)", "rest", "recovery");

  // Explicit week/day columns (simple layouts)
  const wkColIdx = indexOf("week", "wk");
  const dyColIdx = indexOf("day", "session");
  const hasExplicitWeek = wkColIdx >= 0 && (hRow[wkColIdx] === "week" || hRow[wkColIdx] === "wk");
  const hasExplicitDay  = dyColIdx >= 0 && (hRow[dyColIdx] === "day"  || hRow[dyColIdx] === "session");

  // Column immediately left of "exercise" carries day/session info in complex layouts
  const preExCol = exCol > 0 ? exCol - 1 : -1;

  // Seed currentWeek/currentDay from the very first header row (e.g. "Week 1")
  let currentWeek = preExCol >= 0 ? cell(rawRows[hIdx], preExCol) : "";
  if (!currentWeek.toLowerCase().startsWith("week")) currentWeek = "";
  let currentDay = "";

  // Pre-scan rows before the first header for week/day context (vertical-block layouts
  // like "WEEK 1 — BUILD" / "Day 1 · Squat anchor" that appear before the first header row).
  for (let i = 0; i < hIdx; i++) {
    const c0 = rawRows[i][exCol] ? rawRows[i][exCol].trim() : (rawRows[i][0]?.trim() ?? "");
    const wm = c0.match(/^WEEK\s*(\d+)/i);
    if (wm) currentWeek = `Week ${wm[1]}`;
    const dm = c0.match(/^Day\s*(\d+)\b/i);
    if (dm) currentDay = `Day ${dm[1]}`;
  }

  const exercises: Exercise[] = [];

  for (let i = hIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const cellEx = cell(row, exCol);

    // Repeated header row → new week block
    if (cellEx.toLowerCase() === "exercise") {
      if (!hasExplicitWeek && preExCol >= 0) {
        const wk = cell(row, preExCol);
        if (wk.toLowerCase().startsWith("week")) currentWeek = wk;
      }
      continue;
    }

    // Vertical-block week markers: "WEEK 1 — BUILD", "WEEK 2 — PEAK", etc.
    const weekInCell = cellEx.match(/^WEEK\s*(\d+)/i);
    if (weekInCell) { currentWeek = `Week ${weekInCell[1]}`; continue; }

    // Vertical-block day markers: "Day 1 · Squat anchor", "Day 2 · Deadlift anchor", etc.
    const dayInCell = cellEx.match(/^Day\s*(\d+)\b/i);
    if (dayInCell) { currentDay = `Day ${dayInCell[1]}`; continue; }

    // Explicit week/day columns (simple layouts)
    if (hasExplicitWeek) {
      const wk = cell(row, wkColIdx);
      if (wk) currentWeek = /^\d+$/.test(wk) ? `Week ${wk}` : wk;
    }
    if (hasExplicitDay) {
      const dy = cell(row, dyColIdx);
      if (dy) currentDay = /^\d+$/.test(dy) ? `Day ${dy}` : dy;
    }

    // Day/session label from pre-exercise column (complex layouts)
    if (!hasExplicitDay && preExCol >= 0) {
      const pre = cell(row, preExCol);
      const lp = pre.toLowerCase();
      if (pre && !lp.startsWith("week") && !lp.includes("rest") &&
          !lp.startsWith("if you") && !lp.startsWith("important") && pre.length > 1) {
        currentDay = pre.replace(/:$/, "").trim();
      }
    }

    // Skip non-exercise rows
    if (!cellEx || cellEx.length < 2) continue;
    const lc = cellEx.toLowerCase();
    if (lc.includes("rest day") || lc.startsWith("if you") || lc.startsWith("important")) continue;

    // Skip metadata/setup rows common in program templates
    if (
      lc.includes("1rm") ||
      lc.includes("1-rep max") ||
      lc.startsWith("your ") ||
      lc === "legend:" ||
      lc.startsWith("legend") ||
      lc.startsWith("units") ||
      lc.startsWith("warm-up sets =") ||
      /^calisthenics[-\s]/.test(lc) ||
      /^\d+-day\s/.test(lc)
    ) continue;

    // Detect side suffix before any other name cleaning
    const sideResult = extractSide(cellEx);
    const detectedSide = sideResult.side;
    const cellExNoSide = sideResult.cleaned;

    // Strip superset prefixes: "A1: ", "A2: ", "B1: ", "B2: ", etc.
    const stripped = cellExNoSide.replace(/^[A-Z]\d+:\s*/i, "").trim();

    // Parse alternative names (e.g. "Barbell or Dumbbell Curl" → two options)
    const { primary: baseName, alternatives: rawAlts } = parseAlternativeNames(stripped || cellExNoSide);

    // Detect "per side" / "each side" annotations in the notes cell
    const notesCell = cell(row, ntCol) || '';
    const perSideFromNote = PER_SIDE_NOTE_RE.test(notesCell);

    // When notes indicate isometric and the name doesn't already trigger timed
    // detection, append "(Isometric)" so isExerciseTimed() returns true everywhere
    // (session screen, XP calc, muscle mapping, etc.) without changing the core name.
    const timedByNote = notesIndicateTimed(notesCell) && !isExerciseTimed(baseName);
    const suffix = timedByNote ? ' (Isometric)' : '';

    const exerciseName = baseName + suffix;
    // Apply the same suffix to each alternative so all options are consistently timed
    const alternatives = rawAlts?.map(a => a + suffix);

    const repsRaw = sanitizeNumeric(cell(row, repCol), 1, 100) || cell(row, repCol);
    const reps = isExerciseTimed(exerciseName)
      ? (parseTimedReps(repsRaw) ?? repsRaw)
      : repsRaw;

    exercises.push({
      exercise:    exerciseName,
      sets:        sanitizeNumeric(cell(row, setCol), 1, 20),
      reps,
      weight:      "",              // always ignored — app uses its own 1RM / load engine
      comments:    notesCell,
      warmUpSets:  sanitizeNumeric(cell(row, wuCol), 0, 10),
      restTime:    sanitizeRestTime(cell(row, rtCol)),
      week:        currentWeek,
      day:         currentDay,
      isUnilateral: (detectedSide !== null || perSideFromNote) ? true : undefined,
      side:         detectedSide,
      alternatives,
    });
  }

  const filtered = exercises.filter(ex => ex.exercise.length >= 2);

  // Merge consecutive L/R rows for the same exercise+week+day into one unilateral entry
  const merged: typeof filtered = [];
  let i = 0;
  while (i < filtered.length) {
    const curr = filtered[i];
    const next = filtered[i + 1];

    const sameExercise =
      next !== undefined &&
      curr.exercise === next.exercise &&
      curr.week === next.week &&
      curr.day === next.day &&
      curr.side === 'L' && next.side === 'R' &&
      curr.sets === next.sets; // only merge if set counts match

    if (sameExercise) {
      // Merge: keep first entry, mark as unilateral with no explicit side
      merged.push({ ...curr, isUnilateral: true, side: null });
      i += 2; // skip both rows
    } else {
      merged.push(curr);
      i++;
    }
  }

  return merged;
}

// ── Grouping ──────────────────────────────────────────────────────────────────

export function groupByWeekDay(exercises: Exercise[]): WeekGroup[] {
  const weekMap = new Map<string, Map<string, Exercise[]>>();
  for (const ex of exercises) {
    const w = ex.week || "Week 1";
    const d = ex.day  || "Day 1";
    if (!weekMap.has(w)) weekMap.set(w, new Map());
    const dayMap = weekMap.get(w)!;
    if (!dayMap.has(d)) dayMap.set(d, []);
    dayMap.get(d)!.push(ex);
  }
  return Array.from(weekMap.entries()).map(([week, dayMap]) => ({
    week,
    days: Array.from(dayMap.entries()).map(([day, exs]) => ({ day, exercises: exs })),
  }));
}

// Derive block label based on position in total weeks (Accumulation → Intensification → Realization)
// Matches 3-block periodization: weeks 1-4 = Accumulation, 5-8 = Intensification, 9+ = Realization
export function getBlockLabel(weekIndex: number, totalWeeks: number): string {
  if (totalWeeks <= 1) return "";
  const blockSize = Math.ceil(totalWeeks / 3);
  if (weekIndex < blockSize) return "Accumulation";
  if (weekIndex < blockSize * 2) return "Intensification";
  return "Realization";
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate exercises parsed from a file before committing to the plan.
 * Returns structured errors/warnings and a summary for the preview sheet.
 */
export function validateParsedPlan(exercises: Exercise[]): ValidationResult {
  if (exercises.length === 0) {
    return {
      valid: false,
      error:
        "No 'Exercise' column found — your sheet needs a column header named 'Exercise'",
    };
  }

  const weekGroups = groupByWeekDay(exercises);
  const totalWeeks = weekGroups.length;
  const totalDays = weekGroups.reduce((acc, wg) => acc + wg.days.length, 0);

  if (totalDays === 0) {
    return {
      valid: false,
      error:
        "No workout days found — make sure your sheet has a Week and Day column",
    };
  }

  const warnings: string[] = [];
  const missingSetsReps = exercises.filter(ex => !ex.sets && !ex.reps).length;

  if (missingSetsReps > 0) {
    const total = exercises.length;
    warnings.push(
      `Found ${total} exercise${total !== 1 ? "s" : ""} across ${totalWeeks} week${totalWeeks !== 1 ? "s" : ""} — but ${missingSetsReps} have no sets/reps data`
    );
  }

  return {
    valid: true,
    warnings,
    summary: { totalWeeks, totalDays, totalExercises: exercises.length, missingSetsReps },
  };
}

// ── JSON import (P1) ──────────────────────────────────────────────────────────

/**
 * Try to parse a JSON export of a plan.
 * Accepted formats:
 *   - Exercise[]  (plain array)
 *   - { name?: string; exercises: Exercise[] }
 */
export function parseJsonPlan(
  jsonText: string
): { name: string; exercises: Exercise[] } | null {
  try {
    const parsed: unknown = JSON.parse(jsonText);

    const stripWeights = (exs: Exercise[]) =>
      exs.map((e) => ({ ...e, weight: "" }));

    if (Array.isArray(parsed)) {
      if (!parsed.every(isExerciseLike)) return null;
      return { name: "Imported Plan", exercises: stripWeights(parsed as Exercise[]) };
    }

    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "exercises" in parsed &&
      Array.isArray((parsed as Record<string, unknown>).exercises)
    ) {
      const obj = parsed as Record<string, unknown>;
      if (!obj.exercises || !(obj.exercises as unknown[]).every(isExerciseLike)) return null;
      return {
        name: typeof obj.name === "string" ? obj.name : "Imported Plan",
        exercises: stripWeights(obj.exercises as Exercise[]),
      };
    }

    return null;
  } catch (e) {
    if (__DEV__) console.warn("[importPlan] caught:", e);
    return null;
  }
}

function isExerciseLike(val: unknown): boolean {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return typeof obj.exercise === "string" && obj.exercise.trim().length >= 2;
}
