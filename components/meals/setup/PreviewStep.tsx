import React, { useEffect, useMemo } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../contexts/ThemeContext";
import { useProfileContext } from "../../../contexts/ProfileContext";
import { spacing, radius, typography, shadowPresets } from "../../../lib/theme";
import { computeMacroTargets } from "../../../lib/mealService";
import { recipeCatalog } from "../../../src/data/recipeCatalog/index";
import { LockeMascot } from "../../Locke/LockeMascot";
import { TierBadge } from "../TierBadge";
import type { CuisineTier, DietaryFilter, ActivityLevel, BiologicalSex } from "../../../src/data/mealTypes";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  draft: {
    tier: CuisineTier;
    nutritionGoal: "aggressive_cut" | "cut" | "maintain" | "bulk";
    restrictions: DietaryFilter[];
    heightCm?: number;
    age?: number;
    sex?: BiologicalSex;
    activityLevel?: ActivityLevel;
  };
  onConfirm: () => void;
  onBack: () => void;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<CuisineTier, string> = {
  scavenge: "#1D9E75",
  hunt: "#378ADD",
  apex_feast: "#BA7517",
};

const GOAL_LABELS: Record<string, string> = {
  aggressive_cut: "Aggressive Cut",
  cut: "Cut",
  maintain: "Maintain",
  bulk: "Bulk",
};

const MACRO_COLORS: Record<string, string> = {
  calories: "#3FB950",
  protein: "#378ADD",
  carbs: "#BA7517",
  fat: "#7F77DD",
};

const MACRO_KEYS = [
  { key: "calories" as const, label: "Cal", unit: "" },
  { key: "protein" as const, label: "Protein", unit: "g" },
  { key: "carbs" as const, label: "Carbs", unit: "g" },
  { key: "fat" as const, label: "Fat", unit: "g" },
];

const HIGHLIGHTS = [
  {
    icon: "calendar-outline" as const,
    label: "7-day meal plan",
    detailFn: (n: number) => `${n} recipes in rotation`,
  },
  {
    icon: "cart-outline" as const,
    label: "Auto grocery list",
    detailFn: () => "Sorted by aisle, tap to check off",
  },
  {
    icon: "timer-outline" as const,
    label: "Prep day guide",
    detailFn: () => "Batch-cook to save time all week",
  },
  {
    icon: "refresh-outline" as const,
    label: "New plan each week",
    detailFn: () => "Fresh variety, same macros",
  },
];

const { width: SCREEN_W } = Dimensions.get("window");
const GLOW_SIZE = 180;

// ── Component ─────────────────────────────────────────────────────────────────

export function PreviewStep({ draft, onConfirm, onBack }: Props) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const { profile } = useProfileContext();

  const tierColor = TIER_COLORS[draft.tier];

  // ── Animated values ───────────────────────────────────────────────
  const glowOpacity = useSharedValue(0.15);
  const btnScale = useSharedValue(1);

  // Mascot entrance
  const mascotY = useSharedValue(30);
  const mascotOpacity = useSharedValue(0);

  // Card entrance
  const cardY = useSharedValue(24);
  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);

  // Highlights entrance
  const hlY = useSharedValue(24);
  const hlScale = useSharedValue(0.92);
  const hlOpacity = useSharedValue(0);

  useEffect(() => {
    // Glow pulse — infinite loop
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    // Mascot entrance — springy overshoot
    mascotY.value = withTiming(0, {
      duration: 500,
      easing: Easing.out(Easing.back(1.4)),
    });
    mascotOpacity.value = withTiming(1, { duration: 400 });

    // Summary card — delayed spring
    cardY.value = withDelay(
      300,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.2)) }),
    );
    cardScale.value = withDelay(
      300,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.2)) }),
    );
    cardOpacity.value = withDelay(300, withTiming(1, { duration: 350 }));

    // Highlights card — staggered after summary
    hlY.value = withDelay(
      500,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.2)) }),
    );
    hlScale.value = withDelay(
      500,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.2)) }),
    );
    hlOpacity.value = withDelay(500, withTiming(1, { duration: 350 }));
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
    opacity: mascotOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }, { scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const hlStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hlY.value }, { scale: hlScale.value }],
    opacity: hlOpacity.value,
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  // ── Derived data ──────────────────────────────────────────────────

  const weightKg = useMemo(() => {
    const raw = parseFloat(profile.weight as string) || 70;
    return profile.weightUnit === "lbs" ? raw / 2.205 : raw;
  }, [profile.weight, profile.weightUnit]);

  const macroTargets = useMemo(
    () =>
      computeMacroTargets(weightKg, draft.nutritionGoal, {
        heightCm: draft.heightCm,
        age: draft.age,
        sex: draft.sex,
        activityLevel: draft.activityLevel,
      }),
    [weightKg, draft.nutritionGoal, draft.heightCm, draft.age, draft.sex, draft.activityLevel],
  );

  const recipeCount = useMemo(
    () => recipeCatalog.filter((r) => r.tier === draft.tier).length,
    [draft.tier],
  );

  const restrictionLabel =
    draft.restrictions.length > 0
      ? `${draft.restrictions.length} dietary filter${draft.restrictions.length > 1 ? "s" : ""}`
      : "No restrictions";

  // ── Handlers ──────────────────────────────────────────────────────

  function handlePressIn() {
    btnScale.value = withSpring(0.96, { damping: 12, stiffness: 200, mass: 0.6 });
  }

  function handlePressOut() {
    btnScale.value = withSpring(1, { damping: 12, stiffness: 200, mass: 0.6 });
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Mascot + glow */}
      <Animated.View style={[styles.mascotWrap, mascotStyle]}>
        <Animated.View
          style={[
            styles.glow,
            { backgroundColor: tierColor },
            glowStyle,
          ]}
        />
        <LockeMascot size={140} mood="proud" />
      </Animated.View>

      {/* Quote */}
      <Animated.Text
        entering={FadeInDown.delay(150).duration(350)}
        style={[styles.quote, { color: c.muted }]}
      >
        Locked in. Let's eat.
      </Animated.Text>

      {/* Summary card */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: c.surface,
            borderColor: tierColor + "50",
            ...shadowPresets.glow,
            shadowColor: tierColor,
            shadowOpacity: 0.2,
          },
          cardStyle,
        ]}
      >
        {/* Header: tier badge + goal */}
        <View style={styles.cardHeader}>
          <TierBadge tier={draft.tier} size="md" />
          <View style={styles.metaCol}>
            <Text style={[styles.goalText, { color: c.text }]}>
              {GOAL_LABELS[draft.nutritionGoal]}
            </Text>
            <Text style={[styles.restrictionText, { color: c.muted }]}>
              {restrictionLabel}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: c.muted + "20" }]} />

        {/* Macro targets */}
        <View style={styles.macroRow}>
          {MACRO_KEYS.map(({ key, label, unit }) => {
            const accent = MACRO_COLORS[key] ?? c.text;
            return (
              <View key={key} style={styles.macroCol}>
                <Text style={[styles.macroValue, { color: c.text }]}>
                  {Math.round(macroTargets[key])}
                  <Text style={styles.macroUnit}>{unit}</Text>
                </Text>
                <View style={styles.macroLabelRow}>
                  <View style={[styles.macroBar, { backgroundColor: accent }]} />
                  <Text style={[styles.macroLabel, { color: c.muted }]}>
                    {label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* Highlights */}
      <Animated.View
        style={[
          styles.highlightsCard,
          { backgroundColor: c.surface, borderColor: c.muted + "18" },
          hlStyle,
        ]}
      >
        {HIGHLIGHTS.map((item, i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.delay(600 + i * 80).duration(300)}
            style={styles.highlightRow}
          >
            <View style={[styles.highlightIcon, { backgroundColor: tierColor + "15" }]}>
              <Ionicons name={item.icon} size={18} color={tierColor} />
            </View>
            <View style={styles.highlightText}>
              <Text style={[styles.highlightLabel, { color: c.text }]}>
                {item.label}
              </Text>
              <Text style={[styles.highlightDetail, { color: c.muted }]}>
                {item.detailFn(recipeCount)}
              </Text>
            </View>
          </Animated.View>
        ))}
      </Animated.View>

      {/* CTA */}
      <Animated.View
        entering={FadeInDown.delay(900).duration(400)}
        style={styles.bottom}
      >
        <Pressable
          onPress={onConfirm}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View
            style={[
              styles.primaryBtn,
              {
                backgroundColor: c.primary,
                ...shadowPresets.glow,
                shadowColor: c.primary,
              },
              btnAnimStyle,
            ]}
          >
            <Text style={[styles.primaryBtnText, { color: c.primaryText }]}>
              Start My Fuel Plan
            </Text>
          </Animated.View>
        </Pressable>

        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: c.muted }]}>Back</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 110,
    paddingBottom: 48,
  },

  // Mascot
  mascotWrap: {
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  glow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    top: (140 - GLOW_SIZE) / 2 + 10,
  },

  // Quote
  quote: {
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },

  // Summary card
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaCol: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  goalText: {
    fontSize: typography.subheading.fontSize,
    fontWeight: "700",
  },
  restrictionText: {
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },

  // Macros
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroCol: {
    flex: 1,
    alignItems: "center",
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  macroUnit: {
    fontSize: 14,
    fontWeight: "600",
  },
  macroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  macroBar: {
    width: 10,
    height: 3,
    borderRadius: 2,
  },
  macroLabel: {
    fontSize: typography.caption.fontSize,
  },

  // Highlights
  highlightsCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  highlightIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightText: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
  },
  highlightDetail: {
    fontSize: typography.caption.fontSize,
    marginTop: 1,
  },

  // Bottom
  bottom: {
    marginTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  primaryBtn: {
    width: "100%",
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  backBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  backBtnText: {
    fontSize: typography.body.fontSize,
    fontWeight: "500",
  },
});
