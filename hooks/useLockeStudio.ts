import { useState, useEffect, useCallback } from "react";
import {
  loadLockeCustomization,
  loadOwnedCosmetics,
} from "../lib/storage";
import { DEFAULT_AVATAR } from "../components/avatar/LockeAvatarBuilder";
import {
  applyCustomization,
  addOwnedCosmetic,
  getCosmeticById,
  isUnlocked,
} from "../lib/lockeCustomization";
import { SEASONAL_CATALOG, PRESTIGE_CATALOG } from "../lib/seasonalCosmeticService";
import { spendFangs } from "../lib/fangsService";
import { useAuth } from "../contexts/AuthContext";
import type { LockeCustomization, CosmeticCategory } from "../lib/types";

type UseLockeStudioResult = {
  customization: LockeCustomization;
  ownedItems: string[];
  loading: boolean;
  /** Update preview (doesn't save) */
  selectItem: (category: CosmeticCategory, variantKey: string) => void;
  /** Purchase a cosmetic item, returns false if insufficient fangs */
  purchaseItem: (itemId: string) => Promise<boolean>;
  /** Save current customization to storage + Firestore */
  save: () => Promise<void>;
  /** Reset to last saved state */
  reset: () => void;
};

export function useLockeStudio(): UseLockeStudioResult {
  const { user } = useAuth();
  const [savedCustomization, setSavedCustomization] = useState<LockeCustomization>(DEFAULT_AVATAR);
  const [customization, setCustomization] = useState<LockeCustomization>(DEFAULT_AVATAR);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [custom, owned] = await Promise.all([
        loadLockeCustomization(),
        loadOwnedCosmetics(),
      ]);
      // Migrate old format or use defaults (bodyFur can be null for "None")
      const resolved = custom && ("bodyFur" in custom) ? custom : DEFAULT_AVATAR;
      setCustomization(resolved);
      setSavedCustomization(resolved);
      setOwnedItems(owned);
      setLoading(false);
    })();
  }, []);

  const selectItem = useCallback((category: CosmeticCategory, variantKey: string) => {
    setCustomization((prev) => {
      // Empty string means "None" — store as null
      const value = variantKey || null;
      switch (category) {
        case "body_fur":
          return { ...prev, bodyFur: value };
        case "head_fur":
          return { ...prev, headFur: value };
        case "eyes":
          return { ...prev, eyes: value };
        case "brows":
          return { ...prev, brows: value };
        case "nose_mouth":
          return { ...prev, noseMouth: value };
        case "head_accessory":
          return { ...prev, headAccessory: value };
        case "neck_accessory":
          return { ...prev, neckAccessory: value };
        case "ear_accessory":
          return { ...prev, earAccessory: value };
        case "aura":
          return { ...prev, aura: value };
        default:
          return prev;
      }
    });
  }, []);

  const purchaseItem = useCallback(async (itemId: string): Promise<boolean> => {
    const item = getCosmeticById(itemId)
      ?? [...SEASONAL_CATALOG, ...PRESTIGE_CATALOG].find((i) => i.id === itemId);
    if (!item) return false;
    if (isUnlocked(itemId, ownedItems)) return true;

    const { success } = await spendFangs(user?.uid ?? "local", item.price, itemId);
    if (!success) return false;

    const updated = await addOwnedCosmetic(itemId);
    setOwnedItems(updated);
    return true;
  }, [user, ownedItems]);

  const save = useCallback(async () => {
    await applyCustomization(user?.uid ?? "local", customization);
    setSavedCustomization(customization);
  }, [user, customization]);

  const reset = useCallback(() => {
    setCustomization(savedCustomization);
  }, [savedCustomization]);

  return {
    customization,
    ownedItems,
    loading,
    selectItem,
    purchaseItem,
    save,
    reset,
  };
}
