import { useState, useCallback, useEffect } from "react";
import {
  createPackChallenge,
  getActiveChallenge,
} from "../lib/packChallengeService";
import { useAuth } from "../contexts/AuthContext";
import type { PackChallenge, PackChallengeType } from "../lib/types";

type UsePackChallengeResult = {
  challenge: PackChallenge | null;
  loading: boolean;
  create: (type: PackChallengeType, target: number) => Promise<boolean>;
  refresh: () => Promise<void>;
};

export function usePackChallenge(packId: string | null): UsePackChallengeResult {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<PackChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!packId) {
      setLoading(false);
      return;
    }
    const active = await getActiveChallenge(packId);
    setChallenge(active);
    setLoading(false);
  }, [packId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (type: PackChallengeType, target: number): Promise<boolean> => {
      if (!user || !packId) return false;
      const result = await createPackChallenge(packId, user.uid, type, target);
      if (result) {
        setChallenge(result);
        return true;
      }
      return false;
    },
    [user, packId]
  );

  return { challenge, loading, create, refresh };
}
