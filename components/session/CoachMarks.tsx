/**
 * CoachMarks.tsx — First-use tooltip walkthrough overlay for the session screen.
 *
 * Shows 4 sequential tips with a Locke mascot, centered card, and step indicator.
 * Manages its own internal step state. Dismiss via backdrop tap or button press.
 */

import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { LockeMascot } from "../Locke/LockeMascot";

// ── Tips ──────────────────────────────────────────────────────────────────────

const TIPS = [
  "Tap any exercise to start logging your sets",
  "Enter your weight and reps, then tap \u2713 to log the set",
  "A rest timer starts automatically \u2014 tap to skip it",
  "Swipe left on any set to delete it",
] as const;

// ── Props ─────────────────────────────────────────────────────────────────────

export type CoachMarksProps = {
  visible: boolean;
  onDismiss: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CoachMarks({ visible, onDismiss }: CoachMarksProps) {
  const { theme } = useAppTheme();
  const [step, setStep] = useState(0);

  const advance = useCallback(() => {
    if (step < TIPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Last step — dismiss and reset for next potential showing
      setStep(0);
      onDismiss();
    }
  }, [step, onDismiss]);

  const dismiss = useCallback(() => {
    setStep(0);
    onDismiss();
  }, [onDismiss]);

  if (!visible) return null;

  const isLastStep = step === TIPS.length - 1;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      {/* Backdrop — tap to dismiss */}
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />

      {/* Card */}
      <Animated.View
        entering={FadeIn.duration(300).delay(50)}
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        {/* Step indicator */}
        <Text style={[styles.stepIndicator, { color: theme.colors.muted }]}>
          {step + 1} of {TIPS.length}
        </Text>

        {/* Locke mascot */}
        <View style={styles.mascotContainer}>
          <LockeMascot size={100} mood="encouraging" />
        </View>

        {/* Tip text */}
        <Text style={[styles.tipText, { color: theme.colors.text }]}>
          {TIPS[step]}
        </Text>

        {/* Step dots */}
        <View style={styles.dotsRow}>
          {TIPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === step ? theme.colors.primary : theme.colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Action button */}
        <Pressable
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={advance}
        >
          <Text style={[styles.buttonText, { color: theme.colors.primaryText }]}>
            {isLastStep ? "Got it" : "Next"}
          </Text>
        </Pressable>

        {/* Skip link */}
        {!isLastStep && (
          <Pressable onPress={dismiss} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.colors.muted }]}>
              Skip all
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 90,
  },
  card: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "85%",
    maxWidth: 340,
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  mascotContainer: {
    marginBottom: 16,
  },
  tipText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  skipBtn: {
    marginTop: 12,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 13,
    fontWeight: "500",
  },
});

export default CoachMarks;
