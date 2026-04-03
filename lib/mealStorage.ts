/**
 * Meal Planner — AsyncStorage CRUD
 *
 * Follows the same load/save pattern as lib/storage.ts.
 * Each domain key has a typed load (with default) and save function.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  WeeklyMealPlan,
  FoodLogEntry,
  MealPreferences,
  GroceryListState,
  NutritionStreakData,
  PrepDayPlan,
  PrepProgress,
  PrepPreferences,
  SavedMeal,
  WeightLogEntry,
} from "../src/data/mealTypes";

// ── Keys ────────────────────────────────────────────────────────────────────

const KEYS = {
  mealPlan: "@lockedinfit/meal-plan",
  foodLog: "@lockedinfit/food-log",
  mealPrefs: "@lockedinfit/meal-prefs",
  groceryList: "@lockedinfit/grocery-list",
  nutritionStreak: "@lockedinfit/nutrition-streak",
  savedMeals: "@lockedinfit/saved-meals",
  prepPlan: "@lockedinfit/prep-plan",
  prepProgress: "@lockedinfit/prep-progress",
  prepPrefs: "@lockedinfit/prep-prefs",
  weightLog: "@lockedinfit/weight-log",
} as const;

// ── Generic helpers ─────────────────────────────────────────────────────────

async function load<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    if (__DEV__) console.warn("[mealStorage] parse error:", e);
    return null;
  }
}

async function save<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ── Meal Plan ───────────────────────────────────────────────────────────────

const DEFAULT_MEAL_PLAN: WeeklyMealPlan = {
  weekKey: "",
  tier: "scavenge",
  generatedAt: "",
  seed: 0,
  days: [],
};

export async function loadMealPlan(): Promise<WeeklyMealPlan> {
  return (await load<WeeklyMealPlan>(KEYS.mealPlan)) ?? { ...DEFAULT_MEAL_PLAN };
}

export async function saveMealPlan(data: WeeklyMealPlan): Promise<void> {
  await save(KEYS.mealPlan, data);
}

// ── Food Log ────────────────────────────────────────────────────────────────

/** Record<string, FoodLogEntry[]> keyed by "YYYY-MM-DD" */
type FoodLogMap = Record<string, FoodLogEntry[]>;

const DEFAULT_FOOD_LOG: FoodLogMap = {};

export async function loadFoodLog(): Promise<FoodLogMap> {
  return (await load<FoodLogMap>(KEYS.foodLog)) ?? { ...DEFAULT_FOOD_LOG };
}

export async function saveFoodLog(data: FoodLogMap): Promise<void> {
  await save(KEYS.foodLog, data);
}

// ── Meal Preferences ────────────────────────────────────────────────────────

const DEFAULT_MEAL_PREFS: MealPreferences = {
  tier: "scavenge",
  nutritionGoal: "maintain",
  customMacros: null,
  restrictions: [],
  setupComplete: false,
};

export async function loadMealPrefs(): Promise<MealPreferences> {
  const saved = await load<MealPreferences>(KEYS.mealPrefs);
  if (!saved) return { ...DEFAULT_MEAL_PREFS };
  return { ...DEFAULT_MEAL_PREFS, ...saved };
}

export async function saveMealPrefs(data: MealPreferences): Promise<void> {
  await save(KEYS.mealPrefs, data);
}

// ── Grocery List ────────────────────────────────────────────────────────────

const DEFAULT_GROCERY_LIST: GroceryListState = {
  weekKey: "",
  tier: "scavenge",
  items: [],
};

export async function loadGroceryList(): Promise<GroceryListState> {
  return (await load<GroceryListState>(KEYS.groceryList)) ?? { ...DEFAULT_GROCERY_LIST };
}

export async function saveGroceryList(data: GroceryListState): Promise<void> {
  await save(KEYS.groceryList, data);
}

let _savedMealLock: Promise<void> = Promise.resolve();

// ── Saved Meals ─────────────────────────────────────────────────────────────

export async function loadSavedMeals(): Promise<SavedMeal[]> {
  return (await load<SavedMeal[]>(KEYS.savedMeals)) ?? [];
}

export async function saveSavedMeals(data: SavedMeal[]): Promise<void> {
  await save(KEYS.savedMeals, data);
}

export async function addSavedMeal(meal: SavedMeal): Promise<void> {
  _savedMealLock = _savedMealLock.then(async () => {
    try {
      const meals = await loadSavedMeals();
      meals.unshift(meal);
      await saveSavedMeals(meals);
    } catch {}
  }).catch(() => {});
  await _savedMealLock;
}

export async function removeSavedMeal(id: string): Promise<void> {
  _savedMealLock = _savedMealLock.then(async () => {
    try {
      const meals = await loadSavedMeals();
      await saveSavedMeals(meals.filter((m) => m.id !== id));
    } catch {}
  }).catch(() => {});
  await _savedMealLock;
}

// ── Nutrition Streak ────────────────────────────────────────────────────────

const DEFAULT_NUTRITION_STREAK: NutritionStreakData = {
  current: 0,
  longest: 0,
  lastLogDate: "",
};

export async function loadNutritionStreak(): Promise<NutritionStreakData> {
  return (await load<NutritionStreakData>(KEYS.nutritionStreak)) ?? { ...DEFAULT_NUTRITION_STREAK };
}

export async function saveNutritionStreak(data: NutritionStreakData): Promise<void> {
  await save(KEYS.nutritionStreak, data);
}

// ── Prep Day Plan ───────────────────────────────────────────────────────────

export async function loadPrepPlan(): Promise<PrepDayPlan | null> {
  return load<PrepDayPlan>(KEYS.prepPlan);
}

export async function savePrepPlan(data: PrepDayPlan): Promise<void> {
  await save(KEYS.prepPlan, data);
}

// ── Prep Progress ───────────────────────────────────────────────────────────

const DEFAULT_PREP_PROGRESS: PrepProgress = {
  weekKey: "",
  completedTaskIds: [],
  startedAt: null,
  completedAt: null,
};

export async function loadPrepProgress(): Promise<PrepProgress> {
  return (await load<PrepProgress>(KEYS.prepProgress)) ?? { ...DEFAULT_PREP_PROGRESS };
}

export async function savePrepProgress(data: PrepProgress): Promise<void> {
  await save(KEYS.prepProgress, data);
}

// ── Prep Preferences ────────────────────────────────────────────────────────

const DEFAULT_PREP_PREFS: PrepPreferences = {
  enabled: false,
  prepDay: 0, // Monday
  servings: 1,
  onboardingComplete: false,
  scopeDays: 3, // Default: prep 3 days ahead
};

export async function loadPrepPrefs(): Promise<PrepPreferences> {
  const saved = await load<PrepPreferences>(KEYS.prepPrefs);
  if (!saved) return { ...DEFAULT_PREP_PREFS };
  return { ...DEFAULT_PREP_PREFS, ...saved };
}

export async function savePrepPrefs(data: PrepPreferences): Promise<void> {
  await save(KEYS.prepPrefs, data);
}

// ── Weight Log ──────────────────────────────────────────────────────────────

export async function loadWeightLog(): Promise<WeightLogEntry[]> {
  return (await load<WeightLogEntry[]>(KEYS.weightLog)) ?? [];
}

export async function saveWeightLog(entries: WeightLogEntry[]): Promise<void> {
  await save(KEYS.weightLog, entries);
}
