import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../contexts/ThemeContext";
import { spacing, radius } from "../../../lib/theme";
import type { CuisineTier } from "../../../src/data/mealTypes";

// ---------------------------------------------------------------------------
// Tier configuration
// ---------------------------------------------------------------------------

const TIER_CONFIG: Record<
  CuisineTier,
  {
    color: string;
    label: string;
    difficulty: number;
    tagline: string;
    description: string;
  }
> = {
  scavenge: {
    color: "#1D9E75",
    label: "Scavenge",
    difficulty: 1,
    tagline: "Everyday global comfort food",
    description: "Supermarket ingredients, simple techniques, 15-25 min",
  },
  hunt: {
    color: "#378ADD",
    label: "Hunt",
    difficulty: 2,
    tagline: "Restaurant-quality at home",
    description: "Some specialty ingredients, proper technique, 25-45 min",
  },
  apex_feast: {
    color: "#BA7517",
    label: "Apex Feast",
    difficulty: 3,
    tagline: "Fine dining — elevated technique",
    description: "Artisan ingredients, advanced techniques, 45-90 min",
  },
};

const TIER_ORDER: CuisineTier[] = ["scavenge", "hunt", "apex_feast"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TierStepProps {
  draft: { tier: CuisineTier };
  onUpdate: (patch: { tier: CuisineTier }) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TierStep({ draft, onUpdate, onContinue, onBack }: TierStepProps) {
  const { theme } = useAppTheme();
  const c = theme.colors;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text
          entering={FadeInDown.duration(300)}
          style={[styles.eyebrow, { color: c.primary }]}
        >
          DIFFICULTY
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(80).duration(300)}
          style={[styles.title, { color: c.text }]}
        >
          How do you hunt?
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(160).duration(300)}
          style={[styles.subtitle, { color: c.muted }]}
        >
          Pick the kitchen intensity that fits your life.
        </Animated.Text>

        {TIER_ORDER.map((key, index) => {
          const cfg = TIER_CONFIG[key];
          const selected = draft.tier === key;

          return (
            <Animated.View
              key={key}
              entering={FadeInDown.delay(240 + index * 80).duration(300)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select ${cfg.label} tier`}
                onPress={() => onUpdate({ tier: key })}
                style={[
                  styles.card,
                  {
                    borderColor: selected ? cfg.color : c.border,
                    backgroundColor: selected ? cfg.color + "12" : c.surface,
                  },
                ]}
              >
                {/* Accent bar */}
                <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />

                <View style={styles.cardBody}>
                  {/* Header row: name + paw prints */}
                  <View style={styles.headerRow}>
                    <Text style={[styles.tierLabel, { color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                    <View style={styles.pawRow}>
                      {Array.from({ length: cfg.difficulty }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name="paw"
                          size={14}
                          color={cfg.color}
                          style={i > 0 ? styles.pawSpacing : undefined}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Tagline */}
                  <Text style={[styles.tagline, { color: c.text }]}>
                    {cfg.tagline}
                  </Text>

                  {/* Description */}
                  <Text style={[styles.description, { color: c.muted }]}>
                    {cfg.description}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>

      <Animated.View
        entering={FadeInDown.delay(500).duration(300)}
        style={styles.bottom}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          onPress={onContinue}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.buttonText, { color: c.primaryText }]}>
            Continue
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 120,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radius.lg,
    minHeight: 110,
    marginBottom: 12,
    overflow: "hidden",
  },
  accentBar: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tierLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  pawRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pawSpacing: {
    marginLeft: 2,
  },
  tagline: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
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
