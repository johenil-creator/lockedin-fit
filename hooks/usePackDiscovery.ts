import { useState, useCallback, useEffect } from "react";
import { searchPublicPacks } from "../lib/packDiscoveryService";
import type { PublicPack } from "../lib/types";

type UsePackDiscoveryResult = {
  packs: PublicPack[];
  loading: boolean;
  search: (query?: string, tags?: string[]) => Promise<void>;
  refresh: () => Promise<void>;
};

export function usePackDiscovery(): UsePackDiscoveryResult {
  const [packs, setPacks] = useState<PublicPack[]>([]);
  const [loading, setLoading] = useState(true);

  const search = useCallback(async (query?: string, tags?: string[]) => {
    setLoading(true);
    const results = await searchPublicPacks(query, tags);
    setPacks(results);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    await search();
  }, [search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { packs, loading, search, refresh };
}
