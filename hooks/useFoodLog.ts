import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  FoodLogEntry,
  MealSlot,
  Macros,
  Recipe,
} from "../src/data/mealTypes";
import { computeDayMacros } from "../lib/mealService";
import { loadFoodLog, saveFoodLog } from "../lib/mealStorage";

type FoodLogMap = Record<string, FoodLogEntry[]>;

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function generateId(): string {
  return `meal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useFoodLog() {
  const [log, setLog] = useState<FoodLogMap>({});
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const logRef = useRef<FoodLogMap>({});

  // ── Load log from storage ────────────────────────────────────────
  const reload = useCallback(async () => {
    try {
      const saved = await loadFoodLog();
      logRef.current = saved;
      setLog(saved);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Mount: initial load ─────────────────────────────────────────
  useEffect(() => {
    reload();
  }, [reload]);

  // ── Add entry ─────────────────────────────────────────────────────
  const addEntry = useCallback(
    async (entry: Omit<FoodLogEntry, "id" | "loggedAt">) => {
      try {
        const full: FoodLogEntry = {
          ...entry,
          id: generateId(),
          loggedAt: new Date().toISOString(),
        };
        const prev = logRef.current;
        const dayEntries = prev[full.date] ?? [];
        const updated: FoodLogMap = {
          ...prev,
          [full.date]: [...dayEntries, full],
        };
        logRef.current = updated;
        setLog(updated);
        await saveFoodLog(updated);
        return full;
      } catch {
        // silent
      }
    },
    [],
  );

  // ── Remove entry ──────────────────────────────────────────────────
  const removeEntry = useCallback(async (date: string, entryId: string) => {
    try {
      const prev = logRef.current;
      const dayEntries = prev[date];
      if (!dayEntries) return;
      const filtered = dayEntries.filter((e) => e.id !== entryId);
      if (filtered.length === dayEntries.length) return;
      const updated: FoodLogMap = { ...prev, [date]: filtered };
      logRef.current = updated;
      setLog(updated);
      await saveFoodLog(updated);
    } catch {
      // silent
    }
  }, []);

  // ── Log a recipe as a food entry ──────────────────────────────────
  const logRecipe = useCallback(
    async (recipe: Recipe, date: string, slot: MealSlot) => {
      return addEntry({
        date,
        slot,
        recipeId: recipe.id,
        name: recipe.name,
        flag: recipe.flag,
        macros: { ...recipe.macros },
      });
    },
    [addEntry],
  );

  // ── Set selected date ─────────────────────────────────────────────
  const setDate = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  // ── Derived: day entries ──────────────────────────────────────────
  const dayEntries: FoodLogEntry[] = useMemo(
    () => log[selectedDate] ?? [],
    [log, selectedDate],
  );

  // ── Derived: day macros ───────────────────────────────────────────
  const dayMacros: Macros = useMemo(
    () => computeDayMacros(dayEntries),
    [dayEntries],
  );

  // ── Check if a slot is logged for a given date ────────────────────
  const isSlotLogged = useCallback(
    (date: string, slot: MealSlot): boolean => {
      const entries = log[date];
      if (!entries) return false;
      return entries.some((e) => e.slot === slot);
    },
    [log],
  );

  return {
    log,
    selectedDate,
    dayEntries,
    dayMacros,
    loading,
    addEntry,
    removeEntry,
    logRecipe,
    setDate,
    isSlotLogged,
    reload,
  };
}
