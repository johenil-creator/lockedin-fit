/**
 * Prep Components Registry
 *
 * Reusable building blocks for batch meal prep.
 * Each component represents something that can be cooked/prepped
 * in bulk on prep day and used across multiple meals during the week.
 *
 * Proteins use two prep styles:
 * - "marinate": season/marinate on prep day, cook fresh day-of (better flavor & texture)
 * - "cook": fully cook on prep day, reheat when needed (for cold/shredded/crumbled uses)
 */

import type { BaseComponent } from "./mealTypes";

export const BASE_COMPONENTS: BaseComponent[] = [
  // ── Proteins — Marinate-ahead ──────────────────────────────────────────────
  // These are marinated on prep day and cooked fresh in ~10-15 min day-of.
  // Tastes better than reheated, and the marinade deepens overnight.
  {
    id: "chicken_breast",
    name: "Chicken Breast — Marinate",
    category: "protein",
    shelfLife: { fridgeDays: 2, freezerDays: 90 },
    reheat: "none",
    prepTimeMin: 5,
    prepStyle: "marinate",
  },
  {
    id: "chicken_thigh_boneless",
    name: "Chicken Thighs (boneless) — Marinate",
    category: "protein",
    shelfLife: { fridgeDays: 2, freezerDays: 90 },
    reheat: "none",
    prepTimeMin: 5,
    prepStyle: "marinate",
  },
  {
    id: "chicken_thigh_bone_in",
    name: "Chicken Thighs (bone-in) — Marinate",
    category: "protein",
    shelfLife: { fridgeDays: 2, freezerDays: 90 },
    reheat: "none",
    prepTimeMin: 5,
    prepStyle: "marinate",
  },
  {
    id: "pan_seared_salmon",
    name: "Salmon — Marinate",
    category: "protein",
    shelfLife: { fridgeDays: 1, freezerDays: null },
    reheat: "none",
    prepTimeMin: 5,
    prepStyle: "marinate",
  },
  {
    id: "baked_cod",
    name: "Cod — Season & Store",
    category: "protein",
    shelfLife: { fridgeDays: 1, freezerDays: null },
    reheat: "none",
    prepTimeMin: 5,
    prepStyle: "marinate",
  },
  {
    id: "cooked_shrimp",
    name: "Shrimp — Marinate",
    category: "protein",
    shelfLife: { fridgeDays: 1, freezerDays: 90 },
    reheat: "none",
    prepTimeMin: 5,
    prepStyle: "marinate",
  },

  // ── Proteins — Cook-ahead ──────────────────────────────────────────────────
  // These are better pre-cooked: used cold/shredded, or can't be marinated.
  {
    id: "shredded_chicken",
    name: "Shredded Chicken",
    category: "protein",
    shelfLife: { fridgeDays: 4, freezerDays: 90 },
    reheat: "microwave",
    prepTimeMin: 25,
    prepStyle: "cook",
  },
  {
    id: "cooked_ground_beef",
    name: "Cooked Ground Beef",
    category: "protein",
    shelfLife: { fridgeDays: 3, freezerDays: 90 },
    reheat: "stovetop",
    prepTimeMin: 12,
    prepStyle: "cook",
  },
  {
    id: "hard_boiled_eggs",
    name: "Hard-Boiled Eggs",
    category: "protein",
    shelfLife: { fridgeDays: 7, freezerDays: null },
    reheat: "none",
    prepTimeMin: 12,
    prepStyle: "cook",
  },
  {
    id: "cooked_tofu",
    name: "Pan-Fried Tofu",
    category: "protein",
    shelfLife: { fridgeDays: 4, freezerDays: 60 },
    reheat: "stovetop",
    prepTimeMin: 10,
    prepStyle: "cook",
  },

  // ── Grains ────────────────────────────────────────────────────────────────
  {
    id: "cooked_white_rice",
    name: "Cooked White Rice",
    category: "grain",
    shelfLife: { fridgeDays: 5, freezerDays: 180 },
    reheat: "microwave",
    prepTimeMin: 20,
    prepStyle: "cook",
  },
  {
    id: "cooked_brown_rice",
    name: "Cooked Brown Rice",
    category: "grain",
    shelfLife: { fridgeDays: 5, freezerDays: 180 },
    reheat: "microwave",
    prepTimeMin: 35,
    prepStyle: "cook",
  },
  {
    id: "cooked_quinoa",
    name: "Cooked Quinoa",
    category: "grain",
    shelfLife: { fridgeDays: 5, freezerDays: 90 },
    reheat: "microwave",
    prepTimeMin: 18,
    prepStyle: "cook",
  },
  {
    id: "cooked_pasta",
    name: "Cooked Pasta",
    category: "grain",
    shelfLife: { fridgeDays: 4, freezerDays: 60 },
    reheat: "microwave",
    prepTimeMin: 12,
    prepStyle: "cook",
  },
  {
    id: "cooked_basmati_rice",
    name: "Cooked Basmati Rice",
    category: "grain",
    shelfLife: { fridgeDays: 5, freezerDays: 180 },
    reheat: "microwave",
    prepTimeMin: 20,
    prepStyle: "cook",
  },
  {
    id: "cooked_couscous",
    name: "Cooked Couscous",
    category: "grain",
    shelfLife: { fridgeDays: 4, freezerDays: 90 },
    reheat: "microwave",
    prepTimeMin: 8,
    prepStyle: "cook",
  },

  // ── Vegetables ────────────────────────────────────────────────────────────
  {
    id: "roasted_vegetables",
    name: "Roasted Vegetables",
    category: "vegetable",
    shelfLife: { fridgeDays: 4, freezerDays: 30 },
    reheat: "oven",
    prepTimeMin: 30,
    prepStyle: "cook",
  },
  {
    id: "sauteed_onion_mix",
    name: "Sautéed Onion-Pepper Mix",
    category: "vegetable",
    shelfLife: { fridgeDays: 4, freezerDays: 60 },
    reheat: "stovetop",
    prepTimeMin: 10,
    prepStyle: "cook",
  },
  {
    id: "steamed_broccoli",
    name: "Steamed Broccoli",
    category: "vegetable",
    shelfLife: { fridgeDays: 4, freezerDays: 60 },
    reheat: "microwave",
    prepTimeMin: 6,
    prepStyle: "cook",
  },
  {
    id: "cooked_sweet_potato",
    name: "Cooked Sweet Potato",
    category: "vegetable",
    shelfLife: { fridgeDays: 5, freezerDays: 90 },
    reheat: "microwave",
    prepTimeMin: 25,
    prepStyle: "cook",
  },
  {
    id: "chopped_salad_greens",
    name: "Washed & Chopped Greens",
    category: "vegetable",
    shelfLife: { fridgeDays: 3, freezerDays: null },
    reheat: "none",
    prepTimeMin: 5,
    prepStyle: "cook",
  },

  // ── Legumes ───────────────────────────────────────────────────────────────
  {
    id: "cooked_black_beans",
    name: "Cooked Black Beans",
    category: "legume",
    shelfLife: { fridgeDays: 5, freezerDays: 180 },
    reheat: "stovetop",
    prepTimeMin: 5,
    prepStyle: "cook",
  },
  {
    id: "cooked_lentils",
    name: "Cooked Lentils",
    category: "legume",
    shelfLife: { fridgeDays: 5, freezerDays: 90 },
    reheat: "stovetop",
    prepTimeMin: 20,
    prepStyle: "cook",
  },
  {
    id: "cooked_chickpeas",
    name: "Cooked Chickpeas",
    category: "legume",
    shelfLife: { fridgeDays: 5, freezerDays: 180 },
    reheat: "stovetop",
    prepTimeMin: 5,
    prepStyle: "cook",
  },

  // ── Sauces ────────────────────────────────────────────────────────────────
  {
    id: "teriyaki_sauce",
    name: "Teriyaki Sauce",
    category: "sauce",
    shelfLife: { fridgeDays: 7, freezerDays: 90 },
    reheat: "none",
    prepTimeMin: 8,
    prepStyle: "cook",
  },
  {
    id: "basic_vinaigrette",
    name: "Basic Vinaigrette",
    category: "sauce",
    shelfLife: { fridgeDays: 7, freezerDays: null },
    reheat: "none",
    prepTimeMin: 3,
    prepStyle: "cook",
  },
  {
    id: "chimichurri",
    name: "Chimichurri",
    category: "sauce",
    shelfLife: { fridgeDays: 5, freezerDays: 30 },
    reheat: "none",
    prepTimeMin: 5,
    prepStyle: "cook",
  },
];

export const componentMap = new Map(
  BASE_COMPONENTS.map((c) => [c.id, c]),
);
