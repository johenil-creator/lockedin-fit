import { useState, useEffect, useCallback } from "react";
import { useRewardedAd } from "./useRewardedAd";
import { useFangs } from "./useFangs";
import {
  getAdWatchState,
  canWatchAd as canWatchAdService,
  recordAdWatch,
  MAX_DAILY_AD_WATCHES,
  FANGS_PER_AD_WATCH,
} from "../lib/adWatchService";

type UseAdWatchResult = {
  /** Number of watches remaining today */
  remaining: number;
  /** Whether the user can watch another ad */
  canWatch: boolean;
  /** Whether a rewarded ad is loaded and ready */
  adReady: boolean;
  /** Watch an ad and earn fangs. Returns true if reward was earned. */
  watchAd: () => Promise<boolean>;
  /** Refresh the daily state (call on focus) */
  refresh: () => Promise<void>;
  /** Loading initial state */
  loading: boolean;
};

export function useAdWatch(): UseAdWatchResult {
  const { show, ready } = useRewardedAd();
  const { earn } = useFangs();
  const [remaining, setRemaining] = useState(MAX_DAILY_AD_WATCHES);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const state = await getAdWatchState();
    setRemaining(MAX_DAILY_AD_WATCHES - state.watchCount);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const watchAd = useCallback(async (): Promise<boolean> => {
    const allowed = await canWatchAdService();
    if (!allowed) return false;

    // In dev, simulate a successful ad watch if no real ad is loaded
    if (__DEV__ && !ready) {
      console.log("[AdWatch] DEV: simulating ad watch");
      await recordAdWatch();
      await earn(FANGS_PER_AD_WATCH, "ad_watch");
      await refresh();
      return true;
    }

    const earned = await show();
    if (!earned) return false;

    await recordAdWatch();
    await earn(FANGS_PER_AD_WATCH, "ad_watch");
    await refresh();
    return true;
  }, [show, earn, refresh, ready]);

  return {
    remaining,
    canWatch: remaining > 0,
    adReady: ready,
    watchAd,
    refresh,
    loading,
  };
}
