/**
 * importPlan.ts — Import pipeline for workout plan CSV/Excel/JSON files.
 *
 * Extracted from plan.tsx to keep parsing logic independently testable.
 * Handles: CSV, Excel (.xlsx), Google Sheets URL, and JSON exports.
 */

import type { Exercise } from "./types";

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
export function smartParse(rawRows: string[][]): Exercise[] {
  const cell = (row: string[], i: number) =>
    i >= 0 && i < row.length ? (row[i] ?? "").trim() : "";

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

  // Seed currentWeek from the very first header row (e.g. "Week 1")
  let currentWeek = preExCol >= 0 ? cell(rawRows[hIdx], preExCol) : "";
  if (!currentWeek.toLowerCase().startsWith("week")) currentWeek = "";
  let currentDay = "";

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

    // Commit to first option when alternatives are listed:
    //   "Glute-Ham Raise [or Nordic Ham Curl]" → "Glute-Ham Raise"
    //   "Pull-ups (or Chin-ups)"               → "Pull-ups"
    //   "Bench Press / Dumbbell Press"          → "Bench Press"
    //   "Deadlift or RDL"                       → "Deadlift"
    const cleaned = cellEx
      .replace(/\s*[\[(]or\s+[^\])]+[\])]/gi, "")   // [or ...] or (or ...)
      .replace(/\s*\/\s*.+$/, "")                     // " / alternative"
      .replace(/\s+or\s+.+$/i, "")                    // " or alternative"
      .trim();

    exercises.push({
      exercise:   cleaned || cellEx,
      sets:       cell(row, setCol),
      reps:       cell(row, repCol),
      weight:     cell(row, wtCol),
      comments:   cell(row, ntCol),
      warmUpSets: cell(row, wuCol),
      restTime:   cell(row, rtCol),
      week:       currentWeek,
      day:        currentDay,
    });
  }

  return exercises.filter(ex => ex.exercise.length >= 2);
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

    if (Array.isArray(parsed)) {
      if (!parsed.every(isExerciseLike)) return null;
      return { name: "Imported Plan", exercises: parsed as Exercise[] };
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
        exercises: obj.exercises as Exercise[],
      };
    }

    return null;
  } catch {
    return null;
  }
}

function isExerciseLike(val: unknown): boolean {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return typeof obj.exercise === "string" && obj.exercise.trim().length >= 2;
}
