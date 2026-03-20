import { useState, useEffect, useCallback } from "react";
import { loadFangs } from "../lib/storage";
import { earnFangs as earnFangsService, spendFangs as spendFangsService } from "../lib/fangsService";
import { useAuth } from "../contexts/AuthContext";
import type { FangsRecord } from "../lib/types";

type UseFangsResult = {
  balance: number;
  loading: boolean;
  earn: (amount: number, reason: string) => Promise<void>;
  spend: (amount: number, itemId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
};

export function useFangs(): UseFangsResult {
  const { user } = useAuth();
  const [record, setRecord] = useState<FangsRecord>({ balance: 0, lastUpdated: "" });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await loadFangs();
    setRecord(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const earn = useCallback(async (amount: number, reason: string) => {
    if (!user) return;
    const updated = await earnFangsService(user.uid, amount, reason);
    setRecord(updated);
  }, [user]);

  const spend = useCallback(async (amount: number, itemId: string): Promise<boolean> => {
    if (!user) return false;
    const { success, record: updated } = await spendFangsService(user.uid, amount, itemId);
    if (success) setRecord(updated);
    return success;
  }, [user]);

  return {
    balance: record.balance,
    loading,
    earn,
    spend,
    refresh,
  };
}
