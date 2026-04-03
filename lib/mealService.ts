/**
 * Meal Planner — Service Layer
 *
 * Pure functions for weekly plan generation, macro computation, and grocery
 * list aggregation. No side-effects or storage calls — see mealStorage.ts.
 */

import type {
  CuisineTier,
  MealSlot,
  Macros,
  Recipe,
  WeeklyMealPlan,
  DailyMealPlan,
  MealSlotAssignment,
  FoodLogEntry,
  GroceryItem,
  GroceryCategory,
  ActivityLevel,
  BiologicalSex,
} from "../src/data/mealTypes";

// ── Seeded LCG ──────────────────────────────────────────────────────────────

/**
 * Linear Congruential Generator with deterministic output.
 * Same seed always produces the same sequence.
 */
function createLCG(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/** Simple string → 32-bit integer hash (djb2). */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

// ── Week Key ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/**
 * Return an ISO-style week key (e.g. "2026-W13") for the week at `offset`
 * weeks from the current week. offset=0 is the current week.
 */
export function getWeekKey(offset: number): string {
  const now = new Date();
  const target = new Date(now.getTime() + offset * 7 * 24 * 60 * 60 * 1000);

  // ISO week: week starts on Monday.
  // Compute ISO week number per ISO 8601.
  const tmp = new Date(Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1..Sun=7)
  const day = tmp.getUTCDay() || 7; // convert Sun=0 to 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const year = tmp.getUTCFullYear();
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

// ── Dietary Restriction Filtering ────────────────────────────────────────────

/**
 * Check whether a recipe passes all dietary restrictions.
 *
 * Standard allergens (e.g. "dairy", "gluten", "nuts", "soy", "shellfish")
 * are matched against `recipe.contains`.
 *
 * Lifestyle preferences receive special handling:
 *  - "vegetarian" — excludes meat, poultry, fish, and shellfish
 *  - "pescatarian" — excludes meat and poultry (fish/shellfish OK)
 */
function passesRestrictions(recipe: Recipe, restrictions: string[]): boolean {
  const contains = recipe.contains ?? [];
  for (const r of restrictions) {
    switch (r) {
      case "vegetarian": {
        if (contains.some(c => ["fish", "shellfish", "pork", "red-meat"].includes(c))) return false;
        const ingText = recipe.ingredients.join(" ").toLowerCase();
        if (/\b(chicken|turkey|duck|poultry)\b/.test(ingText)) return false;
        break;
      }
      case "pescatarian": {
        if (contains.some(c => ["pork", "red-meat"].includes(c))) return false;
        const ingText = recipe.ingredients.join(" ").toLowerCase();
        if (/\b(chicken|turkey|duck|poultry)\b/.test(ingText)) return false;
        break;
      }
      default:
        if (contains.includes(r as any)) return false;
    }
  }
  return true;
}

// ── Weekly Plan Generation ──────────────────────────────────────────────────

const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack1", "snack2"];

/**
 * Fisher-Yates shuffle (in-place) using a seeded RNG.
 * Returns the same array reference for convenience.
 */
function fisherYatesShuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Generate a deterministic weekly meal plan.
 *
 * For each of the 5 meal slots the catalog is filtered to matching slot+tier
 * recipes, then shuffled via Fisher-Yates with a seeded LCG. One recipe is
 * assigned per day (Mon-Sun) with no repeats within a week.
 *
 * If fewer than 7 recipes exist for a slot the shuffled array wraps.
 */
export function generateWeeklyPlan(
  tier: CuisineTier,
  weekKey: string,
  catalog: Recipe[],
  restrictions?: string[],
  calorieTarget?: number,
): WeeklyMealPlan {
  const restrictionKey = restrictions?.length ? `::${[...restrictions].sort().join(",")}` : "";
  const seed = hashString(`${weekKey}::${tier}${restrictionKey}`);
  const rng = createLCG(seed);

  // Pre-filter catalog by tier, indexed by slot
  const bySlot: Record<MealSlot, Recipe[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack1: [],
    snack2: [],
  };
  for (const recipe of catalog) {
    if (recipe.tier !== tier) continue;
    if (!bySlot[recipe.slot]) continue;
    if (restrictions?.length && !passesRestrictions(recipe, restrictions)) continue;
    bySlot[recipe.slot].push(recipe);
  }

  // Build 7 days (Mon-Sun)
  const days: DailyMealPlan[] = [];

  // Shuffle each slot's pool once, then assign round-robin to each day
  const shuffled: Record<MealSlot, Recipe[]> = {} as any;
  for (const slot of SLOTS) {
    shuffled[slot] = fisherYatesShuffle([...bySlot[slot]], rng);
  }

  // For calorie-aware mode: filter each slot to recipes that fit the per-slot budget
  // Budget split: breakfast ~18%, lunch ~25%, dinner ~27%, snack1 ~15%, snack2 ~15%
  const SLOT_BUDGET: Record<MealSlot, number> = {
    breakfast: 0.18,
    lunch: 0.25,
    dinner: 0.27,
    snack1: 0.15,
    snack2: 0.15,
  };

  if (calorieTarget && calorieTarget > 0) {
    // Filter each slot's pool to only recipes that fit within their calorie budget
    // (with 10% tolerance), then shuffle the filtered set for variety
    for (const slot of SLOTS) {
      const budget = Math.round(calorieTarget * SLOT_BUDGET[slot] * 1.1); // 10% tolerance
      const filtered = bySlot[slot].filter((r) => r.macros.calories <= budget);
      // Use filtered pool if it has enough recipes, otherwise keep full pool sorted by cal
      if (filtered.length >= 3) {
        bySlot[slot] = fisherYatesShuffle(filtered, rng);
      } else {
        bySlot[slot].sort((a, b) => a.macros.calories - b.macros.calories);
      }
    }
  }

  for (let d = 0; d < 7; d++) {
    const meals: MealSlotAssignment[] = [];

    if (calorieTarget && calorieTarget > 0) {
      // Calorie-aware: assign all 5 slots, picking from budget-filtered pools
      let remaining = calorieTarget;

      for (const slot of SLOTS) {
        const pool = bySlot[slot];
        if (pool.length === 0) continue;
        // Try round-robin first
        const candidate = pool[d % pool.length];
        if (candidate.macros.calories <= remaining) {
          meals.push({ slot, recipeId: candidate.id });
          remaining -= candidate.macros.calories;
        } else {
          // Find any recipe that fits remaining budget
          const fit = pool.find((r) => r.macros.calories <= remaining);
          if (fit) {
            meals.push({ slot, recipeId: fit.id });
            remaining -= fit.macros.calories;
          }
        }
      }
    } else {
      // No calorie target — original behavior
      for (const slot of SLOTS) {
        const pool = shuffled[slot];
        if (pool.length === 0) continue;
        const recipe = pool[d % pool.length];
        meals.push({ slot, recipeId: recipe.id });
      }
    }

    days.push({ dayIndex: d, meals });
  }

  return {
    weekKey,
    tier,
    generatedAt: new Date().toISOString(),
    seed,
    days,
  };
}

// ── Macro Targets ───────────────────────────────────────────────────────────

const FALLBACK_MACROS: Macros = { calories: 1900, protein: 140, carbs: 190, fat: 63 };

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Compute daily macro targets using the Mifflin-St Jeor equation.
 *
 * BMR (male)   = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161 + 166
 *              = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
 * BMR (female) = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
 *
 * TDEE = BMR × activity multiplier
 * Goal adjustment: cut −500, bulk +300
 *
 * Macros:
 * - Protein: 2.0 g/kg
 * - Fat: 28% of calories
 * - Carbs: remainder
 *
 * Falls back to weight × 30 estimate when height/age/sex are missing.
 */
export function computeMacroTargets(
  weightKg: number,
  goal: "aggressive_cut" | "cut" | "maintain" | "bulk",
  opts?: {
    heightCm?: number;
    age?: number;
    sex?: BiologicalSex;
    activityLevel?: ActivityLevel;
  },
): Macros {
  if (!weightKg || weightKg <= 0) return { ...FALLBACK_MACROS };

  const height = opts?.heightCm;
  const age = opts?.age;
  const sex = opts?.sex;
  const activity = opts?.activityLevel ?? "moderate";

  let tdee: number;
  if (height && height > 0 && age && age > 0 && sex) {
    // Mifflin-St Jeor
    const bmr =
      10 * weightKg + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
    tdee = Math.round(bmr * ACTIVITY_MULTIPLIER[activity]);
  } else {
    // Fallback: simple weight-based estimate
    tdee = Math.round(weightKg * 30 * ACTIVITY_MULTIPLIER[activity]);
  }

  let calories = tdee;
  if (goal === "aggressive_cut") calories -= 750;
  else if (goal === "cut") calories -= 500;
  else if (goal === "bulk") calories += 300;
  calories = Math.max(calories, 1200); // safety floor

  const protein = Math.round(weightKg * 2.0);
  const fat = Math.round((calories * 0.28) / 9);
  const proteinCals = protein * 4;
  const fatCals = fat * 9;
  const carbs = Math.round(Math.max(0, calories - proteinCals - fatCals) / 4);

  return { calories, protein, carbs, fat };
}

// ── Day Macro Totals ────────────────────────────────────────────────────────

/** Sum macros across all food-log entries for a single day. */
export function computeDayMacros(entries: FoodLogEntry[]): Macros {
  const totals: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    totals.calories += e.macros.calories;
    totals.protein += e.macros.protein;
    totals.carbs += e.macros.carbs;
    totals.fat += e.macros.fat;
  }
  return totals;
}

// ── Grocery List ────────────────────────────────────────────────────────────

/** Keyword → GroceryCategory mapping. Checked in order; first match wins. */
const CATEGORY_RULES: [RegExp, GroceryCategory][] = [
  // ── Order matters: more specific patterns first ──

  // Sauces & condiments (before Proteins — "fish sauce" is not a protein)
  [/\bfish sauce\b|soy sauce|oyster sauce|hoisin|sriracha|hot sauce|worcestershire/i, "Canned & Jarred"],
  // Coconut milk / cream (before Dairy — it's canned, not dairy)
  [/coconut milk|coconut cream/i, "Canned & Jarred"],

  // Proteins
  [/chicken|beef|steak|turkey|pork|shrimp|prawn|salmon|tuna|fish|tilapia|cod|egg|sausage|bacon|ham|lamb|tofu|tempeh/i, "Proteins"],
  // Dairy
  [/milk|cheese|yogurt|yoghurt|cream|butter|whey|cottage|mozzarella|parmesan|cheddar|sour cream|paneer/i, "Dairy"],
  // Grains
  [/rice|bread|tortilla|oat|pasta|noodle|quinoa|couscous|cereal|granola|pita|wrap|bagel|flour|bun/i, "Grains"],
  // Spices & Seeds
  [/cumin|paprika|garlic powder|onion powder|oregano|basil|thyme|cinnamon|chili powder|cayenne|turmeric|nutmeg|curry|garam masala|coriander powder|allspice|cardamom|clove|fennel seed|mustard seed|sesame seed|chia seed|poppy seed|dill|bay leaf|star anise|five.?spice|jerk seasoning/i, "Spices"],
  // Canned & Jarred (oils, vinegars, pastes, sauces, nut butters)
  [/canned|salsa|sauce|broth|stock|tomato paste|peanut butter|almond butter|jam|jelly|honey|syrup|mayo|mustard|ketchup|vinegar|dressing|\boil\b|tahini|miso|sambal|gochujang|harissa|chutney|pickle/i, "Canned & Jarred"],
  // Produce (broad — fruits, vegetables, herbs)
  [/banana|apple|berry|berrie|avocado|spinach|lettuce|tomato|onion|garlic|pepper|broccoli|carrot|potato|sweet potato|zucchini|courgette|mushroom|cucumber|celery|lemon|lime|orange|mango|pineapple|blueberr|strawberr|raspberr|kale|cabbage|corn|bean|pea|asparagus|parsley|ginger|jalape|eggplant|aubergine|bok choy|beansprout|shallot|scallion|coriander|mint|basil|cilantro|lemongrass|galangal/i, "Produce"],
];

function categorize(ingredient: string): GroceryCategory {
  // Fresh herbs → Produce, dried herbs → Spices
  if (ingredient.startsWith("fresh ")) return "Produce";
  if (ingredient.startsWith("dried ")) return "Spices";
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(ingredient)) return category;
  }
  return "Pantry";
}

// ── Ingredient name extraction ──────────────────────────────────────────────

/**
 * Strip leading quantities, units, and trailing prep instructions from an
 * ingredient string to produce a canonical grocery name for deduplication.
 *
 * "180 g chicken breast, thinly sliced"  →  "chicken breast"
 * "2 tbsp soy sauce"                     →  "soy sauce"
 * "1/2 cup canned black beans, rinsed"   →  "canned black beans"
 * "Salt and pepper to taste"             →  "salt and pepper"
 * "Fresh coriander for garnish"          →  "fresh coriander"
 */
const QTY_UNIT_RE =
  /^[\d\/\.\-\s]*(cup|cups|tbsp|tsp|ml|g|oz|lb|lbs|clove|cloves|thumb|scoop|slice|slices|can|cans|sheet|sheets|stalk|stalks|wedge|wedges|large|medium|small|splash|pinch|dash|handful|bunch|head|sprig|sprigs|piece|pieces)s?\s+(?:of\s+)?/i;

const PREP_TAIL_RE =
  /\s*[,\-–—]\s*(thinly |roughly |finely |freshly )?(sliced|diced|minced|grated|chopped|cubed|julienned|torn|halved|crushed|shredded|peeled|trimmed|deveined|rinsed|drained|soaked|frozen|thawed|smoked|toasted|butterflied|packed|scored|softened|melted|pitted|zested|seeded|sifted|segmented|whole|slit|microplaned|bone-in|skin-on|skinless|boneless|dried|cooked|raw|boiled|steamed|grilled|baked|fried|seared|braised|sautéed|blanched|charred|poached|roasted|pickled|fermented|caramelized|cut into.*|for .*|to taste|optional|if using|or .*|about .*).*$/i;

// Trailing qualifiers not behind a comma (e.g. "salt to taste", "parsley for garnish")
const TRAILING_QUALIFIER_RE =
  /\s+(to taste|for (serving|garnish|dipping|drizzling|topping|dusting|filling))$/i;

// ── Synonym normalization ────────────────────────────────────────────────────
// Maps regional or variant names to a single canonical grocery name.
const SYNONYMS: [RegExp, string][] = [
  // ── Herbs — regional naming ──
  [/\bcilantro\b/i, "coriander"],
  [/\bspring onion/i, "green onion"],
  [/\bscallion/i, "green onion"],
  // NOTE: "fresh" prefix is handled conditionally in extractGroceryName —
  // preserved for herbs (fresh dill ≠ dried dill), stripped for everything else.
  // Flat-leaf parsley → parsley
  [/\bflat-leaf parsley\b/i, "parsley"],
  [/\bitalian parsley\b/i, "parsley"],
  // Micro-greens variant
  [/\bcilantro micro-greens\b/i, "coriander"],
  // Vietnamese mint → mint
  [/\bvietnamese mint\b/i, "mint"],
  // Mint leaves → mint
  [/\bmint leaves?\b/i, "mint"],
  // Mitsuba or spring onion → green onion
  [/\bmitsuba or green onion\b/i, "green onion"],
  [/\bmitsuba\b/i, "green onion"],
  // "Green onion greens" → "green onion"
  [/\bgreen onion greens\b/i, "green onion"],
  // Thai basil leaves → thai basil (must come before generic "basil" rules)
  [/\bthai basil leaves?\b/i, "thai basil"],

  // ── Citrus — all forms collapse to the whole fruit ──
  [/\blemon juice\b/i, "lemon"],
  [/\blemon wedges?\b/i, "lemon"],
  [/\blemon zest\b/i, "lemon"],
  [/\blemon segment\w*\b/i, "lemon"],
  [/\blimes?\b.*\bjuiced\b/i, "lime"],
  [/\blime juice\b/i, "lime"],
  [/\blime wedges?\b/i, "lime"],
  [/\blime zest\b/i, "lime"],
  [/\borange juice\b/i, "orange"],
  [/\borange zest\b/i, "orange"],

  // Garlic — "garlic paste", "garlic powder" are distinct, but "garlic clove" → "garlic"
  [/\bginger-garlic paste\b/i, "ginger-garlic paste"],

  // ── Yogurt variants → yogurt ──
  [/\bgreek yogurt\b/i, "yogurt"],
  [/\bplain yogurt\b/i, "yogurt"],
  [/\bnatural yogurt\b/i, "yogurt"],
  [/\bstrained yogurt\b/i, "yogurt"],
  [/\byoghurt\b/i, "yogurt"],
  [/\bthick yogurt\b/i, "yogurt"],

  // ── Vegetable synonyms (UK/US) ──
  [/\bcourgette\b/i, "zucchini"],
  [/\baubergine\b/i, "eggplant"],
  [/\bcapsicum\b/i, "bell pepper"],
  [/\brocket\b/i, "arugula"],
  [/\bcoriander leaves\b/i, "coriander"],
  [/\bcoriander powder\b/i, "ground coriander"],

  // ── Cottage cheese ──
  [/\blow[- ]?fat cottage cheese\b/i, "cottage cheese"],

  // ── Coconut milk variants — all collapse to "coconut milk" ──
  [/\blight coconut milk\b/i, "coconut milk"],
  [/\blow-?fat coconut milk\b/i, "coconut milk"],
  [/\breduced-?fat coconut milk\b/i, "coconut milk"],
  [/\bfull-?fat coconut milk\b/i, "coconut milk"],

  // ── Vague proteins → actionable grocery names ──
  [/\bfirm white fish\b/i, "cod fillet"],
  [/\bwhite fish\b/i, "cod fillet"],
  [/\bwhite-fleshed fish\b/i, "cod fillet"],
  [/\bflaky white fish\b/i, "cod fillet"],

  // ── Spice powder variants → base spice name ──
  [/\bcumin powder\b/i, "cumin"],
  [/\bground cumin\b/i, "cumin"],
  [/\bcumin seeds?\b/i, "cumin"],
  [/\bgarlic powder\b/i, "garlic powder"],
  [/\bonion powder\b/i, "onion powder"],
  [/\bchili powder\b/i, "chili powder"],
  [/\bchilli powder\b/i, "chili powder"],
  [/\bground cinnamon\b/i, "cinnamon"],
  [/\bcinnamon powder\b/i, "cinnamon"],
  [/\bcinnamon stick\b/i, "cinnamon"],
  [/\bground turmeric\b/i, "turmeric"],
  [/\bturmeric powder\b/i, "turmeric"],
  [/\bground ginger\b/i, "ground ginger"],
  [/\bginger powder\b/i, "ground ginger"],
  [/\bground paprika\b/i, "paprika"],
  [/\bsmoked paprika\b/i, "paprika"],
  [/\bground nutmeg\b/i, "nutmeg"],
  [/\bground cardamom\b/i, "cardamom"],
  [/\bcardamom pods?\b/i, "cardamom"],
  [/\bcayenne pepper\b/i, "cayenne"],
  [/\bground black pepper\b/i, "black pepper"],
  [/\bcracked black pepper\b/i, "black pepper"],
  [/\bground cloves\b/i, "cloves"],
  [/\bwhole cloves\b/i, "cloves"],
  [/\bchilli flakes\b/i, "chili flakes"],
  [/\bred chilli flakes\b/i, "chili flakes"],
  [/\bdried chilli flakes\b/i, "chili flakes"],

  // ── Citrus — more juice/juiced variants ──
  [/\byuzu juice\b/i, "yuzu"],
  [/\bseville orange juice\b/i, "seville orange"],
  [/\blemon,?\s*juiced\b/i, "lemon"],
  [/\blimes?,?\s*juiced\b/i, "lime"],
  [/\borange,?\s*juiced\b/i, "orange"],

  // ── Rice variants → buyable form ──
  [/\bsushi rice\b/i, "sushi rice"],
  [/\bjapanese short[- ]grain rice\b/i, "short-grain rice"],
  [/\bshort[- ]grain rice\b/i, "short-grain rice"],

  // ── Garlic cloves → garlic ──
  [/\bgarlic cloves?\b/i, "garlic"],
  [/\bcloves?\s+garlic\b/i, "garlic"],

  // ── Edamame ──
  [/\bedamame in pods\b/i, "edamame"],
  [/\bshelled edamame\b/i, "edamame"],

  // ── Seaweed variants ──
  [/\bseaweed\s*sheets?\b/i, "nori sheets"],
  [/\broasted seaweed\b/i, "nori sheets"],
  [/\bnori\b/i, "nori sheets"],
  [/\bgim\b/i, "nori sheets"],

  // ── Protein powder variants → single name ──
  [/\bchocolate protein powder\b/i, "protein powder"],
  [/\bvanilla protein powder\b/i, "protein powder"],
  [/\bunflavou?red protein powder\b/i, "protein powder"],

  // ── Bread/flatbread ──
  [/\bsourdough bread\b/i, "sourdough bread"],

  // ── Oil consolidation ──
  [/\bextra[- ]?virgin olive oil\b/i, "olive oil"],
  [/\bneutral oil\b/i, "vegetable oil"],

  // ── Salsa ──
  [/\btomato salsa\b/i, "salsa"],

  // ── Mango ──
  [/\bmango chunks?\b/i, "mango"],

  // ── Freshness/ripeness adjectives (ripe avocado → avocado) ──
  [/\bripe\s+/i, ""],

  // ── Trailing cooking state (sweet potato boiled → sweet potato) ──
  [/\s+boiled$/i, ""],

  // ── Prep adjectives as leading modifiers (shredded carrot → carrot) ──
  [/\bshredded\s+/i, ""],
  [/\bdiced\s+/i, ""],
  [/\bchopped\s+/i, ""],
  [/\bcrushed\s+/i, ""],
  [/\bsliced\s+/i, ""],
  [/\bthinly\s+/i, ""],
  [/\bfinely\s+/i, ""],
  [/\broughly\s+/i, ""],
  [/\bfreshly\s+/i, ""],
  [/\bcoarsely\s+/i, ""],

  // ── Adjective stripping (toasted sesame seeds → sesame seeds) ──
  [/\btoasted\s+/i, ""],
  [/\broasted\s+/i, ""],
  [/\bblanched\s+/i, ""],
  [/\bbruised\s+/i, ""],
  [/\bcharred\s+/i, ""],

  // ── Size adjectives that don't affect what you buy ──
  [/\blarge\s+/i, ""],
  [/\bsmall\s+/i, ""],
  [/\bmedium\s+/i, ""],

  // ── Salt variants → "salt" (handled by SKIP_ITEMS) ──
  [/\bflaky sea salt\b/i, "salt"],
  [/\bmaldon sea salt\b/i, "salt"],
  [/\bcoarse sea salt\b/i, "salt"],
  [/\bsea salt\b/i, "salt"],
  [/\bkosher salt\b/i, "salt"],
  [/\btable salt\b/i, "salt"],
  [/\bfleur de sel\b/i, "salt"],
  [/\brock sugar\b/i, "sugar"],
  [/\bpalm sugar\b/i, "brown sugar"],
  [/\bcaster sugar\b/i, "sugar"],
  [/\bicing sugar\b/i, "powdered sugar"],
];

function normalizeSynonyms(name: string): string {
  let s = name;
  for (const [pattern, replacement] of SYNONYMS) {
    s = s.replace(pattern, replacement);
  }
  return s.trim();
}

/**
 * Compound ingredients that should be split into individual grocery entries.
 * "Salt and pepper to taste" → ["salt", "pepper"]
 * "Salt and chilli flakes"   → ["salt", "chilli flakes"]
 * "Fresh mint and coriander" → ["mint", "coriander"]
 */
function splitCompoundIngredient(name: string): string[] {
  // Normalize ", and " → ", " then also " and " → ", " for compound lists
  let normalized = name.replace(/,\s+and\s+/gi, ", ");
  if (/\s+and\s+/i.test(normalized)) {
    normalized = normalized.replace(/\s+and\s+/gi, ", ");
  }
  // Split on commas if present
  if (normalized.includes(",")) {
    const parts = normalized
      .split(/\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    // Only split if each part is ≤ 3 words (avoids splitting recipe descriptions)
    if (parts.length > 1 && parts.every((p) => p.split(/\s+/).length <= 3)) {
      return parts;
    }
  }
  return [name];
}

/**
 * Items that are always in a kitchen — don't add to grocery list.
 */
const SKIP_ITEMS = new Set([
  "salt",
  "pepper",
  "black pepper",
  "white pepper",
  "smoked salt",
  "water",
  "warm water",
  "hot water",
  "cold water",
  "ice",
  "ice cubes",
  "cooking spray",
  "cooking oil",
  "oil",
  "pinch",
  "seasoning",
]);

/**
 * Herbs where fresh vs dried matters — they're different products in different
 * aisles. Bare herb names default to "fresh X".
 */
const FRESH_HERBS = new Set([
  "coriander", "parsley", "dill", "mint", "thyme", "basil", "thai basil",
  "oregano", "tarragon", "chives", "rosemary", "sage", "marjoram",
]);

function extractGroceryName(raw: string): string {
  let s = raw.trim();
  // Strip "Juice of 1 lemon", "Squeeze of lemon", "Knob of butter", "Drizzle of olive oil"
  s = s.replace(/^(?:juice|squeeze|zest|knob|drizzle|splash|dash|touch)\s+of\s+/i, "");
  // Remove leading "A few leaves of" style prefixes
  s = s.replace(/^a few (leaves|sprigs|pieces) of\s+/i, "");
  // Remove leading quantity + unit (e.g. "180 g ", "2 tbsp ", "1/2 cup ")
  s = s.replace(QTY_UNIT_RE, "");
  // Also strip bare leading numbers (e.g. "3 large eggs", "2 corn tortillas")
  s = s.replace(/^[\d\/\.\-\s]+/, "");
  // Strip orphaned % from percentage amounts (e.g. "0% Greek yogurt" → "% Greek yogurt" → "Greek yogurt")
  s = s.replace(/^%\s*/, "");
  // Clean up parenthetical notes FIRST: "(optional)", "(rice and urad dal, fermented)"
  // Must happen before prep-tail removal to avoid leaking paren content into the name
  s = s.replace(/\s*\(.*?\)\s*/g, " ");
  // Remove trailing prep instructions after comma/dash
  s = s.replace(PREP_TAIL_RE, "");
  // Remove trailing qualifiers not behind a comma
  s = s.replace(TRAILING_QUALIFIER_RE, "");
  // Strip trailing lone prep adjectives (e.g. "cucumber grated" → "cucumber")
  s = s.replace(/\s+(grated|sliced|diced|chopped|minced|crushed|shredded|torn|cubed|julienned|halved|quartered|charred|bruised|whole|dried|soaked|sifted)$/i, "");
  // Handle "X or Y" alternatives — keep only the first option
  s = s.replace(/\s+or\s+.+$/i, "");
  // Strip cooking-method prefixes — grocery list should show raw/buyable products
  s = s.replace(/^(?:cooked|steamed|boiled|poached|fried|pan[- ]?fried|stir[- ]?fried|deep[- ]?fried|grilled|baked|roasted|seared|pan[- ]?seared|braised|sautéed|sauteed|blanched|charred|smoked|cured|slow[- ]?cooked|pickled|fermented|caramelized|browned|rendered|frozen|store[- ]?bought|leftover|prepared|desalted|day[- ]?old)\s+/i, "");
  // Normalize synonyms
  s = normalizeSynonyms(s);
  s = s.trim().toLowerCase();

  // Handle "fresh" prefix: preserve for herbs, strip for everything else
  if (s.startsWith("fresh ")) {
    const rest = s.substring(6);
    if (!FRESH_HERBS.has(rest)) {
      s = rest; // "fresh ginger" → "ginger" (produce, not herb distinction)
    }
    // herbs keep "fresh" prefix: "fresh dill" stays
  } else if (FRESH_HERBS.has(s) && !s.startsWith("dried ")) {
    // Bare herb name → default to fresh (recipes mean fresh when unqualified)
    s = "fresh " + s;
  }
  // "dried dill" stays as-is — it's a different product

  return s;
}

/**
 * Names that are just prep adjectives or junk — filter them out.
 */
const JUNK_NAMES = new Set([
  "sliced", "diced", "chopped", "minced", "grated", "crushed", "shredded",
  "halved", "torn", "cubed", "whole", "fresh", "raw", "dried", "frozen",
  "optional", "or", "and", "for", "to", "of", "a", "the", "with",
  "thinly", "finely", "roughly", "freshly", "coarsely",
]);

/**
 * Substitution suggestions for hard-to-find ingredients.
 */
const SUBSTITUTIONS: Record<string, string> = {
  galangal: "fresh ginger",
  lemongrass: "lemon zest + ginger",
  gochujang: "sriracha + miso paste",
  doenjang: "miso paste",
  "tamarind chutney": "lime juice + brown sugar",
  sambal: "sriracha or chili garlic sauce",
  "harissa paste": "sriracha + cumin + smoked paprika",
  mirin: "rice vinegar + pinch of sugar",
  tahini: "smooth peanut butter",
  "nori sheets": "roasted seaweed snacks",
  paneer: "halloumi or extra-firm tofu",
  ghee: "clarified butter or coconut oil",
  labneh: "strained Greek yogurt",
  "cotija cheese": "feta cheese",
  "cod fillet": "tilapia, haddock, or halibut",
  "daikon radish": "regular radish or turnip",
  "bok choy": "swiss chard or baby spinach",
  "preserved lemon": "lemon zest + pinch of salt",
  sumac: "lemon zest",
  gochugaru: "crushed red pepper flakes",
  "fish sauce": "soy sauce + squeeze of lime",
  "oyster sauce": "soy sauce + pinch of sugar",
  "hoisin sauce": "peanut butter + soy sauce + honey",
  "miso paste": "soy sauce (use less)",
  tempeh: "extra-firm tofu",
  edamame: "lima beans or green peas",
  couscous: "quinoa or orzo",
  "rice noodles": "thin spaghetti or angel hair",
  "glass noodles": "thin rice noodles",
  "coconut cream": "full-fat coconut milk (chilled, solids only)",
  yuzu: "equal parts lemon + lime juice",
  "matcha powder": "finely ground green tea",
  kimchi: "sauerkraut + chili flakes",
  "rice vinegar": "apple cider vinegar",
  "palm sugar": "brown sugar",
  "kaffir lime leaves": "lime zest",
  tamarind: "lime juice + brown sugar",
  "star anise": "five-spice powder (use less)",
};

/**
 * Run extractGroceryName then split compound items, returning multiple
 * normalised grocery names. Skips pantry staples and junk words.
 */
function extractGroceryNames(raw: string): string[] {
  const trimmed = raw.trim();

  // Handle "For X: ingredient1, ingredient2, ..." sub-recipe lines
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx > 0 && colonIdx < 30) {
    const before = trimmed.substring(0, colonIdx).trim();
    if (before.split(/\s+/).length <= 3) {
      const rest = trimmed.substring(colonIdx + 1).trim();
      const subIngredients = rest.split(/\s*,\s*/);
      const names: string[] = [];
      for (const sub of subIngredients) {
        const subName = extractGroceryName(sub);
        if (subName && subName.length > 1 && !SKIP_ITEMS.has(subName) && !JUNK_NAMES.has(subName)) {
          names.push(subName);
        }
      }
      if (names.length > 0) return names;
    }
  }

  const base = extractGroceryName(trimmed);
  if (!base || base.length <= 1) return [];
  const parts = splitCompoundIngredient(base);
  return parts.filter((p) => p.length > 1 && !SKIP_ITEMS.has(p) && !JUNK_NAMES.has(p));
}

/**
 * Aggregate ingredients from every recipe in a weekly plan into a grouped
 * grocery list. Duplicate ingredient names are merged by extracted name.
 */
export function buildGroceryList(
  plan: WeeklyMealPlan,
  catalog: Recipe[],
): GroceryItem[] {
  // Build a fast id→recipe lookup
  const recipeMap = new Map<string, Recipe>();
  for (const r of catalog) recipeMap.set(r.id, r);

  // Collect unique ingredients (normalised key → display name + count + usage)
  const seen = new Map<
    string,
    { displayName: string; count: number; category: GroceryCategory; usages: string[] }
  >();

  const SLOT_LABELS: Record<string, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack1: "Snack",
    snack2: "Snack",
  };

  for (const day of plan.days) {
    const dayLabel = DAY_LABELS[day.dayIndex] ?? `Day ${day.dayIndex + 1}`;
    for (const assignment of day.meals) {
      const recipe = recipeMap.get(assignment.recipeId);
      if (!recipe) continue;
      const usageTag = `${dayLabel} ${SLOT_LABELS[assignment.slot] ?? assignment.slot}`;
      for (const ing of recipe.ingredients) {
        const names = extractGroceryNames(ing);
        for (const key of names) {
          const existing = seen.get(key);
          if (existing) {
            existing.count += 1;
            if (!existing.usages.includes(usageTag)) {
              existing.usages.push(usageTag);
            }
          } else {
            const display =
              key.charAt(0).toUpperCase() + key.slice(1);
            seen.set(key, {
              displayName: display,
              count: 1,
              category: categorize(key),
              usages: [usageTag],
            });
          }
        }
      }
    }
  }

  // Build GroceryItem[], sorted by category then name
  // Use deterministic IDs based on item name so checked state persists across re-renders
  const items: GroceryItem[] = [];
  seen.forEach((entry, key) => {
    items.push({
      id: `grocery-${key.replace(/\s+/g, "-")}`,
      name: entry.displayName,
      quantity: entry.count > 1 ? `x${entry.count}` : "x1",
      category: entry.category,
      checked: false,
      usedIn: entry.usages.join(", "),
      substitution: SUBSTITUTIONS[key],
    });
  });

  items.sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category);
    if (catCmp !== 0) return catCmp;
    return a.name.localeCompare(b.name);
  });

  return items;
}
