import { useState, useEffect, useCallback } from "react";
import { loadXP, saveXP } from "../lib/storage";
import { defaultXPRecord, applyXP } from "../lib/xpService";
import { rankForXP, nextRank, rankProgress, xpToNextRank } from "../lib/rankService";
import type { XPRecord, RankLevel } from "../lib/types";

export function useXP() {
  const [xp, setXP] = useState<XPRecord>(defaultXPRecord());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadXP().then((data) => {
      setXP(data ?? defaultXPRecord());
      setLoading(false);
    });
  }, []);

  /** Award XP and persist. Returns the updated record. */
  const awardXP = useCallback(
    async (amount: number, reason: string): Promise<XPRecord> => {
      let updated: XPRecord = defaultXPRecord();
      setXP((prev) => {
        updated = applyXP(prev, amount, reason);
        saveXP(updated);
        return updated;
      });
      // Small yield to let the state setter run, then return
      await Promise.resolve();
      return updated;
    },
    []
  );

  /** Replace the entire XP record (used after session-end bulk award). */
  const setXPRecord = useCallback(async (record: XPRecord): Promise<void> => {
    await saveXP(record);
    setXP(record);
  }, []);

  // Derived values — computed from current xp state
  const rank: RankLevel          = rankForXP(xp.total);
  const progress: number         = rankProgress(xp.total);
  const toNext: number           = xpToNextRank(xp.total);
  const nextTier                 = nextRank(rank);

  return { xp, loading, awardXP, setXPRecord, rank, progress, toNext, nextTier };
}
