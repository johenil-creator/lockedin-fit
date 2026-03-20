import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadLockeCustomization, saveLockeCustomization } from "./storage";
import { spendFangs } from "./fangsService";
import { queueSocialWrite } from "./socialSync";
import type {
  AuraCosmeticItem,
  ArmorTier,
  EmoteItem,
  ElementalEffect,
  EmoteId,
  RankLevel,
  LockeCustomization,
} from "./types";

// ── Storage Keys ───────────────────────────────────────────────────────────

const UNLOCKED_AURAS_KEY = "@lockedinfit/unlocked-auras";
const UNLOCKED_EMOTES_KEY = "@lockedinfit/unlocked-emotes";
const UNLOCKED_ARMOR_KEY = "@lockedinfit/unlocked-armor";

// ── Aura Catalog ───────────────────────────────────────────────────────────

export const AURA_CATALOG: AuraCosmeticItem[] = [
  { id: "aura_fire",      effect: "fire",      name: "Inferno Aura",    price: 75  },
  { id: "aura_frost",     effect: "frost",      name: "Frost Aura",      price: 100 },
  { id: "aura_lightning", effect: "lightning",  name: "Lightning Aura",  price: 125 },
  { id: "aura_shadow",    effect: "shadow",     name: "Shadow Aura",     price: 150 },
  { id: "aura_nature",    effect: "nature",     name: "Nature Aura",     price: 200 },
];

// ── Armor Map ──────────────────────────────────────────────────────────────

export const ARMOR_MAP: Record<RankLevel, ArmorTier> = {
  Runt:         "none",
  Scout:        "light",
  Stalker:      "light",
  Hunter:       "medium",
  Sentinel:     "heavy",
  Alpha:        "legendary",
  Apex:         "mythic",
  Apex_Bronze:  "mythic",
  Apex_Silver:  "mythic",
  Apex_Gold:    "mythic",
};

// ── Emote Catalog ──────────────────────────────────────────────────────────

export const EMOTE_CATALOG: EmoteItem[] = [
  { id: "howl",      name: "Howl",      price: 50,  animationAsset: "howl" },
  { id: "flex",      name: "Flex",      price: 75,  animationAsset: "flex" },
  { id: "meditate",  name: "Meditate",  price: 100, animationAsset: "meditate" },
  { id: "sprint",    name: "Sprint",    price: 100, animationAsset: "sprint" },
  { id: "celebrate", name: "Celebrate", price: 125, animationAsset: "celebrate" },
  { id: "challenge", name: "Challenge", price: 150, animationAsset: "challenge" },
];

// ── Storage helpers ────────────────────────────────────────────────────────

async function loadStringArray(key: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    if (__DEV__) console.warn("[avatarExpansionService] caught:", e);
    return [];
  }
}

async function saveStringArray(key: string, arr: string[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(arr));
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Load all unlocked aura IDs from storage.
 */
export async function loadUnlockedAuras(): Promise<string[]> {
  return loadStringArray(UNLOCKED_AURAS_KEY);
}

/**
 * Load all unlocked emote IDs from storage.
 */
export async function loadUnlockedEmotes(): Promise<string[]> {
  return loadStringArray(UNLOCKED_EMOTES_KEY);
}

/**
 * Load all unlocked armor tiers from storage.
 */
export async function loadUnlockedArmor(): Promise<string[]> {
  return loadStringArray(UNLOCKED_ARMOR_KEY);
}

/**
 * Purchase an aura using Fangs. Returns { success, ownedAuras }.
 */
export async function purchaseAura(
  userId: string,
  auraId: string
): Promise<{ success: boolean; ownedAuras: string[] }> {
  const aura = AURA_CATALOG.find((a) => a.id === auraId);
  if (!aura) return { success: false, ownedAuras: await loadUnlockedAuras() };

  const owned = await loadUnlockedAuras();
  if (owned.includes(auraId)) return { success: true, ownedAuras: owned };

  const { success } = await spendFangs(userId, aura.price, auraId);
  if (!success) return { success: false, ownedAuras: owned };

  const updated = [...owned, auraId];
  await saveStringArray(UNLOCKED_AURAS_KEY, updated);
  return { success: true, ownedAuras: updated };
}

/**
 * Purchase an emote using Fangs. Returns { success, ownedEmotes }.
 */
export async function purchaseEmote(
  userId: string,
  emoteId: string
): Promise<{ success: boolean; ownedEmotes: string[] }> {
  const emote = EMOTE_CATALOG.find((e) => e.id === emoteId);
  if (!emote) return { success: false, ownedEmotes: await loadUnlockedEmotes() };

  const owned = await loadUnlockedEmotes();
  if (owned.includes(emoteId)) return { success: true, ownedEmotes: owned };

  const { success } = await spendFangs(userId, emote.price, emoteId);
  if (!success) return { success: false, ownedEmotes: owned };

  const updated = [...owned, emoteId];
  await saveStringArray(UNLOCKED_EMOTES_KEY, updated);
  return { success: true, ownedEmotes: updated };
}

/**
 * Pure lookup: get the armor tier for a given rank.
 */
export function getArmorForRank(rank: RankLevel): ArmorTier {
  return ARMOR_MAP[rank] ?? "none";
}

/**
 * Unlock an armor tier (persists to storage).
 */
export async function unlockArmor(tier: ArmorTier): Promise<void> {
  const owned = await loadUnlockedArmor();
  if (owned.includes(tier)) return;
  const updated = [...owned, tier];
  await saveStringArray(UNLOCKED_ARMOR_KEY, updated);
}

/**
 * Apply an aura effect to the user's Locke customization and sync to Firestore.
 */
export async function applyAura(
  userId: string,
  effect: ElementalEffect
): Promise<LockeCustomization> {
  const customization = await loadLockeCustomization();
  const updated: LockeCustomization = { ...customization, aura: effect };
  await saveLockeCustomization(updated);

  await queueSocialWrite("users", userId, {
    lockeCustomization: updated,
  });

  return updated;
}

/**
 * Get an aura catalog item by ID.
 */
export function getAuraById(auraId: string): AuraCosmeticItem | undefined {
  return AURA_CATALOG.find((a) => a.id === auraId);
}

/**
 * Get an emote catalog item by ID.
 */
export function getEmoteById(emoteId: string): EmoteItem | undefined {
  return EMOTE_CATALOG.find((e) => e.id === emoteId);
}
