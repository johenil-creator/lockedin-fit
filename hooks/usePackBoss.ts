import { useState, useEffect, useCallback } from "react";
import { loadPackInfo } from "../lib/storage";
import {
  spawnBoss as spawnBossService,
  getActiveBoss,
  getContributions as getContributionsService,
} from "../lib/packBossService";
import type { PackBoss, PackBossContribution } from "../lib/types";

type UsePackBossResult = {
  boss: PackBoss | null;
  spawnBoss: (bossIndex: number, memberCount: number) => Promise<boolean>;
  contributions: PackBossContribution[];
  bossLoading: boolean;
};

export function usePackBoss(): UsePackBossResult {
  const [boss, setBoss] = useState<PackBoss | null>(null);
  const [contributions, setContributions] = useState<PackBossContribution[]>([]);
  const [bossLoading, setBossLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const packInfo = await loadPackInfo();
        if (!packInfo) {
          if (mounted) setBossLoading(false);
          return;
        }

        const activeBoss = await getActiveBoss(packInfo.id);
        if (mounted) {
          setBoss(activeBoss);
          if (activeBoss) {
            const contribs = await getContributionsService(activeBoss.id);
            if (mounted) setContributions(contribs);
          }
        }
      } catch {
        // Non-critical
      } finally {
        if (mounted) setBossLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  const spawnBoss = useCallback(
    async (bossIndex: number, memberCount: number): Promise<boolean> => {
      const packInfo = await loadPackInfo();
      if (!packInfo) return false;

      const result = await spawnBossService(packInfo.id, bossIndex, memberCount);
      if (result) {
        setBoss(result);
        setContributions([]);
        return true;
      }
      return false;
    },
    []
  );

  return { boss, spawnBoss, contributions, bossLoading };
}
