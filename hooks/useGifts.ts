import { useState, useCallback, useEffect } from "react";
import {
  getPendingGifts,
  claimGift as claimGiftService,
  sendGift as sendGiftService,
} from "../lib/giftService";
import { useAuth } from "../contexts/AuthContext";
import { useProfileContext } from "../contexts/ProfileContext";
import type { CosmeticGift } from "../lib/types";

type UseGiftsResult = {
  pendingGifts: CosmeticGift[];
  loading: boolean;
  send: (toUserId: string, itemId: string, itemPrice: number, message?: string) => Promise<{ success: boolean; error?: string }>;
  claim: (giftId: string, itemId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
};

export function useGifts(): UseGiftsResult {
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const [pendingGifts, setPendingGifts] = useState<CosmeticGift[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const gifts = await getPendingGifts(user.uid);
    setPendingGifts(gifts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const send = useCallback(
    async (
      toUserId: string,
      itemId: string,
      itemPrice: number,
      message = ""
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: "Not signed in" };
      return sendGiftService(user.uid, profile.name || user.displayName || user.email?.split("@")[0] || "Wolf", toUserId, itemId, itemPrice, message);
    },
    [user, profile.name]
  );

  const claim = useCallback(
    async (giftId: string, itemId: string): Promise<boolean> => {
      const success = await claimGiftService(giftId, itemId);
      if (success) {
        setPendingGifts((prev) => prev.filter((g) => g.id !== giftId));
      }
      return success;
    },
    []
  );

  return { pendingGifts, loading, send, claim, refresh };
}
