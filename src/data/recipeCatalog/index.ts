import { scavengeRecipes } from "./scavenge";
import { huntRecipes } from "./hunt";
import { apexFeastRecipes } from "./apexFeast";
import type { Recipe, CuisineTier, MealSlot } from "../mealTypes";
import { detectContains } from "../../../lib/ingredientTagger";

// Auto-tag recipes with dietary info
function tagRecipes(recipes: Recipe[]): Recipe[] {
  return recipes.map(r => ({
    ...r,
    contains: r.contains?.length ? r.contains : detectContains(r.ingredients),
  }));
}

// Tag each tier's recipes once and reuse
const taggedScavenge = tagRecipes(scavengeRecipes);
const taggedHunt = tagRecipes(huntRecipes);
const taggedApexFeast = tagRecipes(apexFeastRecipes);

// ── Combined catalog ────────────────────────────────────────────────
export const recipeCatalog: Recipe[] = [
  ...taggedScavenge,
  ...taggedHunt,
  ...taggedApexFeast,
];

// ── O(1) lookup by recipe ID ────────────────────────────────────────
export const recipeMap: Map<string, Recipe> = new Map(
  recipeCatalog.map((r) => [r.id, r]),
);

// ── Helpers ─────────────────────────────────────────────────────────
const tierLookup: Record<CuisineTier, Recipe[]> = {
  scavenge: taggedScavenge,
  hunt: taggedHunt,
  apex_feast: taggedApexFeast,
};

export function getRecipesByTier(tier: CuisineTier): Recipe[] {
  return tierLookup[tier];
}

export function getRecipesBySlot(tier: CuisineTier, slot: MealSlot): Recipe[] {
  return tierLookup[tier].filter((r) => r.slot === slot);
}

// ── Re-export all types ─────────────────────────────────────────────
export * from "../mealTypes";
