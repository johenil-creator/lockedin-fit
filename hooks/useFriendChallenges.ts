import { useState, useCallback, useEffect } from "react";
import {
  createChallenge as createChallengeService,
  respondToChallenge as respondService,
  getActiveChallenges,
} from "../lib/friendChallengeService";
import { useAuth } from "../contexts/AuthContext";
import { useProfileContext } from "../contexts/ProfileContext";
import type { FriendChallenge, FriendChallengeMetric } from "../lib/types";

type UseFriendChallengesResult = {
  challenges: FriendChallenge[];
  pending: FriendChallenge[];
  loading: boolean;
  create: (opponentId: string, opponentName: string, metric: FriendChallengeMetric) => Promise<boolean>;
  respond: (challengeId: string, accept: boolean) => Promise<boolean>;
  refresh: () => Promise<void>;
};

export function useFriendChallenges(): UseFriendChallengesResult {
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const [challenges, setChallenges] = useState<FriendChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const data = await getActiveChallenges(user.uid);
    setChallenges(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pending = challenges.filter(
    (c) => c.status === "pending" && c.opponentId === user?.uid
  );

  const create = useCallback(
    async (
      opponentId: string,
      opponentName: string,
      metric: FriendChallengeMetric
    ): Promise<boolean> => {
      if (!user) return false;
      const result = await createChallengeService(
        user.uid,
        profile.name || user.displayName || user.email?.split("@")[0] || "Wolf",
        opponentId,
        opponentName,
        metric
      );
      if (result) {
        setChallenges((prev) => [...prev, result]);
        return true;
      }
      return false;
    },
    [user, profile.name]
  );

  const respond = useCallback(
    async (challengeId: string, accept: boolean): Promise<boolean> => {
      const success = await respondService(challengeId, accept);
      if (success) {
        setChallenges((prev) =>
          prev.map((c) =>
            c.id === challengeId
              ? { ...c, status: accept ? ("active" as const) : ("declined" as const) }
              : c
          )
        );
      }
      return success;
    },
    []
  );

  return { challenges, pending, loading, create, respond, refresh };
}
