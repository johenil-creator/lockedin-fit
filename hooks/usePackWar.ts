import { useState, useEffect, useCallback } from "react";
import { loadPackInfo } from "../lib/storage";
import {
  requestWar as requestWarService,
  getActiveWar,
} from "../lib/packWarService";
import type { PackWar } from "../lib/types";

type UsePackWarResult = {
  war: PackWar | null;
  requestWar: () => Promise<boolean>;
  warLoading: boolean;
};

export function usePackWar(): UsePackWarResult {
  const [war, setWar] = useState<PackWar | null>(null);
  const [warLoading, setWarLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const packInfo = await loadPackInfo();
        if (!packInfo) {
          if (mounted) setWarLoading(false);
          return;
        }

        const activeWar = await getActiveWar(packInfo.id);
        if (mounted) setWar(activeWar);
      } catch {
        // Non-critical
      } finally {
        if (mounted) setWarLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  const requestWar = useCallback(async (): Promise<boolean> => {
    const packInfo = await loadPackInfo();
    if (!packInfo) return false;

    const result = await requestWarService(packInfo.id, packInfo.name);
    if (result) {
      setWar(result);
      return true;
    }
    return false;
  }, []);

  return { war, requestWar, warLoading };
}
