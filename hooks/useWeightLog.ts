import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import type { WeightLogEntry } from "../src/data/mealTypes";
import { loadWeightLog, saveWeightLog } from "../lib/mealStorage";

function generateId(): string {
  return `wt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useWeightLog(seedWeightKg?: number) {
  const [entries, setEntries] = useState<WeightLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const entriesRef = useRef<WeightLogEntry[]>([]);
  const seededRef = useRef(false);

  // ── Load from storage, seed from profile if empty ─────────────────
  const reload = useCallback(async () => {
    try {
      const saved = await loadWeightLog();
      if (saved.length === 0 && seedWeightKg && seedWeightKg > 0 && !seededRef.current) {
        seededRef.current = true;
        const seed: WeightLogEntry = {
          id: generateId(),
          date: todayStr(),
          weightKg: Math.round(seedWeightKg * 100) / 100,
          loggedAt: new Date().toISOString(),
          source: "healthkit",
        };
        const seeded = [seed];
        entriesRef.current = seeded;
        setEntries(seeded);
        await saveWeightLog(seeded);
      } else {
        // Backfill source for entries created before source tracking was added
        let needsSave = false;
        const patched = saved.map((e) => {
          if (!e.source) {
            needsSave = true;
            return { ...e, source: e.id.startsWith("wt-hk-") ? "healthkit" as const : "manual" as const };
          }
          return e;
        });
        if (needsSave) await saveWeightLog(patched);
        entriesRef.current = patched;
        setEntries(patched);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [seedWeightKg]);

  // ── Mount: initial load ─────────────────────────────────────────────
  useEffect(() => {
    reload();
  }, [reload]);

  // ── Add entry (one per day — replaces existing) ─────────────────────
  const addEntry = useCallback(
    async (weightKg: number, date?: string) => {
      try {
        const entryDate = date ?? todayStr();
        const entry: WeightLogEntry = {
          id: generateId(),
          date: entryDate,
          weightKg,
          loggedAt: new Date().toISOString(),
          source: "manual",
        };
        const prev = entriesRef.current;
        // Replace any existing entry for the same date
        const filtered = prev.filter((e) => e.date !== entryDate);
        const updated = [...filtered, entry];
        entriesRef.current = updated;
        setEntries(updated);
        await saveWeightLog(updated);
        return entry;
      } catch {
        // silent
      }
    },
    [],
  );

  // ── Delete entry ────────────────────────────────────────────────────
  const deleteEntry = useCallback(async (id: string) => {
    try {
      const prev = entriesRef.current;
      const updated = prev.filter((e) => e.id !== id);
      if (updated.length === prev.length) return;
      entriesRef.current = updated;
      setEntries(updated);
      await saveWeightLog(updated);
    } catch {
      // silent
    }
  }, []);

  // ── Derived: sorted by date ascending ───────────────────────────────
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  );

  // ── Derived: most recent entry ──────────────────────────────────────
  const latestEntry = useMemo(
    () => (sortedEntries.length ? sortedEntries[sortedEntries.length - 1] : undefined),
    [sortedEntries],
  );

  return {
    entries,
    sortedEntries,
    latestEntry,
    loading,
    addEntry,
    deleteEntry,
    reload,
  };
}
