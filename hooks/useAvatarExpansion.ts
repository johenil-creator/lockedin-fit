import { useState, useEffect, useCallback } from "react";
import { loadLockeCustomization } from "../lib/storage";
import {
  purchaseAura as purchaseAuraService,
  purchaseEmote as purchaseEmoteService,
  applyAura as applyAuraService,
  loadUnlockedAuras,
  loadUnlockedEmotes,
  getArmorForRank,
  AURA_CATALOG,
  EMOTE_CATALOG,
} from "../lib/avatarExpansionService";
import { useAuth } from "../contexts/AuthContext";
import type {
  LockeCustomization,
  ElementalEffect,
  ArmorTier,
  EmoteId,
  RankLevel,
} from "../lib/types";

type UseAvatarExpansionResult = {
  aura: ElementalEffect | undefined;
  armor: ArmorTier;
  emotes: typeof EMOTE_CATALOG;
  purchaseAura: (auraId: string) => Promise<boolean>;
  purchaseEmote: (emoteId: string) => Promise<boolean>;
  applyAura: (effect: ElementalEffect) => Promise<void>;
  triggerEmote: (emoteId: EmoteId) => EmoteId;
  ownedAuras: string[];
  ownedEmotes: string[];
  loading: boolean;
};

export function useAvatarExpansion(rank: RankLevel = "Runt"): UseAvatarExpansionResult {
  const { user } = useAuth();
  const [customization, setCustomization] = useState<LockeCustomization | null>(null);
  const [ownedAuras, setOwnedAuras] = useState<string[]>([]);
  const [ownedEmotes, setOwnedEmotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [custom, auras, emotes] = await Promise.all([
        loadLockeCustomization(),
        loadUnlockedAuras(),
        loadUnlockedEmotes(),
      ]);
      setCustomization(custom);
      setOwnedAuras(auras);
      setOwnedEmotes(emotes);
      setLoading(false);
    })();
  }, []);

  const purchaseAura = useCallback(
    async (auraId: string): Promise<boolean> => {
      if (!user) return false;
      const { success, ownedAuras: updated } = await purchaseAuraService(user.uid, auraId);
      if (success) setOwnedAuras(updated);
      return success;
    },
    [user]
  );

  const applyAuraHandler = useCallback(
    async (effect: ElementalEffect): Promise<void> => {
      if (!user) return;
      const updated = await applyAuraService(user.uid, effect);
      setCustomization(updated);
    },
    [user]
  );

  const purchaseEmote = useCallback(
    async (emoteId: string): Promise<boolean> => {
      if (!user) return false;
      const { success, ownedEmotes: updated } = await purchaseEmoteService(user.uid, emoteId);
      if (success) setOwnedEmotes(updated);
      return success;
    },
    [user]
  );

  const triggerEmote = useCallback((emoteId: EmoteId): EmoteId => {
    // No-op placeholder for now — returns emote ID
    return emoteId;
  }, []);

  const armor = getArmorForRank(rank);

  return {
    aura: customization?.aura as ElementalEffect | undefined,
    armor,
    emotes: EMOTE_CATALOG,
    purchaseAura,
    purchaseEmote,
    applyAura: applyAuraHandler,
    triggerEmote,
    ownedAuras,
    ownedEmotes,
    loading,
  };
}
