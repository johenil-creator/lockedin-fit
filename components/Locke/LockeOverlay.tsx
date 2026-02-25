/**
 * LockeOverlay — full-screen modal overlay version of Locke.
 * Used for: onboarding, PR celebration, rank-up, inactivity nudge.
 *
 * Usage:
 *   <LockeOverlay
 *     visible={true}
 *     mood="respect"
 *     rank="hunter"
 *     message="That counted."
 *     ctaLabel="Let's Go"
 *     onDismiss={() => setVisible(false)}
 *   />
 */

import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { LockeMascot } from "./LockeMascot";
import type { LockeMascotMood } from "./LockeMascot";
import { useAppTheme } from "../../contexts/ThemeContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LockeOverlayProps {
  visible:    boolean;
  mood?:      LockeMascotMood;
  /** Accepted for backward compatibility; not used visually. */
  rank?:      string;
  message?:   string;
  /** Small eyebrow label above message, e.g. "PERSONAL RECORD" */
  eyebrow?:   string;
  ctaLabel?:  string;
  onDismiss:  () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LockeOverlay({
  visible,
  mood      = "neutral",
  message,
  eyebrow,
  ctaLabel  = "Got it",
  onDismiss,
}: LockeOverlayProps) {
  const { theme } = useAppTheme();

  // Entry / exit animation values
  const opacity   = useSharedValue(0);
  const translateY = useSharedValue(40);
  const scale     = useSharedValue(0.92);

  useEffect(() => {
    if (visible) {
      // Enter: fade + rise + scale up
      opacity.value    = withTiming(1,   { duration: 280, easing: Easing.out(Easing.quad) });
      translateY.value = withTiming(0,   { duration: 320, easing: Easing.out(Easing.back(1.2)) });
      scale.value      = withTiming(1,   { duration: 280, easing: Easing.out(Easing.back(1.1)) });
    } else {
      // Exit: fade + drop + scale down
      opacity.value    = withTiming(0,   { duration: 200, easing: Easing.in(Easing.quad) });
      translateY.value = withTiming(20,  { duration: 200 });
      scale.value      = withTiming(0.95,{ duration: 200 });
    }
  }, [visible]);

  // Rank-up / celebrating special effect: character flash on entry
  const charFlash = useSharedValue(0);
  useEffect(() => {
    if (visible && (mood === "celebrating" || mood === "encouraging")) {
      charFlash.value = withDelay(
        300,
        withSequence(
          withTiming(0.3,  { duration: 100 }),
          withTiming(0,    { duration: 300 })
        )
      );
    }
  }, [visible, mood]);

  const overlayAnim = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale:      scale.value },
    ],
  }));

  const flashAnim = useAnimatedStyle(() => ({
    opacity: charFlash.value,
  }));

  const accentColor =
    mood === "celebrating"      ? theme.colors.primary :
    mood === "intense"          ? theme.colors.danger   :
    mood === "savage"           ? theme.colors.danger   :
    mood === "encouraging"      ? theme.colors.primary  :
                                  theme.colors.border;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Scrim */}
      <Animated.View style={[styles.scrim, overlayAnim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: accentColor },
            cardAnim,
          ]}
        >
          {/* Character + flash overlay */}
          <View style={styles.characterWrap}>
            <LockeMascot size="full" mood={mood} glow />
            {/* White flash for rank-up */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.flashLayer,
                flashAnim,
              ]}
              pointerEvents="none"
            />
          </View>

          {/* Text content */}
          {eyebrow && (
            <Text style={[styles.eyebrow, { color: accentColor }]}>
              {eyebrow}
            </Text>
          )}
          {message && (
            <Text style={[styles.message, { color: theme.colors.text }]}>
              {message}
            </Text>
          )}

          {/* CTA */}
          <Pressable
            style={[styles.cta, { backgroundColor: accentColor }]}
            onPress={onDismiss}
          >
            <Text style={[styles.ctaText, { color: mood === "intense" || mood === "savage" ? "#fff" : theme.colors.primaryText }]}>
              {ctaLabel}
            </Text>
          </Pressable>

          {/* Tap anywhere hint */}
          <Text style={[styles.hint, { color: theme.colors.muted }]}>
            tap anywhere to dismiss
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrim: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent:  "center",
    alignItems:      "center",
    paddingHorizontal: 32,
  },
  card: {
    width:          "100%",
    borderRadius:   24,
    borderWidth:    1.5,
    paddingTop:     8,
    paddingBottom:  28,
    paddingHorizontal: 24,
    alignItems:     "center",
  },
  characterWrap: {
    marginBottom: 8,
    position:     "relative",
  },
  flashLayer: {
    backgroundColor: "#fff",
    borderRadius:    80,
  },
  eyebrow: {
    fontSize:      11,
    fontWeight:    "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom:  6,
  },
  message: {
    fontSize:      18,
    fontWeight:    "600",
    textAlign:     "center",
    lineHeight:    26,
    marginBottom:  24,
    paddingHorizontal: 8,
  },
  cta: {
    borderRadius:      12,
    paddingVertical:   14,
    paddingHorizontal: 40,
    marginBottom:      12,
  },
  ctaText: {
    fontSize:   16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 12,
  },
});
