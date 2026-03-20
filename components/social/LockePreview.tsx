import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LockeAvatarBuilder } from "../avatar/LockeAvatarBuilder";
import type { LockeCustomization } from "../../lib/types";

type Props = {
  size: number;
  customization?: LockeCustomization;
};

/**
 * For sizes >= 40px, renders the full LockeAvatarBuilder.
 * For tiny thumbnails (< 40px), falls back to a compact emoji preview.
 */
function LockePreviewInner({ size, customization }: Props) {
  // Full avatar for studio / profile / larger displays
  if (size >= 40) {
    return <LockeAvatarBuilder size={size} customization={customization} animated={size >= 120} />;
  }

  // ── Compact emoji fallback for small social thumbnails ────────────────────
  const hasAura = !!customization?.aura;
  const borderWidth = Math.max(3, size * 0.07);

  return (
    <View style={{ width: size + 8, height: size + 8, alignItems: "center", justifyContent: "center" }}>
      {hasAura && (
        <View style={[styles.auraGlow, {
          width: size + 14,
          height: size + 14,
          borderRadius: (size + 14) / 2,
          borderColor: "#58A6FF",
          shadowColor: "#58A6FF",
        }]} />
      )}

      <View style={[styles.container, {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor: "#8B7355",
        backgroundColor: "#8B735525",
      }]}>
        <Text style={{ fontSize: size * 0.45, zIndex: 2 }}>{"\uD83D\uDC3A"}</Text>
      </View>
    </View>
  );
}

export const LockePreview = React.memo(LockePreviewInner);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  auraGlow: {
    position: "absolute",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
});
