import { useState, useCallback, useEffect } from "react";
import {
  getAvailableSeasonalItems,
  getUnlockablePrestigeItems,
  purchaseSeasonalItem,
} from "../lib/seasonalCosmeticService";
import { loadOwnedCosmetics } from "../lib/storage";
import { useAuth } from "../contexts/AuthContext";
import { useXP } from "./useXP";
import type { SeasonalCosmeticItem, RankLevel } from "../lib/types";

type UseSeasonalShopResult = {
  seasonalItems: SeasonalCosmeticItem[];
  prestigeItems: SeasonalCosmeticItem[];
  ownedIds: string[];
  loading: boolean;
  purchase: (itemId: string) => Promise<{ success: boolean; error?: string }>;
};

export function useSeasonalShop(rankOverride?: RankLevel): UseSeasonalShopResult {
  const { user } = useAuth();
  const { rank: realRank } = useXP();
  const rank = rankOverride ?? realRank;
  const [seasonalItems, setSeasonalItems] = useState<SeasonalCosmeticItem[]>([]);
  const [prestigeItems, setPrestigeItems] = useState<SeasonalCosmeticItem[]>([]);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [seasonal, prestige, owned] = await Promise.all([
      Promise.resolve(getAvailableSeasonalItems()),
      Promise.resolve(getUnlockablePrestigeItems(rank)),
      loadOwnedCosmetics(),
    ]);
    setSeasonalItems(seasonal);
    setPrestigeItems(prestige);
    setOwnedIds(owned);
    setLoading(false);
  }, [rank]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const purchase = useCallback(
    async (itemId: string): Promise<{ success: boolean; error?: string }> => {
      const result = await purchaseSeasonalItem(user?.uid ?? "local", itemId, rank);
      if (result.success) {
        setOwnedIds((prev) => [...prev, itemId]);
      }
      return result;
    },
    [user, rank]
  );

  return { seasonalItems, prestigeItems, ownedIds, loading, purchase };
}
