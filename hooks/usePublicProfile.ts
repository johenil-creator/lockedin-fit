import { useState, useCallback, useEffect } from "react";
import { getPublicProfile } from "../lib/publicProfileService";
import type { PublicProfile } from "../lib/types";

type UsePublicProfileResult = {
  profile: PublicProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function usePublicProfile(userId: string | null): UsePublicProfileResult {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const data = await getPublicProfile(userId);
    setProfile(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, loading, refresh };
}
