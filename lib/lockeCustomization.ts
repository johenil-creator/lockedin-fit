import {
  loadLockeCustomization,
  saveLockeCustomization,
  loadOwnedCosmetics,
  saveOwnedCosmetics,
} from "./storage";
import { queueSocialWrite } from "./socialSync";
import type { CosmeticItem, CosmeticCategory, LockeCustomization, CosmeticRarity } from "./types";
// ── Cosmetic Catalog ────────────────────────────────────────────────────────

export const COSMETIC_CATALOG: CosmeticItem[] = [
  // ── Body Fur ──────────────────────────────────────────────────────────────
  { id: "body_fur_none",         category: "body_fur", name: "None",           price: 0,   preview: "",             rarity: "common",   unlockType: "free" },
  { id: "body_fur_brown",        category: "body_fur", name: "Timber Brown",   price: 0,   preview: "brown",        rarity: "common",   unlockType: "free" },
  { id: "body_fur_black",        category: "body_fur", name: "Shadow Black",  price: 50,  preview: "black",        rarity: "uncommon", unlockType: "purchase" },
  { id: "body_fur_arctic_white", category: "body_fur", name: "Arctic White",  price: 100, preview: "arctic_white", rarity: "rare",     unlockType: "purchase" },
  { id: "body_fur_merle",        category: "body_fur", name: "Ghost Merle",   price: 175, preview: "merle",        rarity: "epic",     unlockType: "purchase" },

  // ── Head Fur ──────────────────────────────────────────────────────────────
  { id: "head_fur_none",         category: "head_fur", name: "None",           price: 0,   preview: "",             rarity: "common",   unlockType: "free" },
  { id: "head_fur_brown",        category: "head_fur", name: "Timber Brown",   price: 0,   preview: "brown",        rarity: "common",   unlockType: "free" },
  { id: "head_fur_black",        category: "head_fur", name: "Shadow Black",  price: 50,  preview: "black",        rarity: "uncommon", unlockType: "purchase" },
  { id: "head_fur_arctic_white", category: "head_fur", name: "Arctic White",  price: 100, preview: "arctic_white", rarity: "rare",     unlockType: "purchase" },
  { id: "head_fur_merle",        category: "head_fur", name: "Ghost Merle",   price: 175, preview: "merle",        rarity: "epic",     unlockType: "purchase" },

  // ── Eyes ───────────────────────────────────────────────────────────────────
  { id: "eyes_none",   category: "eyes", name: "None",            price: 0,   preview: "",       rarity: "common",   unlockType: "free" },
  { id: "eyes_green",  category: "eyes", name: "Feral Green",     price: 0,   preview: "green",  rarity: "common",   unlockType: "free" },
  { id: "eyes_blue",   category: "eyes", name: "Glacier Blue",   price: 50,  preview: "blue",   rarity: "uncommon", unlockType: "purchase" },
  { id: "eyes_purple", category: "eyes", name: "Phantom Purple", price: 50,  preview: "purple", rarity: "uncommon", unlockType: "purchase" },
  { id: "eyes_red",    category: "eyes", name: "Bloodmoon Red",  price: 100, preview: "red",    rarity: "rare",     unlockType: "purchase" },

  // ── Brows ──────────────────────────────────────────────────────────────────
  { id: "brows_none",    category: "brows", name: "None",    price: 0,  preview: "",        rarity: "common",   unlockType: "free" },
  { id: "brows_neutral", category: "brows", name: "Style 1", price: 0,  preview: "neutral", rarity: "common",   unlockType: "free" },
  { id: "brows_happy",   category: "brows", name: "Style 2", price: 25, preview: "happy",   rarity: "uncommon", unlockType: "purchase" },
  { id: "brows_angry",   category: "brows", name: "Style 3", price: 25, preview: "angry",   rarity: "uncommon", unlockType: "purchase" },

  // ── Nose + Mouth ──────────────────────────────────────────────────────────
  { id: "nose_mouth_none",    category: "nose_mouth", name: "None",    price: 0,  preview: "",        rarity: "common",   unlockType: "free" },
  { id: "nose_mouth_neutral", category: "nose_mouth", name: "Neutral", price: 0,  preview: "neutral", rarity: "common",   unlockType: "free" },
  { id: "nose_mouth_smile",   category: "nose_mouth", name: "Smile",   price: 25, preview: "smile",   rarity: "uncommon", unlockType: "purchase" },
  { id: "nose_mouth_smirk",   category: "nose_mouth", name: "Smirk",   price: 50, preview: "smirk",   rarity: "uncommon", unlockType: "purchase" },

  // ── Neck Accessories ──────────────────────────────────────────────────────
  { id: "neck_none",           category: "neck_accessory", name: "None",           price: 0,   preview: "",               rarity: "common",    unlockType: "free" },
  { id: "neck_collar_round",   category: "neck_accessory", name: "Round Collar",   price: 50,  preview: "collar_round",   rarity: "uncommon",  unlockType: "purchase" },
  { id: "neck_collar_diamond", category: "neck_accessory", name: "Diamond Collar", price: 100, preview: "collar_diamond", rarity: "rare",      unlockType: "purchase" },
  { id: "neck_collar_spikes",  category: "neck_accessory", name: "Spiked Collar",  price: 175, preview: "collar_spikes",  rarity: "epic",      unlockType: "purchase" },

  // ── Ear Accessories ───────────────────────────────────────────────────────
  { id: "ear_none",          category: "ear_accessory", name: "None",          price: 0,  preview: "",              rarity: "common",   unlockType: "free" },
  { id: "ear_earring_left",  category: "ear_accessory", name: "Right Earring", price: 50, preview: "earring_left",  rarity: "uncommon", unlockType: "purchase" },
  { id: "ear_earring_right", category: "ear_accessory", name: "Left Earring",  price: 50, preview: "earring_right", rarity: "uncommon", unlockType: "purchase" },

  // ── Auras ─────────────────────────────────────────────────────────────────
  { id: "aura_none",    category: "aura", name: "None",         price: 0,   preview: "",        rarity: "common",    unlockType: "free" },
  { id: "aura_blue",    category: "aura", name: "Blue Aura",    price: 100, preview: "blue",    rarity: "rare",      unlockType: "purchase" },
  { id: "aura_green",   category: "aura", name: "Green Aura",   price: 100, preview: "green",   rarity: "rare",      unlockType: "purchase" },
  { id: "aura_purple",  category: "aura", name: "Purple Aura",  price: 175, preview: "purple",  rarity: "epic",      unlockType: "purchase" },
  { id: "aura_red",     category: "aura", name: "Red Aura",     price: 175, preview: "red",     rarity: "epic",      unlockType: "purchase" },
  { id: "aura_yellow",  category: "aura", name: "Yellow Aura",  price: 250, preview: "yellow",  rarity: "legendary", unlockType: "purchase" },

  // ── Head Accessories / Seasonal / Prestige ─────────────────────────────────
  { id: "head_none",         category: "head_accessory", name: "None",         price: 0,   preview: "",             rarity: "common",   unlockType: "free" },
  { id: "head_flower_crown", category: "head_accessory", name: "Flower Crown", price: 175, preview: "flower_crown", rarity: "epic",     unlockType: "seasonal" },
  { id: "head_apex_crown",   category: "head_accessory", name: "Apex Crown",    price: 500, preview: "apex_crown",   rarity: "prestige", unlockType: "milestone" },
];

// Free items are always owned
const FREE_ITEM_IDS = COSMETIC_CATALOG.filter((c) => c.price === 0).map((c) => c.id);

// ── Rarity display helpers ──────────────────────────────────────────────────

export const RARITY_COLORS: Record<CosmeticRarity, string> = {
  common: "#9E9E9E",
  uncommon: "#4CAF50",
  rare: "#2196F3",
  epic: "#9C27B0",
  legendary: "#FF9800",
  prestige: "#FFD700",
};

export const RARITY_LABELS: Record<CosmeticRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  prestige: "Prestige",
};

/**
 * Check if a cosmetic item is unlocked (owned or free).
 */
export function isUnlocked(itemId: string, ownedItems: string[]): boolean {
  return FREE_ITEM_IDS.includes(itemId) || ownedItems.includes(itemId);
}

/**
 * Get the catalog item by ID.
 */
export function getCosmeticById(itemId: string): CosmeticItem | undefined {
  return COSMETIC_CATALOG.find((c) => c.id === itemId);
}

/**
 * Get catalog items by category.
 */
export function getCosmeticsByCategory(category: CosmeticCategory): CosmeticItem[] {
  return COSMETIC_CATALOG.filter((c) => c.category === category);
}

/**
 * Studio tab structure — groups categories under tabs.
 */
export type StudioTab = {
  key: string;
  label: string;
  sections: { category: CosmeticCategory; label: string; items: CosmeticItem[] }[];
};

export function getStudioTabs(): StudioTab[] {
  return [
    {
      key: "fur",
      label: "Fur",
      sections: [
        { category: "body_fur", label: "Body", items: getCosmeticsByCategory("body_fur") },
        { category: "head_fur", label: "Head", items: getCosmeticsByCategory("head_fur") },
      ],
    },
    {
      key: "face",
      label: "Face",
      sections: [
        { category: "eyes", label: "Eyes", items: getCosmeticsByCategory("eyes") },
        { category: "brows", label: "Brows", items: getCosmeticsByCategory("brows") },
        { category: "nose_mouth", label: "Expression", items: getCosmeticsByCategory("nose_mouth") },
      ],
    },
    {
      key: "gear",
      label: "Gear",
      sections: [
        { category: "neck_accessory", label: "Collars", items: getCosmeticsByCategory("neck_accessory") },
        { category: "ear_accessory", label: "Earrings", items: getCosmeticsByCategory("ear_accessory") },
      ],
    },
    {
      key: "auras",
      label: "Auras",
      sections: [
        { category: "aura", label: "Aura Effect", items: getCosmeticsByCategory("aura") },
      ],
    },
  ];
}

/**
 * Get the active item ID from a customization state for a given category.
 * Returns the catalog item ID, or "" for optional categories with nothing equipped.
 */
export function getActiveItemId(
  customization: LockeCustomization,
  category: CosmeticCategory,
): string {
  const variantKey = getVariantKey(customization, category);

  // null means "None" selected — match the none item
  if (variantKey === null) {
    const noneItem = COSMETIC_CATALOG.find(
      (c) => c.category === category && c.preview === "",
    );
    return noneItem?.id ?? "";
  }

  // Find the catalog item whose preview matches the variant key
  const match = COSMETIC_CATALOG.find(
    (c) => c.category === category && c.preview === variantKey,
  );
  return match?.id ?? "";
}

/**
 * Get the variant key (asset filename key) from a customization for a category.
 */
function getVariantKey(
  customization: LockeCustomization,
  category: CosmeticCategory,
): string | null {
  switch (category) {
    case "body_fur": return customization.bodyFur;
    case "head_fur": return customization.headFur;
    case "eyes": return customization.eyes;
    case "brows": return customization.brows;
    case "nose_mouth": return customization.noseMouth;
    case "head_accessory": return customization.headAccessory;
    case "neck_accessory": return customization.neckAccessory;
    case "ear_accessory": return customization.earAccessory;
    case "aura": return customization.aura;
  }
}

/**
 * Save customization locally and queue Firestore sync.
 */
export async function applyCustomization(
  userId: string,
  customization: LockeCustomization,
): Promise<void> {
  await saveLockeCustomization(customization);

  // Queue Firestore sync
  await queueSocialWrite("users", userId, {
    lockeCustomization: customization,
  });
}

/**
 * Add an item to owned cosmetics.
 */
export async function addOwnedCosmetic(itemId: string): Promise<string[]> {
  const owned = await loadOwnedCosmetics();
  if (owned.includes(itemId)) return owned;
  const updated = [...owned, itemId];
  await saveOwnedCosmetics(updated);
  return updated;
}

