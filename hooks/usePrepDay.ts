/**
 * usePrepDay — Orchestrator hook for the meal prep system.
 *
 * Loads prep plan, progress, and preferences in a single batch read.
 * Exposes actions for generating plans, toggling tasks, and resetting.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { PrepDayPlan, PrepProgress, PrepPreferences } from "../src/data/mealTypes";
import {
  loadPrepPlan,
  savePrepPlan,
  loadPrepProgress,
  savePrepProgress,
  loadPrepPrefs,
  savePrepPrefs,
  loadMealPlan,
  loadMealPrefs,
} from "../lib/mealStorage";
import { analyzePrepPlan } from "../lib/prepAnalysisEngine";
import { getWeekKey } from "../lib/mealService";

type UsePrepDayReturn = {
  plan: PrepDayPlan | null;
  progress: PrepProgress;
  prefs: PrepPreferences;
  loading: boolean;
  /** Generate (or regenerate) the prep plan from the current weekly meal plan */
  generatePlan: (prepDayIndex?: number, overrideScopeDays?: number) => Promise<void>;
  /** Toggle a task as complete/incomplete */
  toggleTask: (taskId: string) => void;
  /** Mark prep session as started */
  startPrepSession: () => void;
  /** Update prep preferences */
  updatePrefs: (updates: Partial<PrepPreferences>) => Promise<void>;
  /** Reset progress for a new week */
  resetProgress: () => Promise<void>;
  /** Reload all data from storage */
  reload: () => Promise<void>;
  /** Percentage of tasks completed */
  completionPercent: number;
  /** Whether all tasks are done */
  allDone: boolean;
  /** The plan's start day index (Mon=0..Sun=6) */
  planStartDay: number;
};

const EMPTY_PROGRESS: PrepProgress = {
  weekKey: "",
  completedTaskIds: [],
  startedAt: null,
  completedAt: null,
};

export function usePrepDay(): UsePrepDayReturn {
  const [plan, setPlan] = useState<PrepDayPlan | null>(null);
  const [progress, setProgress] = useState<PrepProgress>(EMPTY_PROGRESS);
  const [prefs, setPrefs] = useState<PrepPreferences>({
    enabled: false,
    prepDay: 0,
    servings: 1,
    onboardingComplete: false,
    scopeDays: 3,
  });
  const [loading, setLoading] = useState(true);
  const [planStartDay, setPlanStartDay] = useState(0);

  // Ref for debouncing toggle saves
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<PrepProgress>(EMPTY_PROGRESS);

  // ── Load all data in parallel on mount ──────────────────────────────
  const reload = useCallback(async () => {
    const [savedPlan, savedProgress, savedPrefs, mealPrefs] = await Promise.all([
      loadPrepPlan(),
      loadPrepProgress(),
      loadPrepPrefs(),
      loadMealPrefs(),
    ]);
    if (savedPlan) setPlan(savedPlan);
    const p = savedProgress ?? EMPTY_PROGRESS;
    progressRef.current = p;
    setProgress(p);
    setPrefs(savedPrefs);
    setPlanStartDay(mealPrefs.startDayIndex ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [reload]);

  // ── Generate plan from current weekly meal plan ─────────────────────
  const generatePlan = useCallback(async (prepDayIndex?: number, overrideScopeDays?: number) => {
    const [mealPlan, mealPrefs] = await Promise.all([loadMealPlan(), loadMealPrefs()]);
    if (!mealPlan.weekKey) return;

    const scope = overrideScopeDays ?? prefs.scopeDays ?? 3;
    const currentWeekKey = getWeekKey(0);
    const planIsNextWeek = mealPlan.weekKey > currentWeekKey;

    // Use the plan's start day as the effective prep start when the plan hasn't
    // started yet — don't prep meals for days before the plan begins.
    const startDay = mealPrefs.startDayIndex ?? 0;
    const jsDay = new Date().getDay();
    const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
    const planNotStartedYet = planIsNextWeek || todayIdx < startDay;
    const effectivePrepDay = planNotStartedYet
      ? startDay
      : (prepDayIndex ?? prefs.prepDay);

    setPlanStartDay(startDay);
    const newPlan = analyzePrepPlan(mealPlan, prefs.servings, effectivePrepDay, planIsNextWeek, scope);
    setPlan(newPlan);
    await savePrepPlan(newPlan);

    // Preserve progress if same week and tasks overlap
    const currentProgress = progressRef.current;
    if (currentProgress.weekKey === newPlan.weekKey) {
      // Keep completed tasks that still exist in the new plan
      const newTaskIds = new Set(newPlan.tasks.map((t) => t.id));
      const keptCompleted = currentProgress.completedTaskIds.filter((id) =>
        newTaskIds.has(id),
      );
      const preserved: PrepProgress = {
        ...currentProgress,
        weekKey: newPlan.weekKey,
        completedTaskIds: keptCompleted,
        completedAt:
          keptCompleted.length === newPlan.tasks.length && newPlan.tasks.length > 0
            ? currentProgress.completedAt
            : null,
      };
      progressRef.current = preserved;
      setProgress(preserved);
      await savePrepProgress(preserved);
    } else {
      // Different week — full reset
      const freshProgress: PrepProgress = {
        weekKey: newPlan.weekKey,
        completedTaskIds: [],
        startedAt: null,
        completedAt: null,
      };
      progressRef.current = freshProgress;
      setProgress(freshProgress);
      await savePrepProgress(freshProgress);
    }
  }, [prefs.servings, prefs.prepDay, prefs.scopeDays]);

  // ── Toggle task completion (debounced save) ───────────────────────
  const toggleTask = useCallback(
    (taskId: string) => {
      const prev = progressRef.current;
      const isCompleted = prev.completedTaskIds.includes(taskId);
      const completedTaskIds = isCompleted
        ? prev.completedTaskIds.filter((id) => id !== taskId)
        : [...prev.completedTaskIds, taskId];

      const allDone =
        plan != null && completedTaskIds.length === plan.tasks.length;

      const updated: PrepProgress = {
        ...prev,
        completedTaskIds,
        completedAt: allDone ? new Date().toISOString() : null,
      };

      progressRef.current = updated;
      setProgress(updated);

      // Debounce save — coalesce rapid toggles into one write
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        savePrepProgress(progressRef.current);
      }, 300);
    },
    [plan],
  );

  // ── Start prep session ──────────────────────────────────────────────
  const startPrepSession = useCallback(() => {
    const prev = progressRef.current;
    if (prev.startedAt) return;
    const updated = { ...prev, startedAt: new Date().toISOString() };
    progressRef.current = updated;
    setProgress(updated);
    savePrepProgress(updated);
  }, []);

  // ── Update preferences ──────────────────────────────────────────────
  const updatePrefs = useCallback(
    async (updates: Partial<PrepPreferences>) => {
      setPrefs((prev) => {
        const updated = { ...prev, ...updates };
        savePrepPrefs(updated);
        return updated;
      });
    },
    [],
  );

  // ── Reset progress ──────────────────────────────────────────────────
  const resetProgress = useCallback(async () => {
    const fresh: PrepProgress = {
      weekKey: plan?.weekKey ?? "",
      completedTaskIds: [],
      startedAt: null,
      completedAt: null,
    };
    progressRef.current = fresh;
    setProgress(fresh);
    await savePrepProgress(fresh);
  }, [plan?.weekKey]);

  // ── Derived values ──────────────────────────────────────────────────
  const completionPercent = useMemo(() => {
    if (!plan || plan.tasks.length === 0) return 0;
    return Math.round(
      (progress.completedTaskIds.length / plan.tasks.length) * 100,
    );
  }, [plan, progress.completedTaskIds.length]);

  const allDone = useMemo(() => {
    if (!plan || plan.tasks.length === 0) return false;
    return progress.completedTaskIds.length === plan.tasks.length;
  }, [plan, progress.completedTaskIds.length]);

  return {
    plan,
    progress,
    prefs,
    loading,
    generatePlan,
    toggleTask,
    startPrepSession,
    updatePrefs,
    resetProgress,
    reload,
    completionPercent,
    allDone,
    planStartDay,
  };
}
