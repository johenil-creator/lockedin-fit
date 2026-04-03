import { useState, useEffect, useCallback, useRef } from "react";
import type {
  CuisineTier,
  MealSlot,
  Macros,
  WeeklyMealPlan,
  MealPreferences,
  DietaryFilter,
} from "../src/data/mealTypes";
import { recipeCatalog, recipeMap } from "../src/data/recipeCatalog/index";
import {
  getWeekKey,
  generateWeeklyPlan,
  computeMacroTargets,
} from "../lib/mealService";
import {
  loadMealPlan,
  saveMealPlan,
  loadMealPrefs,
  saveMealPrefs,
} from "../lib/mealStorage";
import { useProfileContext } from "../contexts/ProfileContext";

const DEFAULT_PLAN: WeeklyMealPlan = {
  weekKey: "",
  tier: "scavenge",
  generatedAt: "",
  seed: 0,
  days: [],
};

const DEFAULT_PREFS: MealPreferences = {
  tier: "scavenge",
  nutritionGoal: "maintain",
  customMacros: null,
  restrictions: [],
  setupComplete: false,
};

/**
 * Parse profile weight string into kg.
 * If the unit is "lbs", converts to kg (÷ 2.205).
 */
function resolveWeightKg(weight: string, unit: "kg" | "lbs"): number {
  const num = parseFloat(weight);
  if (isNaN(num) || num <= 0) return 0;
  return unit === "lbs" ? num / 2.205 : num;
}

/** Compute calorie target from prefs + profile for plan generation. */
function getCalorieTarget(prefs: MealPreferences, weightKg: number): number | undefined {
  if (!prefs.nutritionGoal || prefs.nutritionGoal === "maintain") return undefined;
  const targets = computeMacroTargets(weightKg, prefs.nutritionGoal, {
    heightCm: prefs.heightCm,
    age: prefs.age,
    sex: prefs.sex,
    activityLevel: prefs.activityLevel,
  });
  return targets.calories;
}

export function useMealPlan() {
  const { profile } = useProfileContext();
  const [plan, setPlan] = useState<WeeklyMealPlan>(DEFAULT_PLAN);
  const [prefs, setPrefs] = useState<MealPreferences>(DEFAULT_PREFS);
  const [weekOffset, setWeekOffsetState] = useState(0);
  const [loading, setLoading] = useState(true);

  const prefsRef = useRef<MealPreferences>(DEFAULT_PREFS);
  const weekOffsetRef = useRef(0);

  // ── Load prefs + plan from storage ────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [savedPrefs, savedPlan] = await Promise.all([loadMealPrefs(), loadMealPlan()]);
      prefsRef.current = savedPrefs;
      setPrefs(savedPrefs);
      const currentWeekKey = getWeekKey(0);
      const nextWeekKey = getWeekKey(1);

      // Accept the saved plan if it's for this week OR next week (when user chose a future start day)
      const jsDay = new Date().getDay();
      const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
      const startDay = savedPrefs.startDayIndex ?? 0;
      const planIsForNextWeek = savedPlan.weekKey === nextWeekKey && startDay < todayIdx;

      if ((savedPlan.weekKey === currentWeekKey || planIsForNextWeek) && savedPlan.days.length > 0) {
        setPlan(savedPlan);
      } else {
        const wKg = resolveWeightKg(profile.weight, profile.weightUnit);
        const calTarget = getCalorieTarget(savedPrefs, wKg);
        const fresh = generateWeeklyPlan(
          savedPrefs.tier,
          currentWeekKey,
          recipeCatalog,
          savedPrefs.restrictions,
          calTarget,
        );
        setPlan(fresh);
        saveMealPlan(fresh);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Mount: initial load ─────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Generate plan ─────────────────────────────────────────────────
  const generatePlan = useCallback(
    async (tier: CuisineTier, offset: number) => {
      const weekKey = getWeekKey(offset);
      const wKg = resolveWeightKg(profile.weight, profile.weightUnit);
      const calTarget = getCalorieTarget(prefsRef.current, wKg);
      const newPlan = generateWeeklyPlan(tier, weekKey, recipeCatalog, prefsRef.current.restrictions, calTarget);
      setPlan(newPlan);
      await saveMealPlan(newPlan);
      return newPlan;
    },
    [],
  );

  // ── Swap a single slot ────────────────────────────────────────────
  const swapSlot = useCallback(
    async (dayIndex: number, slot: MealSlot, newRecipeId: string) => {
      const updated = { ...plan, days: plan.days.map((d) => ({ ...d })) };
      const day = updated.days.find((d) => d.dayIndex === dayIndex);
      if (!day) return;

      const mealIdx = day.meals.findIndex((m) => m.slot === slot);
      if (mealIdx === -1) {
        day.meals = [...day.meals, { slot, recipeId: newRecipeId }];
      } else {
        day.meals = day.meals.map((m, i) =>
          i === mealIdx ? { ...m, recipeId: newRecipeId } : m,
        );
      }
      setPlan(updated);
      await saveMealPlan(updated);
    },
    [plan],
  );

  // ── Set tier ──────────────────────────────────────────────────────
  const setTier = useCallback(
    async (tier: CuisineTier) => {
      try {
        const updatedPrefs: MealPreferences = { ...prefsRef.current, tier };
        prefsRef.current = updatedPrefs;
        setPrefs(updatedPrefs);
        await saveMealPrefs(updatedPrefs);
        await generatePlan(tier, weekOffsetRef.current);
      } catch {
        // ignore
      }
    },
    [generatePlan],
  );

  // ── Set week offset ───────────────────────────────────────────────
  const setWeekOffset = useCallback(
    async (offset: number) => {
      try {
        weekOffsetRef.current = offset;
        setWeekOffsetState(offset);
        await generatePlan(prefsRef.current.tier, offset);
      } catch {
        // ignore
      }
    },
    [generatePlan],
  );

  // ── Set nutrition goal ────────────────────────────────────────────
  const setNutritionGoal = useCallback(
    async (goal: "aggressive_cut" | "cut" | "maintain" | "bulk") => {
      try {
        const updatedPrefs: MealPreferences = {
          ...prefsRef.current,
          nutritionGoal: goal,
        };
        prefsRef.current = updatedPrefs;
        setPrefs(updatedPrefs);
        await saveMealPrefs(updatedPrefs);
      } catch {
        // ignore
      }
    },
    [],
  );

  // ── Set start day index ─────────────────────────────────────────
  const setStartDay = useCallback(
    async (dayIndex: number) => {
      try {
        const updated: MealPreferences = { ...prefsRef.current, startDayIndex: dayIndex };
        prefsRef.current = updated;
        setPrefs(updated);
        await saveMealPrefs(updated);

        // Determine correct week offset: if start day already passed, generate for next week
        const jsDay = new Date().getDay();
        const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
        const offset = dayIndex > todayIdx ? 0 : 1;
        await generatePlan(updated.tier, offset);
      } catch {
        // ignore
      }
    },
    [generatePlan],
  );

  // ── Set dietary restrictions ─────────────────────────────────────
  const setRestrictions = useCallback(
    async (restrictions: DietaryFilter[]) => {
      try {
        const updated = { ...prefsRef.current, restrictions };
        prefsRef.current = updated;
        setPrefs(updated);
        await saveMealPrefs(updated);
        // Regenerate plan with new restrictions
        const weekKey = getWeekKey(weekOffsetRef.current);
        const wKg = resolveWeightKg(profile.weight, profile.weightUnit);
        const calTarget = getCalorieTarget(updated, wKg);
        const newPlan = generateWeeklyPlan(updated.tier, weekKey, recipeCatalog, restrictions, calTarget);
        setPlan(newPlan);
        await saveMealPlan(newPlan);
      } catch {
        // ignore
      }
    },
    [],
  );

  // ── Derived: macro targets ────────────────────────────────────────
  const weightKg = resolveWeightKg(
    profile.weight,
    profile.weightUnit,
  );
  const macroTargets: Macros = computeMacroTargets(
    weightKg,
    prefs.nutritionGoal,
    {
      heightCm: prefs.heightCm,
      age: prefs.age,
      sex: prefs.sex,
      activityLevel: prefs.activityLevel,
    },
  );

  return {
    plan,
    prefs,
    weekOffset,
    loading,
    macroTargets,
    generatePlan,
    swapSlot,
    setTier,
    setWeekOffset,
    setNutritionGoal,
    setStartDay,
    setRestrictions,
    reload: loadData,
  };
}
