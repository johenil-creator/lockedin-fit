import { useCallback, useEffect, useRef, useState } from "react";
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from "react-native-google-mobile-ads";
import { AD_UNIT_IDS } from "../lib/adConfig";

const rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);

/**
 * Preloads a rewarded ad and returns `show` + `ready`.
 * `show` resolves with `true` if the user earned the reward, `false` otherwise.
 */
export function useRewardedAd() {
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    const onLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => { readyRef.current = true; setReady(true); }
    );
    const onClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      readyRef.current = false;
      setReady(false);
      rewarded.load();
    });
    const onError = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
      readyRef.current = false;
      setReady(false);
      if (__DEV__) console.warn("[RewardedAd] load error:", error);
      // Retry after a short delay
      setTimeout(() => rewarded.load(), 5000);
    });

    rewarded.load();

    return () => {
      onLoaded();
      onClosed();
      onError();
    };
  }, []);

  const show = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!readyRef.current) {
        resolve(false);
        return;
      }

      let earned = false;

      const unsubEarned = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => { earned = true; }
      );
      const unsubClosed = rewarded.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          unsubEarned();
          unsubClosed();
          resolve(earned);
        }
      );

      rewarded.show().catch(() => {
        unsubEarned();
        unsubClosed();
        resolve(false);
      });
    });
  }, []);

  return { show, ready };
}
