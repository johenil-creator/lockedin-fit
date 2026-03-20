import { useCallback, useEffect, useRef } from "react";
import {
  InterstitialAd,
  AdEventType,
} from "react-native-google-mobile-ads";
import { AD_UNIT_IDS } from "../lib/adConfig";

const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL);

/**
 * Preloads an interstitial ad and returns a `show` function.
 * If the ad isn't ready when `show` is called, it resolves immediately
 * so the user is never blocked.
 */
export function useInterstitialAd() {
  const loaded = useRef(false);

  useEffect(() => {
    const onLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      loaded.current = true;
    });
    const onClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      loaded.current = false;
      // Preload next one
      interstitial.load();
    });
    const onError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      loaded.current = false;
    });

    interstitial.load();

    return () => {
      onLoaded();
      onClosed();
      onError();
    };
  }, []);

  const show = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (!loaded.current) {
        resolve();
        return;
      }
      const unsub = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        unsub();
        resolve();
      });
      interstitial.show().catch(() => {
        unsub();
        resolve();
      });
    });
  }, []);

  return { show };
}
