import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useAppTheme } from "../../../contexts/ThemeContext";
import { spacing, radius } from "../../../lib/theme";
import { LockeMascot } from "../../Locke/LockeMascot";

interface WelcomeStepProps {
  onContinue: () => void;
}

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
  const { theme } = useAppTheme();
  const c = theme.colors;

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Animated.View entering={FadeIn.duration(400)}>
          <LockeMascot size={220} mood="encouraging" />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(150).duration(350)}
          style={[styles.title, { color: c.text }]}
        >
          Time to fuel up.
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(300).duration(350)}
          style={[styles.subtitle, { color: c.muted }]}
        >
          I'll build you a weekly meal plan based on your skill level and goals.
          Takes 60 seconds.
        </Animated.Text>
      </View>

      <Animated.View
        entering={FadeInDown.delay(450).duration(350)}
        style={styles.bottom}
      >
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.buttonText, { color: c.primaryText }]}>
            Let's Eat
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
