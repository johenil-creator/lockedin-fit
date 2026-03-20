import { TestIds } from "react-native-google-mobile-ads";

const IS_DEV = __DEV__;

export const AD_UNIT_IDS = {
  BANNER: IS_DEV
    ? TestIds.ADAPTIVE_BANNER
    : "ca-app-pub-5004436293909047/3231961393",
  INTERSTITIAL: IS_DEV
    ? TestIds.INTERSTITIAL
    : "ca-app-pub-5004436293909047/5471378828",
  REWARDED: IS_DEV
    ? TestIds.REWARDED
    : "ca-app-pub-5004436293909047/9246705408",
} as const;
