import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getPartner,
  pairPartner,
  unpairPartner,
  sendNudge as sendNudgeService,
  canNudge as canNudgeService,
} from "../lib/accountabilityService";
import type { AccountabilityPartner } from "../lib/types";

type UseAccountabilityResult = {
  partner: AccountabilityPartner | null;
  pair: (partnerId: string, partnerName: string) => Promise<void>;
  unpair: () => Promise<void>;
  nudge: () => Promise<boolean>;
  canNudge: boolean;
};

export function useAccountability(): UseAccountabilityResult {
  const { user } = useAuth();
  const [partner, setPartner] = useState<AccountabilityPartner | null>(null);
  const [nudgeAllowed, setNudgeAllowed] = useState(true);

  const load = useCallback(async () => {
    try {
      const p = await getPartner();
      setPartner(p);
      if (p) {
        const allowed = await canNudgeService(p.partnerId);
        setNudgeAllowed(allowed);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pair = useCallback(
    async (partnerId: string, partnerName: string) => {
      if (!user) return;
      const p = await pairPartner(user.uid, partnerId, partnerName);
      setPartner(p);
    },
    [user]
  );

  const unpair = useCallback(async () => {
    if (!user) return;
    await unpairPartner(user.uid);
    setPartner(null);
  }, [user]);

  const nudge = useCallback(async () => {
    if (!user || !partner) return false;
    const sent = await sendNudgeService(
      user.uid,
      user.displayName ?? "Wolf",
      partner.partnerId
    );
    if (sent) setNudgeAllowed(false);
    return sent;
  }, [user, partner]);

  return { partner, pair, unpair, nudge, canNudge: nudgeAllowed };
}
