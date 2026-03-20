import React from "react";
import { View, StyleSheet } from "react-native";
import {
  BannerAd,
  BannerAdSize,
} from "react-native-google-mobile-ads";
import { AD_UNIT_IDS } from "../../lib/adConfig";

/**
 * Self-contained adaptive banner ad.
 * Renders nothing on error so the layout stays clean.
 */
function AdBannerInner() {
  const [failed, setFailed] = React.useState(false);

  if (failed) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_IDS.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 4,
  },
});

export const AdBanner = React.memo(AdBannerInner);
