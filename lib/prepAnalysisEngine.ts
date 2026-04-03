/**
 * Prep Analysis Engine — Pure functions
 *
 * Takes a WeeklyMealPlan + recipe catalog → PrepDayPlan.
 * Identifies shared components across the week, aggregates quantities,
 * generates prep tasks with instructions, and estimates time savings.
 */

import type {
  WeeklyMealPlan,
  Recipe,
  PrepTask,
  PrepDayPlan,
  PrepCategory,
  MealAssembly,
  MealSlot,
  BaseComponent,
  ExpiryStatus,
} from "../src/data/mealTypes";
import { recipeMap } from "../src/data/recipeCatalog";
import { componentMap } from "../src/data/prepComponents";
import { generatePrepMeta } from "./prepTagger";

// ── Types ───────────────────────────────────────────────────────────────────

type ComponentUsage = {
  componentId: string;
  recipeIds: string[];
  dayIndices: number[];
  servings: number;
};

// ── Prep Instructions Templates ─────────────────────────────────────────────

const PREP_INSTRUCTIONS: Record<string, string> = {
  // ── Marinate-ahead proteins ──
  chicken_breast:
    "Pat chicken breasts dry. Season with salt, pepper, garlic powder, and your recipe's spices. Place in a zip-lock bag or container with a drizzle of oil. Refrigerate — the marinade deepens overnight.\n\nDay-of: Cook 6-7 min per side over medium-high heat until 165°F. Rest 5 min before slicing.",
  chicken_thigh_boneless:
    "Pat boneless thighs dry. Season with salt, pepper, paprika, and your recipe's spices. Bag or container with a splash of oil or yogurt. Refrigerate.\n\nDay-of: Pan-sear 5-6 min per side to 165°F. Slice or cube.",
  chicken_thigh_bone_in:
    "Season bone-in thighs generously with salt, pepper, and your recipe's spice blend. Store in a covered container in the fridge.\n\nDay-of: Roast at 425°F for 30-35 min until skin is crispy and internal temp reaches 165°F.",
  pan_seared_salmon:
    "Pat salmon dry. Season with salt, pepper, and a light glaze (soy + mirin, or lemon + herbs). Store skin-side up in a sealed container. Use within 24 hours.\n\nDay-of: Sear skin-side down in a hot oiled pan 4 min, flip, cook 3 min more.",
  baked_cod:
    "Pat cod fillets dry. Season lightly with salt, pepper, and lemon zest. Store in a sealed container with parchment between fillets. Use within 24 hours.\n\nDay-of: Bake at 400°F for 12-15 min until flaky.",
  cooked_shrimp:
    "Peel and devein shrimp. Toss with salt, pepper, garlic, and your recipe's marinade. Store in a sealed container or zip-lock bag. Use within 24 hours.\n\nDay-of: Sauté 2-3 min per side until pink and curled.",
  // ── Cook-ahead proteins ──
  shredded_chicken:
    "Place chicken in pot, cover with water, add salt. Bring to boil, reduce heat, simmer 20 min. Shred with two forks. Store with a splash of broth to keep moist.",
  cooked_ground_beef:
    "Brown ground beef in a large skillet over medium-high heat, breaking into crumbles. Drain excess fat. Season lightly with salt and pepper. Store in portions.",
  hard_boiled_eggs:
    "Place eggs in pot, cover with cold water by 1 inch. Bring to rolling boil, cover, remove from heat. Let sit 12 min. Ice bath 5 min. Peel or store unpeeled.",
  cooked_tofu:
    "Press tofu 15 min. Cut into cubes. Pan-fry in oil over medium-high heat until golden on all sides, about 8-10 min. Season with soy sauce. Store flat in containers.",
  cooked_white_rice:
    "Rinse rice until water runs clear. Combine 1:1.25 rice to water ratio. Bring to boil, reduce to low, cover 15 min. Fluff and cool. Store in portions.",
  cooked_basmati_rice:
    "Rinse basmati rice 3-4 times until water clears. Soak 20 min. Combine 1:1.5 rice to water. Bring to boil, reduce to low, cover 12 min. Fluff and portion.",
  cooked_brown_rice:
    "Rinse rice. Combine 1:1.5 rice to water ratio. Bring to boil, reduce to low, cover 35 min. Rest 10 min. Fluff and portion into containers.",
  cooked_quinoa:
    "Rinse quinoa well. Combine 1:2 quinoa to water ratio. Bring to boil, reduce heat, cover 15 min. Fluff with fork, cool, and store.",
  cooked_couscous:
    "Boil water (1:1.25 ratio). Remove from heat, stir in couscous, cover 5 min. Fluff with fork, drizzle with oil. Cool and store.",
  cooked_pasta:
    "Cook pasta 1 min less than package directions (it'll reheat later). Drain, toss with a drizzle of oil to prevent sticking. Cool and store.",
  steamed_broccoli:
    "Cut into uniform florets. Steam 3-4 min until bright green and crisp-tender. Ice bath to stop cooking. Drain well before storing.",
  cooked_sweet_potato:
    "Peel and cube sweet potatoes. Toss with oil, salt, pepper. Roast at 400°F for 20-25 min until fork-tender. Cool and store.",
  roasted_vegetables:
    "Cut vegetables into uniform pieces. Toss with oil, salt, pepper. Spread on sheet pan. Roast at 425°F for 25-30 min, stirring halfway.",
  sauteed_onion_mix:
    "Dice onions and peppers. Sauté in oil over medium heat 8-10 min until softened and lightly caramelized. Cool and store.",
  chopped_salad_greens:
    "Wash greens thoroughly, spin dry. Chop or tear to desired size. Store layered with paper towels in airtight container.",
  cooked_black_beans:
    "If using dried: soak overnight, drain, simmer 1-1.5 hr until tender. If canned: drain, rinse, heat through. Store with a bit of cooking liquid.",
  cooked_lentils:
    "Rinse lentils. Combine 1:3 lentils to water. Bring to boil, reduce heat, simmer 18-20 min until tender but not mushy. Drain excess water. Store.",
  cooked_chickpeas:
    "If using dried: soak overnight, drain, simmer 1-1.5 hr until tender. If canned: drain, rinse, heat through. Store with a bit of cooking liquid.",
  teriyaki_sauce:
    "Combine ¼ cup soy sauce, 2 tbsp mirin, 1 tbsp honey, 1 tsp ginger, 1 clove garlic (minced). Simmer 5 min until slightly thickened. Cool and store.",
  basic_vinaigrette:
    "Whisk 3 parts olive oil, 1 part vinegar, 1 tsp Dijon, salt, pepper. Store in jar — shake before using.",
  chimichurri:
    "Finely chop fresh parsley, oregano, garlic. Mix with olive oil, red wine vinegar, red pepper flakes, salt. Store in jar.",
};

// ── Quantity estimates per serving ────────────────────────────────────────────
// Each entry: [unit amount per serving, unit label]
const QUANTITY_PER_SERVING: Record<string, [number, string]> = {
  chicken_breast:          [6, "oz chicken breast"],
  chicken_thigh_boneless:  [5, "oz boneless chicken thigh"],
  chicken_thigh_bone_in:   [7, "oz bone-in chicken thigh"],
  shredded_chicken:    [5,   "oz chicken"],
  cooked_ground_beef:  [4,   "oz ground beef"],
  pan_seared_salmon:   [5,   "oz salmon fillet"],
  baked_cod:           [5,   "oz cod fillet"],
  hard_boiled_eggs:    [2,   "eggs"],
  cooked_tofu:         [4,   "oz tofu"],
  cooked_shrimp:       [4,   "oz shrimp"],
  cooked_white_rice:   [0.5, "cup dry rice"],
  cooked_basmati_rice: [0.5, "cup dry rice"],
  cooked_brown_rice:   [0.5, "cup dry rice"],
  cooked_quinoa:       [0.33,"cup dry quinoa"],
  cooked_couscous:     [0.33,"cup dry couscous"],
  cooked_pasta:        [2,   "oz dry pasta"],
  steamed_broccoli:    [1,   "cup broccoli florets"],
  cooked_sweet_potato: [0.5, "medium sweet potato"],
  roasted_vegetables:  [1,   "cup mixed vegetables"],
  sauteed_onion_mix:   [0.5, "cup diced onion/pepper"],
  chopped_salad_greens:[1.5, "cups greens"],
  cooked_black_beans:  [0.5, "cup dry beans (or 1 can)"],
  cooked_lentils:      [0.33,"cup dry lentils"],
  cooked_chickpeas:    [0.5, "cup dry chickpeas (or 1 can)"],
  teriyaki_sauce:      [2,   "tbsp sauce"],
  basic_vinaigrette:   [1.5, "tbsp dressing"],
  chimichurri:         [1.5, "tbsp chimichurri"],
};

/**
 * Build a human-readable quantity string for a component.
 */
function formatQuantity(componentId: string, totalServings: number): string {
  const entry = QUANTITY_PER_SERVING[componentId];
  if (!entry) return `${totalServings} servings`;
  const [perServing, unit] = entry;
  const total = perServing * totalServings;

  // Format nicely: round to 1 decimal, drop trailing zero
  const formatted = total % 1 === 0 ? String(total) : total.toFixed(1).replace(/\.0$/, "");

  // Convert ounces to lbs if >= 16
  if (unit.includes("oz") && total >= 16) {
    const lbs = total / 16;
    const lbsFormatted = lbs % 1 === 0 ? String(lbs) : lbs.toFixed(1);
    return `~${lbsFormatted} lb ${unit.replace(/^\d*\s*oz\s*/, "")}`.trim();
  }

  return `~${formatted} ${unit}`;
}

// ── Passive time estimates (e.g., boiling water, oven preheating) ───────────

/** Estimated cook time on serving day for marinate-ahead proteins */
const COOK_DAY_OF_MINUTES: Record<string, number> = {
  chicken_breast: 14,
  chicken_thigh_boneless: 12,
  chicken_thigh_bone_in: 35,
  pan_seared_salmon: 7,
  baked_cod: 15,
  cooked_shrimp: 5,
};

const PASSIVE_MINUTES: Record<string, number> = {
  chicken_breast: 0,        // marinate — no cooking on prep day
  chicken_thigh_boneless: 0,
  chicken_thigh_bone_in: 0,
  shredded_chicken: 20,
  cooked_ground_beef: 2,
  pan_seared_salmon: 0,     // marinate
  baked_cod: 0,             // marinate
  hard_boiled_eggs: 17,
  cooked_tofu: 15,
  cooked_shrimp: 0,         // marinate
  cooked_white_rice: 15,
  cooked_basmati_rice: 12,
  cooked_brown_rice: 35,
  cooked_quinoa: 15,
  cooked_couscous: 5,
  cooked_pasta: 8,
  steamed_broccoli: 4,
  cooked_sweet_potato: 25,
  roasted_vegetables: 30,
  sauteed_onion_mix: 2,
  chopped_salad_greens: 0,
  cooked_black_beans: 5,
  cooked_lentils: 18,
  cooked_chickpeas: 5,
  teriyaki_sauce: 2,
  basic_vinaigrette: 0,
  chimichurri: 0,
};

// ── Day distance calculation ────────────────────────────────────────────────

/**
 * Calculate days between prepDay and targetDay within the same week (Mon=0..Sun=6).
 * If targetDay is before prepDay, it wraps to the following week.
 */
function daysBetween(prepDayIndex: number, targetDayIndex: number): number {
  if (targetDayIndex >= prepDayIndex) {
    return targetDayIndex - prepDayIndex;
  }
  // Target is next week
  return 7 - prepDayIndex + targetDayIndex;
}

// ── Core Analysis ───────────────────────────────────────────────────────────

/**
 * Collect component usages within the prep scope window.
 * @param scopeDays — how many days ahead to include (0 = rest of week)
 * When `planIsNextWeek` is true, all plan days are included since they're all in the future.
 */
function collectComponentUsages(
  plan: WeeklyMealPlan,
  servings: number,
  prepDayIndex: number,
  planIsNextWeek: boolean = false,
  scopeDays: number = 0,
): ComponentUsage[] {
  const usageMap = new Map<string, ComponentUsage>();

  // Calculate the last day index to include in the prep scope
  const maxDayIndex = scopeDays > 0
    ? Math.min(6, prepDayIndex + scopeDays - 1)
    : 6; // 0 = rest of week

  for (const day of plan.days) {
    // Skip days before the prep day — those meals are already past
    // (unless the plan is for next week, in which case all days are ahead)
    if (!planIsNextWeek && day.dayIndex < prepDayIndex) continue;
    // Skip days beyond the prep scope window
    if (!planIsNextWeek && day.dayIndex > maxDayIndex) continue;
    // For next-week plans, respect scope from day 0
    if (planIsNextWeek && scopeDays > 0 && day.dayIndex >= scopeDays) continue;
    for (const meal of day.meals) {
      const recipe = recipeMap.get(meal.recipeId);
      if (!recipe) continue;

      const meta = generatePrepMeta(recipe);
      for (const compId of meta.componentIds) {
        const existing = usageMap.get(compId);
        if (existing) {
          if (!existing.recipeIds.includes(meal.recipeId)) {
            existing.recipeIds.push(meal.recipeId);
          }
          if (!existing.dayIndices.includes(day.dayIndex)) {
            existing.dayIndices.push(day.dayIndex);
          }
          existing.servings += servings;
        } else {
          usageMap.set(compId, {
            componentId: compId,
            recipeIds: [meal.recipeId],
            dayIndices: [day.dayIndex],
            servings,
          });
        }
      }
    }
  }

  return Array.from(usageMap.values());
}

/**
 * Generate a storage label for a component based on usage.
 */
function storageLabel(comp: BaseComponent, usage: ComponentUsage): string {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = usage.dayIndices
    .sort((a, b) => a - b)
    .map((i) => dayNames[i])
    .join(", ");
  return `${comp.name} — use ${days}`;
}

/**
 * Determine storage location and expiry status based on actual days between
 * prep day and last use day. Uses real day arithmetic, not day-of-week indices.
 */
function storageDecision(
  comp: BaseComponent,
  usage: ComponentUsage,
  prepDayIndex: number,
): { location: "fridge" | "freezer"; expiryStatus: ExpiryStatus; daysUntilLastUse: number } {
  const maxDaysAway = Math.max(
    ...usage.dayIndices.map((d) => daysBetween(prepDayIndex, d)),
  );

  // Decide fridge vs freezer based on actual days until last use
  if (maxDaysAway <= comp.shelfLife.fridgeDays) {
    // Fits in fridge — calculate how tight it is
    const margin = comp.shelfLife.fridgeDays - maxDaysAway;
    const expiryStatus: ExpiryStatus =
      margin <= 0 ? "unsafe" : margin <= 1 ? "tight" : "ok";
    return { location: "fridge", expiryStatus, daysUntilLastUse: maxDaysAway };
  }

  // Doesn't fit in fridge — try freezer
  if (comp.shelfLife.freezerDays && maxDaysAway <= comp.shelfLife.freezerDays) {
    return { location: "freezer", expiryStatus: "ok", daysUntilLastUse: maxDaysAway };
  }

  // Last resort — fridge but marked unsafe
  return { location: "fridge", expiryStatus: "unsafe", daysUntilLastUse: maxDaysAway };
}

// ── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Analyze a weekly meal plan and generate a complete prep day plan.
 * @param plan — the current weekly meal plan
 * @param servings — number of servings per meal (default 1)
 * @param prepDayIndex — which day of the week they're prepping (Mon=0..Sun=6, default 0)
 * @param planIsNextWeek — true when the meal plan is for a future week (include all days)
 * @param scopeDays — how many days ahead to prep for (0 = rest of week, default 3)
 */
export function analyzePrepPlan(
  plan: WeeklyMealPlan,
  servings: number = 1,
  prepDayIndex: number = 0,
  planIsNextWeek: boolean = false,
  scopeDays: number = 3,
): PrepDayPlan {
  const usages = collectComponentUsages(plan, servings, prepDayIndex, planIsNextWeek, scopeDays);

  // Build prep tasks
  const tasks: PrepTask[] = usages.map((usage) => {
    const comp = componentMap.get(usage.componentId)!;
    const decision = storageDecision(comp, usage, prepDayIndex);
    const shelfLifeDays =
      decision.location === "freezer"
        ? comp.shelfLife.freezerDays ?? comp.shelfLife.fridgeDays
        : comp.shelfLife.fridgeDays;

    const qty = formatQuantity(usage.componentId, usage.servings);
    const mealsCount = usage.servings;

    return {
      id: `prep_${usage.componentId}`,
      componentId: usage.componentId,
      name: comp.name,
      category: comp.category,
      prepStyle: comp.prepStyle,
      activeMinutes: comp.prepTimeMin,
      passiveMinutes: PASSIVE_MINUTES[usage.componentId] ?? 0,
      recipeIds: usage.recipeIds,
      dayIndices: usage.dayIndices.sort((a, b) => a - b),
      quantity: qty,
      servingsCount: mealsCount,
      instructions:
        PREP_INSTRUCTIONS[usage.componentId] ??
        `Prepare ${comp.name} according to recipe directions. Cool completely before storing.`,
      cookDayOfMinutes: COOK_DAY_OF_MINUTES[usage.componentId],
      storage: {
        location: decision.location,
        shelfLifeDays,
        containerLabel: storageLabel(comp, usage),
        expiryStatus: decision.expiryStatus,
        daysUntilLastUse: decision.daysUntilLastUse,
      },
    };
  });

  // Sort: proteins first, then grains, vegetables, legumes, sauces
  const categoryOrder: Record<PrepCategory, number> = {
    protein: 0,
    grain: 1,
    vegetable: 2,
    legume: 3,
    sauce: 4,
    other: 5,
  };
  tasks.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

  // Calculate times
  const totalActiveMinutes = tasks.reduce((s, t) => s + t.activeMinutes, 0);

  // Wall clock: active time + longest passive time (only count what extends past active work)
  const passiveMax = Math.max(0, ...tasks.map((t) => t.passiveMinutes));
  const cleanupMinutes = Math.min(30, Math.max(15, tasks.length * 3));
  const totalWallClockMinutes = totalActiveMinutes + Math.max(0, passiveMax - totalActiveMinutes * 0.15) + cleanupMinutes;

  // Time savings: sum of daily cook times vs. prep + assembly (within scope only)
  const maxDayIndex = scopeDays > 0 ? Math.min(6, prepDayIndex + scopeDays - 1) : 6;
  const dailyCookTimes = new Map<number, number>();
  for (const day of plan.days) {
    if (!planIsNextWeek && day.dayIndex < prepDayIndex) continue;
    if (!planIsNextWeek && day.dayIndex > maxDayIndex) continue;
    if (planIsNextWeek && scopeDays > 0 && day.dayIndex >= scopeDays) continue;
    let dayTotal = 0;
    for (const meal of day.meals) {
      const recipe = recipeMap.get(meal.recipeId);
      if (!recipe) continue;
      const stepTime = recipe.steps.reduce((s, step) => {
        if (!step.time) return s;
        const minMatch = step.time.match(/(\d+\.?\d*)\s*min/i);
        if (minMatch) return s + parseFloat(minMatch[1]);
        const hrMatch = step.time.match(/(\d+\.?\d*)\s*(?:hour|hr)/i);
        if (hrMatch) return s + parseFloat(hrMatch[1]) * 60;
        return s;
      }, 0);
      // Add cleanup time per cooking session: ~5 min per meal cooked from scratch
      dayTotal += (stepTime || 15) + 5;
    }
    dailyCookTimes.set(day.dayIndex, dayTotal);
  }

  const cookEachDayMinutes = Array.from(dailyCookTimes.values()).reduce(
    (s, v) => s + v,
    0,
  );

  // With prep: prep session wall clock + realistic assembly times per meal
  // Assembly time varies: 3 min if fully prepped, 8 min if partially prepped
  let totalAssemblyMinutes = 0;
  for (const day of plan.days) {
    if (!planIsNextWeek && day.dayIndex < prepDayIndex) continue;
    if (!planIsNextWeek && day.dayIndex > maxDayIndex) continue;
    if (planIsNextWeek && scopeDays > 0 && day.dayIndex >= scopeDays) continue;
    for (const meal of day.meals) {
      const recipe = recipeMap.get(meal.recipeId);
      if (!recipe) continue;
      const meta = generatePrepMeta(recipe);
      const preppedRatio = meta.componentIds.length > 0
        ? meta.componentIds.length / Math.max(1, recipe.ingredients.length)
        : 0;
      // Scale assembly from 3 min (fully prepped) to 12 min (barely prepped)
      totalAssemblyMinutes += Math.round(3 + (1 - preppedRatio) * 9);
    }
  }

  const withPrepMinutes = Math.round(totalWallClockMinutes) + totalAssemblyMinutes;

  const savedMinutes = Math.max(0, cookEachDayMinutes - withPrepMinutes);
  const savedPercent =
    cookEachDayMinutes > 0
      ? Math.round((savedMinutes / cookEachDayMinutes) * 100)
      : 0;

  return {
    weekKey: plan.weekKey,
    tier: plan.tier,
    prepDayIndex,
    tasks,
    totalActiveMinutes: Math.round(totalActiveMinutes),
    totalWallClockMinutes: Math.round(totalWallClockMinutes),
    timeSavings: {
      cookEachDayMinutes: Math.round(cookEachDayMinutes),
      withPrepMinutes: Math.round(withPrepMinutes),
      savedMinutes,
      savedPercent,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ── Assembly Guide ──────────────────────────────────────────────────────────

/**
 * Generate assembly instructions for a single meal using prepped components.
 */
export function generateAssembly(
  recipeId: string,
  completedTaskIds: string[],
): MealAssembly | null {
  const recipe = recipeMap.get(recipeId);
  if (!recipe) return null;

  const meta = generatePrepMeta(recipe);
  const completedComponentIds = completedTaskIds
    .map((id) => id.replace("prep_", ""))
    .filter((cid) => meta.componentIds.includes(cid));

  const isFullyPrepped =
    completedComponentIds.length === meta.componentIds.length &&
    meta.componentIds.length > 0;

  // Build assembly steps
  const steps: { action: string; instruction: string; timeMin: number }[] = [];

  // Step 1: Pull prepped components
  if (completedComponentIds.length > 0) {
    const names = completedComponentIds
      .map((cid) => componentMap.get(cid)?.name)
      .filter(Boolean);
    steps.push({
      action: "Grab prepped",
      instruction: `Pull from fridge/freezer: ${names.join(", ")}`,
      timeMin: 1,
    });
  }

  // Step 2a: Cook marinated proteins (these are raw — need actual cooking)
  const marinatedComps = completedComponentIds
    .map((cid) => componentMap.get(cid))
    .filter((c): c is BaseComponent => c != null && c.prepStyle === "marinate");

  if (marinatedComps.length > 0) {
    const names = marinatedComps.map((c) => c.name.replace(/ — Marinate| — Season & Store/g, ""));
    const cookTime = marinatedComps.reduce((max, c) => {
      const t = COOK_DAY_OF_MINUTES[c.id] ?? 10;
      return Math.max(max, t);
    }, 0);
    steps.push({
      action: "Cook protein",
      instruction: `Cook marinated ${names.join(", ")} fresh — see prep container for seasoning`,
      timeMin: cookTime,
    });
  }

  // Step 2b: Reheat pre-cooked components
  const reheatable = completedComponentIds
    .map((cid) => componentMap.get(cid))
    .filter((c): c is BaseComponent => c != null && c.reheat !== "none" && c.prepStyle === "cook");

  if (reheatable.length > 0) {
    const methods = [...new Set(reheatable.map((c) => c.reheat))];
    steps.push({
      action: "Reheat",
      instruction: `Warm up components: ${methods.join(" / ")} method`,
      timeMin: 3,
    });
  }

  // Step 3: Fresh ingredients
  const freshItems = meta.freshOnlyIngredients.map(
    (f) => recipe.ingredients[f.index],
  );
  if (freshItems.length > 0) {
    steps.push({
      action: "Prep fresh",
      instruction: `Prepare: ${freshItems.join(", ")}`,
      timeMin: 3,
    });
  }

  // Step 4: Assemble
  steps.push({
    action: "Assemble",
    instruction: "Combine all components and serve",
    timeMin: 2,
  });

  const assemblyTimeMin = steps.reduce((s, step) => s + step.timeMin, 0);

  return {
    slot: recipe.slot,
    recipeId: recipe.id,
    recipeName: recipe.name,
    flag: recipe.flag,
    macros: recipe.macros,
    assemblyTimeMin,
    fullCookTimeMin: meta.fullPrepTimeMin,
    steps,
    freshItems,
    isFullyPrepped,
  };
}
