import { useState, useEffect, useCallback, useRef } from "react";
import { loadXP, saveXP } from "../lib/storage";
import { defaultXPRecord, applyXP } from "../lib/xpService";
import { rankForXP, nextRank, rankProgress, xpToNextRank } from "../lib/rankService";
import { getCurrentWeekKey } from "../lib/leagueService";
import { syncWeeklyXP } from "../lib/xpSync";
import { auth } from "../lib/firebase";
import type { XPRecord, RankLevel } from "../lib/types";

export function useXP() {
  const [xp, setXP] = useState<XPRecord>(defaultXPRecord());
  const xpRef = useRef<XPRecord>(defaultXPRecord());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadXP().then((data) => {
      const resolved = data ?? defaultXPRecord();
      xpRef.current = resolved;
      setXP(resolved);
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, []);

  /** Award XP and persist. Returns the updated record. Syncs to Firebase fire-and-forget. */
  const awardXP = useCallback(
    async (amount: number, reason: string): Promise<XPRecord> => {
      const updated = applyXP(xpRef.current, amount, reason);
      xpRef.current = updated;
      setXP(updated);
      await saveXP(updated);

      // Fire-and-forget sync to Firebase
      const user = auth.currentUser;
      if (user && amount > 0) {
        syncWeeklyXP(user.uid, getCurrentWeekKey(), amount).catch(() => {});
      }

      return updated;
    },
    []
  );

  /** Replace the entire XP record (used after session-end bulk award). Syncs delta to Firebase. */
  const setXPRecord = useCallback(async (record: XPRecord): Promise<void> => {
    const delta = record.total - xpRef.current.total;
    xpRef.current = record;
    await saveXP(record);
    setXP(record);

    // Fire-and-forget sync the delta XP to Firebase
    if (delta > 0) {
      const user = auth.currentUser;
      if (user) {
        syncWeeklyXP(user.uid, getCurrentWeekKey(), delta).catch(() => {});
      }
    }
  }, []);

  // Derived values — computed from current xp state
  const rank: RankLevel          = rankForXP(xp.total);
  const progress: number         = rankProgress(xp.total);
  const toNext: number           = xpToNextRank(xp.total);
  const nextTier                 = nextRank(rank);

  return { xp, loading, awardXP, setXPRecord, rank, progress, toNext, nextTier };
}
