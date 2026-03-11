/**
 * Locke.tsx — backward-compat wrapper.
 * Exports LockeMini and LockeBanner using the PNG-based LockeMascot.
 * All existing imports in index.tsx / session/[id].tsx continue to work.
 */

import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLocke } from "../contexts/LockeContext";
import { LockeMascot } from "./Locke/LockeMascot";
import type { LockeMascotMood } from "./Locke/LockeMascot";
import { radius, spacing } from "../lib/theme";
import type { LockeState } from "../lib/types";

// Map LockeState (system mood) → LockeMascotMood (visual mood)
function toMascotMood(state: LockeState): LockeMascotMood {
  switch (state) {
    case "celebrating":      return "celebrating";
    case "intense":          return "intense";
    case "encouraging":      return "encouraging";
    case "disappointed":     return "disappointed";
    case "savage":           return "savage";
    default:                 return "neutral";
  }
}

// ── LockeMini — header icon, always visible, tap to show last message ─────────

export function LockeMini() {
  const { locke } = useLocke();
  const { theme } = useAppTheme();
  const [showBubble, setShowBubble] = useState(false);

  // Always reflect the last fired mood — don't reset to neutral when event expires
  const mood = toMascotMood(locke.state);

  return (
    <View>
      <LockeMascot
        size={120}
        mood={mood}
        onPress={() => {
          if (locke.message) setShowBubble((v) => !v);
        }}
      />
      {/* Tap-to-reveal speech bubble */}
      {showBubble && locke.message ? (
        <Modal transparent animationType="fade" onRequestClose={() => setShowBubble(false)}>
          <Pressable style={styles.bubbleOverlay} onPress={() => setShowBubble(false)}>
            <View style={[styles.bubbleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
              <Text style={[styles.bubbleText, { color: theme.colors.text }]}>
                {locke.message}
              </Text>
              <Text style={[styles.bubbleDismiss, { color: theme.colors.muted }]}>tap to close</Text>
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

// ── LockeBanner — inline notification strip ───────────────────────────────────

export function LockeBanner() {
  const { locke, dismiss } = useLocke();
  const { theme }          = useAppTheme();

  if (!locke.visible || locke.showOverlay) return null;

  const borderColor =
    locke.state === "celebrating"      ? theme.colors.primary :
    locke.state === "intense"          ? theme.colors.danger   :
    locke.state === "encouraging"      ? theme.colors.primary  :
    locke.state === "onboarding_guide" ? theme.colors.primary  :
                                         theme.colors.border;

  const mood = toMascotMood(locke.state);

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.surface, borderColor }]}>
      <View style={styles.row}>
        <LockeMascot size={44} mood={mood} />
        <Text style={[styles.message, { color: theme.colors.text }]} numberOfLines={3}>
          {locke.message}
        </Text>
        <Pressable onPress={dismiss} hitSlop={12}>
          <Text style={[styles.dismiss, { color: theme.colors.muted }]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    borderRadius:  radius.lg,
    borderWidth:   1,
    padding:       spacing.md,
    marginBottom:  spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           10,
  },
  message: {
    flex:       1,
    fontSize:   14,
    lineHeight: 20,
    fontWeight: "500",
  },
  dismiss: {
    fontSize:   14,
    fontWeight: "600",
    marginTop:  1,
  },
  bubbleOverlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent:  "flex-start",
    alignItems:      "flex-end",
    paddingTop:      100,
    paddingRight:    20,
  },
  bubbleCard: {
    borderRadius:      16,
    borderWidth:       1,
    padding:           16,
    maxWidth:          240,
  },
  bubbleText: {
    fontSize:   14,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 6,
  },
  bubbleDismiss: {
    fontSize: 11,
    textAlign: "center",
  },
});
