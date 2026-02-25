import type { Exercise } from "./types";

export type DayGroup = { day: string; exercises: Exercise[] };
export type WeekGroup = { week: string; days: DayGroup[] };

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
