import { spendFangs } from "./fangsService";
import { loadOwnedCosmetics, saveOwnedCosmetics } from "./storage";
import type { SeasonalCosmeticItem, RankLevel } from "./types";

// ── Seasonal Catalog ────────────────────────────────────────────────────────

export const SEASONAL_CATALOG: SeasonalCosmeticItem[] = [
  // Spring 2026 collection
  { id: "fur_spring_bloom", category: "body_fur", name: "Spring Bloom", price: 30, preview: "#FF69B4", rarity: "rare", availableFrom: "2026-03-01", availableUntil: "2026-05-31" },
  { id: "eye_spring_emerald", category: "eyes", name: "Spring Emerald", price: 20, preview: "#50C878", rarity: "common", availableFrom: "2026-03-01", availableUntil: "2026-05-31" },
  { id: "head_flower_crown", category: "head_accessory", name: "Flower Crown", price: 175, preview: "flower_crown", rarity: "epic", availableFrom: "2026-03-01", availableUntil: "2026-05-31" },
  // Summer 2026 collection
  { id: "fur_beach_gold", category: "body_fur", name: "Beach Gold", price: 35, preview: "#FFD700", rarity: "rare", availableFrom: "2026-06-01", availableUntil: "2026-08-31" },
  { id: "eye_ocean_blue", category: "eyes", name: "Ocean Blue", price: 25, preview: "#0077BE", rarity: "common", availableFrom: "2026-06-01", availableUntil: "2026-08-31" },
  { id: "acc_sunglasses", category: "neck_accessory", name: "Sunglasses", price: 40, preview: "sunny-outline", rarity: "rare", availableFrom: "2026-06-01", availableUntil: "2026-08-31" },
  // Fall 2026 collection
  { id: "fur_autumn_rust", category: "body_fur", name: "Autumn Rust", price: 30, preview: "#C04000", rarity: "rare", availableFrom: "2026-09-01", availableUntil: "2026-11-30" },
  { id: "eye_amber", category: "eyes", name: "Amber Glow", price: 20, preview: "#FFBF00", rarity: "common", availableFrom: "2026-09-01", availableUntil: "2026-11-30" },
  { id: "acc_harvest_scarf", category: "neck_accessory", name: "Harvest Scarf", price: 45, preview: "leaf-outline", rarity: "epic", availableFrom: "2026-09-01", availableUntil: "2026-11-30" },
  // Winter 2026 collection
  { id: "fur_frost", category: "body_fur", name: "Frostbite", price: 40, preview: "#B0E0E6", rarity: "epic", availableFrom: "2026-12-01", availableUntil: "2027-02-28" },
  { id: "eye_ice", category: "eyes", name: "Ice Crystal", price: 25, preview: "#A5F2F3", rarity: "rare", availableFrom: "2026-12-01", availableUntil: "2027-02-28" },
  { id: "acc_snow_crown", category: "neck_accessory", name: "Snow Crown", price: 60, preview: "snow-outline", rarity: "legendary", availableFrom: "2026-12-01", availableUntil: "2027-02-28" },
];

// ── Prestige Catalog (rank-locked) ──────────────────────────────────────────

export const PRESTIGE_CATALOG: SeasonalCosmeticItem[] = [
  { id: "acc_scout_bandana",   category: "neck_accessory",  name: "Scout Bandana",   price: 50,  preview: "scout_bandana", rarity: "prestige", availableFrom: "2026-01-01", availableUntil: "2099-12-31", requiredRank: "Scout" },
  { id: "eye_stalker_green",   category: "eyes",            name: "Stalker Green",   price: 100, preview: "#228B22",       rarity: "prestige", availableFrom: "2026-01-01", availableUntil: "2099-12-31", requiredRank: "Stalker" },
  { id: "fur_hunter_shadow",   category: "body_fur",        name: "Hunter Shadow",   price: 175, preview: "#2F4F4F",       rarity: "prestige", availableFrom: "2026-01-01", availableUntil: "2099-12-31", requiredRank: "Hunter" },
  { id: "fur_sentinel_steel",  category: "body_fur",        name: "Sentinel Steel",  price: 250, preview: "#708090",       rarity: "prestige", availableFrom: "2026-01-01", availableUntil: "2099-12-31", requiredRank: "Sentinel" },
  { id: "eye_alpha_crimson",   category: "eyes",            name: "Alpha Crimson",   price: 350, preview: "#DC143C",       rarity: "prestige", availableFrom: "2026-01-01", availableUntil: "2099-12-31", requiredRank: "Alpha" },
  { id: "head_apex_crown",     category: "head_accessory",  name: "Apex Crown",      price: 500, preview: "apex_crown",    rarity: "prestige", availableFrom: "2026-01-01", availableUntil: "2099-12-31", requiredRank: "Apex" },
];

const RANK_ORDER: RankLevel[] = ["Runt", "Scout", "Stalker", "Hunter", "Sentinel", "Alpha", "Apex", "Apex_Bronze", "Apex_Silver", "Apex_Gold"];

function meetsRankRequirement(currentRank: RankLevel, requiredRank?: RankLevel): boolean {
  if (!requiredRank) return true;
  return RANK_ORDER.indexOf(currentRank) >= RANK_ORDER.indexOf(requiredRank);
}

/**
 * Get seasonal items available right now.
 */
export function getAvailableSeasonalItems(now?: Date): SeasonalCosmeticItem[] {
  const d = now ?? new Date();
  const dateStr = d.toISOString().slice(0, 10);
  return SEASONAL_CATALOG.filter(
    (item) => dateStr >= item.availableFrom && dateStr <= item.availableUntil
  );
}

/**
 * Get prestige items unlockable at current rank.
 */
export function getUnlockablePrestigeItems(rank: RankLevel): SeasonalCosmeticItem[] {
  return PRESTIGE_CATALOG.map((item) => ({
    ...item,
    _unlocked: meetsRankRequirement(rank, item.requiredRank),
  })).sort((a, b) => {
    // Unlocked first, then by price
    if (a._unlocked && !b._unlocked) return -1;
    if (!a._unlocked && b._unlocked) return 1;
    return a.price - b.price;
  }).map(({ _unlocked, ...item }) => item);
}

/**
 * Purchase a seasonal or prestige cosmetic item.
 */
export async function purchaseSeasonalItem(
  userId: string,
  itemId: string,
  rank: RankLevel
): Promise<{ success: boolean; error?: string }> {
  const allItems = [...SEASONAL_CATALOG, ...PRESTIGE_CATALOG];
  const item = allItems.find((i) => i.id === itemId);
  if (!item) return { success: false, error: "Item not found" };

  // Check rank requirement
  if (item.requiredRank && !meetsRankRequirement(rank, item.requiredRank)) {
    return { success: false, error: `Requires ${item.requiredRank} rank` };
  }

  // Check availability
  const now = new Date().toISOString().slice(0, 10);
  if (now < item.availableFrom || now > item.availableUntil) {
    return { success: false, error: "Item no longer available" };
  }

  // Check if already owned
  const owned = await loadOwnedCosmetics();
  if (owned.includes(itemId)) {
    return { success: false, error: "Already owned" };
  }

  // Spend Fangs
  const { success } = await spendFangs(userId, item.price, itemId);
  if (!success) {
    return { success: false, error: "Insufficient Fangs" };
  }

  // Add to owned
  await saveOwnedCosmetics([...owned, itemId]);
  return { success: true };
}
