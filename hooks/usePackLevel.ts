import { useState, useEffect } from "react";
import { loadPackInfo } from "../lib/storage";
import { loadPackLevel, getPackLevel } from "../lib/packLevelService";
import type { PackLevel } from "../lib/types";

type UsePackLevelResult = {
  level: number;
  totalXp: number;
  memberCap: number;
  perks: string[];
};

export function usePackLevel(): UsePackLevelResult {
  const [packLevel, setPackLevel] = useState<PackLevel>(getPackLevel(0));

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const packInfo = await loadPackInfo();
        if (!packInfo) return;

        const level = await loadPackLevel(packInfo.id);
        if (mounted) setPackLevel(level);
      } catch {
        // Non-critical
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  return {
    level: packLevel.level,
    totalXp: packLevel.totalXp,
    memberCap: packLevel.memberCap,
    perks: packLevel.unlockedPerks,
  };
}
