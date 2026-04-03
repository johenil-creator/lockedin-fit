// Type definitions for the meal planner feature
// Mirrors the pattern of catalogTypes.ts so data files can use @ts-nocheck independently.

// ---------------------------------------------------------------------------
// Core enums / literal unions
// ---------------------------------------------------------------------------

/** The three recipe complexity tiers */
export type CuisineTier = "scavenge" | "hunt" | "apex_feast";

/** Five meal slots per day */
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack1" | "snack2";

/** Grocery aisle categories */
export type GroceryCategory =
  | "Proteins"
  | "Dairy"
  | "Grains"
  | "Produce"
  | "Pantry"
  | "Spices"
  | "Canned & Jarred";

/** Dietary restriction tags — what a recipe contains */
export const DIETARY_RESTRICTIONS = [
  "dairy", "gluten", "eggs", "pork", "shellfish",
  "nuts", "soy", "fish", "red-meat",
] as const;

export type DietaryRestriction = typeof DIETARY_RESTRICTIONS[number];

/** Lifestyle diet preferences */
export const DIET_PREFERENCES = [
  "vegetarian", "pescatarian",
] as const;

export type DietPreference = typeof DIET_PREFERENCES[number];

/** Combined restriction type */
export type DietaryFilter = DietaryRestriction | DietPreference;

// ---------------------------------------------------------------------------
// Macros & recipe primitives
// ---------------------------------------------------------------------------

/** Macronutrient breakdown */
export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** A single cooking step */
export type RecipeStep = {
  title: string;
  time?: string;
  detail: string;
  look?: string;
};

/** A complete recipe */
export type Recipe = {
  id: string;
  name: string;
  subtitle: string;
  flag: string;
  tier: CuisineTier;
  slot: MealSlot;
  macros: Macros;
  cuisineBadge: string;
  tip: string;
  ingredients: string[];
  steps: RecipeStep[];
  contains?: DietaryRestriction[];
};

// ---------------------------------------------------------------------------
// Weekly meal plan
// ---------------------------------------------------------------------------

/** A single slot assignment in a daily meal plan */
export type MealSlotAssignment = {
  slot: MealSlot;
  recipeId: string;
};

/** One day of the weekly plan */
export type DailyMealPlan = {
  dayIndex: number;
  meals: MealSlotAssignment[];
};

/** A full generated weekly plan */
export type WeeklyMealPlan = {
  weekKey: string;
  tier: CuisineTier;
  generatedAt: string;
  seed: number;
  days: DailyMealPlan[];
};

// ---------------------------------------------------------------------------
// Food logging
// ---------------------------------------------------------------------------

/** A logged food entry */
export type FoodLogEntry = {
  id: string;
  date: string;
  slot: MealSlot;
  recipeId: string | null;
  name: string;
  flag?: string;
  macros: Macros;
  loggedAt: string;
};

// ---------------------------------------------------------------------------
// Weight log
// ---------------------------------------------------------------------------

/** A single body-weight log entry */
export type WeightLogEntry = {
  id: string;
  date: string;       // "YYYY-MM-DD"
  weightKg: number;   // always stored in kg
  loggedAt: string;    // ISO timestamp
  source?: "manual" | "healthkit";
};

// ---------------------------------------------------------------------------
// Saved custom meals
// ---------------------------------------------------------------------------

/** A user-saved custom meal for quick re-logging */
export type SavedMeal = {
  id: string;
  name: string;
  macros: Macros;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

/** Activity level multiplier for TDEE */
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

/** Biological sex for BMR calculation */
export type BiologicalSex = "male" | "female";

/** User's meal planner preferences */
export type MealPreferences = {
  tier: CuisineTier;
  nutritionGoal: "aggressive_cut" | "cut" | "maintain" | "bulk";
  customMacros: Macros | null;
  restrictions: DietaryFilter[];
  setupComplete: boolean;
  // Body stats for Mifflin-St Jeor TDEE calculation
  heightCm?: number;
  age?: number;
  sex?: BiologicalSex;
  activityLevel?: ActivityLevel;
  /** Target body weight in kg */
  goalWeightKg?: number;
  /** Which day of the week the plan starts (Mon=0..Sun=6). Defaults to 0 (Monday). */
  startDayIndex?: number;
};

// ---------------------------------------------------------------------------
// Grocery list
// ---------------------------------------------------------------------------

export type GroceryItem = {
  id: string;
  name: string;
  quantity: string;
  category: GroceryCategory;
  checked: boolean;
  /** Which days/recipes use this ingredient, e.g. "Mon Lunch, Wed Dinner" */
  usedIn?: string;
  /** Substitution suggestion for hard-to-find ingredients */
  substitution?: string;
};

export type GroceryListState = {
  weekKey: string;
  tier: CuisineTier;
  items: GroceryItem[];
};

// ---------------------------------------------------------------------------
// Nutrition streak
// ---------------------------------------------------------------------------

/** Nutrition streak data */
export type NutritionStreakData = {
  current: number;
  longest: number;
  lastLogDate: string;
};

// ---------------------------------------------------------------------------
// Meal Prep System
// ---------------------------------------------------------------------------

export type ReheatMethod = "microwave" | "stovetop" | "oven" | "none";

export type PrepCategory =
  | "protein"
  | "grain"
  | "vegetable"
  | "sauce"
  | "legume"
  | "other";

/** Whether this component should be cooked ahead or marinated for day-of cooking */
export type PrepStyle = "cook" | "marinate";

export type BaseComponent = {
  id: string;
  name: string;
  category: PrepCategory;
  shelfLife: { fridgeDays: number; freezerDays: number | null };
  reheat: ReheatMethod;
  prepTimeMin: number;
  /** "cook" = pre-cook on prep day, "marinate" = season/marinate and cook fresh day-of */
  prepStyle: PrepStyle;
};

export type PrepTask = {
  id: string;
  componentId: string;
  name: string;
  category: PrepCategory;
  /** "cook" = pre-cooked on prep day, "marinate" = marinate now, cook day-of */
  prepStyle: PrepStyle;
  activeMinutes: number;
  passiveMinutes: number;
  recipeIds: string[];
  dayIndices: number[];
  quantity: string;
  servingsCount: number;
  instructions: string;
  /** Estimated cook time on serving day (only for marinate-ahead proteins) */
  cookDayOfMinutes?: number;
  storage: {
    location: "fridge" | "freezer";
    shelfLifeDays: number;
    containerLabel: string;
    expiryStatus: ExpiryStatus;
    daysUntilLastUse: number;
  };
};

export type ExpiryStatus = "ok" | "tight" | "unsafe";

export type PrepDayPlan = {
  weekKey: string;
  tier: CuisineTier;
  prepDayIndex: number;
  tasks: PrepTask[];
  totalActiveMinutes: number;
  totalWallClockMinutes: number;
  timeSavings: {
    cookEachDayMinutes: number;
    withPrepMinutes: number;
    savedMinutes: number;
    savedPercent: number;
  };
  generatedAt: string;
};

export type PrepProgress = {
  weekKey: string;
  completedTaskIds: string[];
  startedAt: string | null;
  completedAt: string | null;
};

export type PrepPreferences = {
  enabled: boolean;
  prepDay: number;
  servings: number;
  onboardingComplete: boolean;
  /** How many days ahead to prep for (default 3). 0 = rest of week. */
  scopeDays: number;
};

export type MealAssembly = {
  slot: MealSlot;
  recipeId: string;
  recipeName: string;
  flag: string;
  macros: Macros;
  assemblyTimeMin: number;
  fullCookTimeMin: number;
  steps: { action: string; instruction: string; timeMin: number }[];
  freshItems: string[];
  isFullyPrepped: boolean;
};
