/**
 * Prep Tagger — Auto-generates prep metadata for recipes
 * by matching ingredient keywords to base components.
 *
 * Follows the same regex-based pattern as ingredientTagger.ts.
 * No manual edits to recipe files needed.
 */

import type { Recipe } from "../src/data/mealTypes";
import { componentMap } from "../src/data/prepComponents";

// ── Types ───────────────────────────────────────────────────────────────────

export type RecipePrepMeta = {
  canPrep: boolean;
  freshOnlyReason?: string;
  assemblyTimeMin: number;
  fullPrepTimeMin: number;
  componentIds: string[];
  freshOnlyIngredients: { index: number; reason: string }[];
};

// ── Component Matching Rules ────────────────────────────────────────────────

const COMPONENT_RULES: [RegExp, string][] = [
  // Proteins — order matters: more specific patterns first
  [/shredded chicken|pulled chicken/i, "shredded_chicken"],
  [/chicken mince|minced chicken/i, "chicken_breast"],
  [/chicken thigh.*bone.?in|bone.?in.*chicken thigh/i, "chicken_thigh_bone_in"],
  [/chicken thigh/i, "chicken_thigh_boneless"],
  [/chicken breast|boneless chicken/i, "chicken_breast"],
  [/ground beef|beef mince|ground turkey/i, "cooked_ground_beef"],
  [/\bsalmon\b(?!.*smoked)(?!.*roe|.*ikura|.*lox|.*gravlax)/i, "pan_seared_salmon"],
  [/\bcod\b|\bhaddock\b|\btilapia\b|\bwhite fish\b|\bsea bass\b|\bhalibut\b|\bpollock\b|\bswai\b|\bmahi/i, "baked_cod"],
  [/hard.?boiled\s+eggs?|boiled\s+eggs?/i, "hard_boiled_eggs"],
  [/\btofu\b/i, "cooked_tofu"],
  [/\bshrimp\b(?!.*raw)|\bcooked\s+prawn/i, "cooked_shrimp"],

  // Grains
  [/basmati rice/i, "cooked_basmati_rice"],
  [/white rice|steamed rice|cooked rice|jasmine rice/i, "cooked_white_rice"],
  [/brown rice/i, "cooked_brown_rice"],
  [/\bquinoa\b/i, "cooked_quinoa"],
  [/\bcouscous\b/i, "cooked_couscous"],
  [/\bpasta\b|\bnoodle/i, "cooked_pasta"],

  // Vegetables
  [/\bbroccoli\b/i, "steamed_broccoli"],
  [/sweet potato/i, "cooked_sweet_potato"],
  [/roasted\s+(?:vegetables|veggies|veg)|bell pepper.*roast|zucchini.*roast|eggplant.*roast|roast.*(?:bell pepper|zucchini|eggplant|squash|cauliflower)/i, "roasted_vegetables"],

  // Legumes
  [/black beans/i, "cooked_black_beans"],
  [/\blentil/i, "cooked_lentils"],
  [/\bchickpea|\bgarbanzo/i, "cooked_chickpeas"],
];

// ── Fresh-Only Rules ────────────────────────────────────────────────────────

const FRESH_ONLY_RULES: [RegExp, string][] = [
  [/lettuce|arugula|mixed greens|watercress|micro.?greens/i, "wilts quickly"],
  [/avocado/i, "oxidizes rapidly"],
  [/fried egg|soft.?boil|poached egg|scrambled egg|sunny.?side|over.?easy/i, "texture degrades when reheated"],
  [/\beggs?\b(?!.*hard|.*boiled)/i, "cook fresh for best texture"],
  [/sashimi|raw fish|tartare|ceviche|tiradito/i, "must be fresh for safety"],
  [/raw\s+(?:shrimp|prawn)/i, "must be cooked fresh"],
  [/smoked salmon|lox|gravlax/i, "already prepared — use as-is"],
  [/crispy|fried|tempura|panko/i, "loses crunch when stored"],
  [/fresh cilantro|fresh coriander|fresh basil|fresh mint|garnish/i, "add at serving"],
];

// ── Unpreppable Recipes ─────────────────────────────────────────────────────

const UNPREPPABLE_PATTERN = /sashimi|tartare|ceviche|tiradito|souffl[eé]/i;

// ── Time Parsing ────────────────────────────────────────────────────────────

function parseStepTime(time?: string): number {
  if (!time) return 0;
  const hourMatch = time.match(/(\d+\.?\d*)\s*(?:hour|hr)/i);
  if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60);
  const minMatch = time.match(/(\d+\.?\d*)\s*min/i);
  if (minMatch) return Math.round(parseFloat(minMatch[1]));
  return 0;
}

// ── Main Functions ──────────────────────────────────────────────────────────

export function generatePrepMeta(recipe: Recipe): RecipePrepMeta {
  // Check if entire recipe is unpreppable
  const allText = [recipe.name, ...recipe.ingredients].join(" ");
  if (UNPREPPABLE_PATTERN.test(allText)) {
    const fullTime = recipe.steps.reduce((s, step) => s + parseStepTime(step.time), 0);
    return {
      canPrep: false,
      freshOnlyReason: "Raw/delicate preparation — must be made fresh",
      assemblyTimeMin: fullTime || 15,
      fullPrepTimeMin: fullTime || 15,
      componentIds: [],
      freshOnlyIngredients: recipe.ingredients.map((_, i) => ({
        index: i,
        reason: "entire recipe is fresh-only",
      })),
    };
  }

  const componentIds: string[] = [];
  const freshOnlyIngredients: { index: number; reason: string }[] = [];
  let componentPrepSum = 0;

  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i];
    let matched = false;

    // Check component rules first
    for (const [regex, compId] of COMPONENT_RULES) {
      if (regex.test(ing) && !componentIds.includes(compId)) {
        componentIds.push(compId);
        const comp = componentMap.get(compId);
        if (comp) componentPrepSum += comp.prepTimeMin;
        matched = true;
        break;
      }
    }

    // Check fresh-only rules
    if (!matched) {
      for (const [regex, reason] of FRESH_ONLY_RULES) {
        if (regex.test(ing)) {
          freshOnlyIngredients.push({ index: i, reason });
          break;
        }
      }
    }
  }

  const fullPrepTimeMin = recipe.steps.reduce(
    (s, step) => s + parseStepTime(step.time),
    0,
  ) || 15; // default 15 min if no step times

  const assemblyTimeMin = Math.max(3, fullPrepTimeMin - componentPrepSum);

  return {
    canPrep: componentIds.length > 0,
    assemblyTimeMin,
    fullPrepTimeMin,
    componentIds,
    freshOnlyIngredients,
  };
}

export function tagAllRecipes(
  recipes: Recipe[],
): Map<string, RecipePrepMeta> {
  const result = new Map<string, RecipePrepMeta>();
  for (const recipe of recipes) {
    result.set(recipe.id, generatePrepMeta(recipe));
  }
  return result;
}
