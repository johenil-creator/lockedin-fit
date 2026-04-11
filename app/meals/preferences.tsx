/**
 * Fuel Preferences — app/meals/preferences.tsx
 *
 * Lets users edit meal preferences (tier, nutrition goal, restrictions,
 * start day) without redoing the full onboarding flow.
 * Each change saves immediately via the useMealPlan hook setters.
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { useMealPlan } from "../../hooks/useMealPlan";
import type { CuisineTier, DietaryFilter } from "../../src/data/mealTypes";

// ── Tier config ──────────────────────────────────────────────────────────────

type TierInfo = {
  key: CuisineTier;
  label: string;
  color: string;
  tagline: string;
  difficulty: number;
};

const TIERS: TierInfo[] = [
  {
    key: "scavenge",
    label: "Scavenge",
    color: "#1D9E75",
    tagline: "Supermarket ingredients, 15-25 min",
    difficulty: 1,
  },
  {
    key: "hunt",
    label: "Hunt",
    color: "#378ADD",
    tagline: "Some specialty ingredients, 25-45 min",
    difficulty: 2,
  },
  {
    key: "apex_feast",
    label: "Apex Feast",
    color: "#BA7517",
    tagline: "Artisan ingredients, 45-90 min",
    difficulty: 3,
  },
];

// ── Nutrition goal config ────────────────────────────────────────────────────

type GoalInfo = {
  key: "aggressive_cut" | "cut" | "maintain" | "bulk";
  label: string;
  desc: string;
};

const GOALS: GoalInfo[] = [
  { key: "aggressive_cut", label: "Aggressive Cut", desc: "Large deficit" },
  { key: "cut", label: "Cut", desc: "Moderate deficit" },
  { key: "maintain", label: "Maintain", desc: "Stay where you are" },
  { key: "bulk", label: "Bulk", desc: "Caloric surplus" },
];

// ── Restriction sections ─────────────────────────────────────────────────────

type FilterItem = { label: string; value: DietaryFilter };
type Section = { label: string; items: FilterItem[] };

const RESTRICTION_SECTIONS: Section[] = [
  {
    label: "Allergens",
    items: [
      { label: "Dairy-Free", value: "dairy" },
      { label: "Gluten-Free", value: "gluten" },
      { label: "Nut-Free", value: "nuts" },
      { label: "Egg-Free", value: "eggs" },
      { label: "Shellfish-Free", value: "shellfish" },
      { label: "Soy-Free", value: "soy" },
    ],
  },
  {
    label: "Lifestyle",
    items: [
      { label: "Vegetarian", value: "vegetarian" },
      { label: "Pescatarian", value: "pescatarian" },
      { label: "No Pork", value: "pork" },
      { label: "No Red Meat", value: "red-meat" },
    ],
  },
];

// ── Day names ────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Regeneration notice ──────────────────────────────────────────────────────

function RegenNotice({ visible }: { visible: boolean }) {
  const { theme } = useAppTheme();
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={[styles.regenBanner, { backgroundColor: theme.colors.primary + "18" }]}
    >
      <Ionicons name="refresh-outline" size={14} color={theme.colors.primary} />
      <Text style={[styles.regenText, { color: theme.colors.primary }]}>
        Plan will regenerate
      </Text>
    </Animated.View>
  );
}

// ── Section entrance animation ───────────────────────────────────────────────

const sectionEnter = (delay: number) =>
  FadeInDown.delay(delay).duration(350).damping(20).stiffness(150);

// ── Component ────────────────────────────────────────────────────────────────

export default function FuelPreferences() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = theme.colors;

  const {
    prefs,
    setTier,
    setNutritionGoal,
    setRestrictions,
    setStartDay,
  } = useMealPlan();

  const [showRegen, setShowRegen] = useState(false);

  // Flash the regeneration notice briefly
  const flashRegen = useCallback(() => {
    setShowRegen(true);
    setTimeout(() => setShowRegen(false), 2500);
  }, []);

  const handleTierChange = useCallback(
    (tier: CuisineTier) => {
      if (tier === prefs.tier) return;
      setTier(tier);
      flashRegen();
    },
    [prefs.tier, setTier, flashRegen],
  );

  const handleGoalChange = useCallback(
    (goal: GoalInfo["key"]) => {
      if (goal === prefs.nutritionGoal) return;
      setNutritionGoal(goal);
    },
    [prefs.nutritionGoal, setNutritionGoal],
  );

  const handleToggleRestriction = useCallback(
    (value: DietaryFilter) => {
      const next = prefs.restrictions.includes(value)
        ? prefs.restrictions.filter((r) => r !== value)
        : [...prefs.restrictions, value];
      setRestrictions(next);
      flashRegen();
    },
    [prefs.restrictions, setRestrictions, flashRegen],
  );

  const handleStartDay = useCallback(
    (dayIndex: number) => {
      if (dayIndex === (prefs.startDayIndex ?? 0)) return;
      setStartDay(dayIndex);
    },
    [prefs.startDayIndex, setStartDay],
  );

  const activeTier = prefs.tier ?? "scavenge";
  const activeGoal = prefs.nutritionGoal ?? "maintain";
  const activeStartDay = prefs.startDayIndex ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </Pressable>
          <Text style={[typography.screenTitle, { color: c.text, flex: 1 }]}>
            Fuel Preferences
          </Text>
        </Animated.View>

        <RegenNotice visible={showRegen} />

        {/* ── Tier Section ────────────────────────────────────────── */}
        <Animated.View entering={sectionEnter(80)}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Tier</Text>
          <Text style={[styles.sectionSub, { color: c.muted }]}>
            Kitchen difficulty and recipe style
          </Text>

          {TIERS.map((tier) => {
            const selected = activeTier === tier.key;
            return (
              <Pressable
                key={tier.key}
                onPress={() => handleTierChange(tier.key)}
                style={[
                  styles.tierCard,
                  {
                    borderColor: selected ? tier.color : c.border,
                    backgroundColor: selected ? tier.color + "12" : c.surface,
                  },
                ]}
              >
                <View style={[styles.tierAccent, { backgroundColor: tier.color }]} />
                <View style={styles.tierBody}>
                  <View style={styles.tierHeader}>
                    <Text style={[styles.tierLabel, { color: tier.color }]}>
                      {tier.label}
                    </Text>
                    <View style={styles.pawRow}>
                      {Array.from({ length: tier.difficulty }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name="paw"
                          size={13}
                          color={tier.color}
                          style={i > 0 ? { marginLeft: 2 } : undefined}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={[styles.tierTagline, { color: c.muted }]}>
                    {tier.tagline}
                  </Text>
                </View>
                {selected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={tier.color}
                    style={styles.tierCheck}
                  />
                )}
              </Pressable>
            );
          })}
        </Animated.View>

        {/* ── Nutrition Goal Section ──────────────────────────────── */}
        <Animated.View entering={sectionEnter(200)}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Nutrition Goal</Text>
          <Text style={[styles.sectionSub, { color: c.muted }]}>
            Adjusts calorie targets for your plan
          </Text>

          <View style={styles.goalGrid}>
            {GOALS.map((goal) => {
              const selected = activeGoal === goal.key;
              return (
                <Pressable
                  key={goal.key}
                  onPress={() => handleGoalChange(goal.key)}
                  style={[
                    styles.goalCard,
                    {
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: selected ? c.primary + "12" : c.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.goalLabel,
                      { color: selected ? c.primary : c.text },
                    ]}
                  >
                    {goal.label}
                  </Text>
                  <Text style={[styles.goalDesc, { color: c.muted }]}>
                    {goal.desc}
                  </Text>
                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={c.primary}
                      style={styles.goalCheck}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Dietary Restrictions Section ────────────────────────── */}
        <Animated.View entering={sectionEnter(320)}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            Dietary Restrictions
          </Text>
          <Text style={[styles.sectionSub, { color: c.muted }]}>
            Filters out recipes that contain these
          </Text>

          {RESTRICTION_SECTIONS.map((section) => (
            <View key={section.label} style={styles.restrictionSection}>
              <Text style={[styles.restrictionLabel, { color: c.muted }]}>
                {section.label}
              </Text>
              <View style={styles.chipGrid}>
                {section.items.map((item) => {
                  const isOn = prefs.restrictions.includes(item.value);
                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => handleToggleRestriction(item.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isOn ? c.primary + "26" : c.surface,
                          borderColor: isOn ? c.primary : c.border,
                        },
                      ]}
                    >
                      {isOn && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={c.primary}
                          style={styles.chipCheck}
                        />
                      )}
                      <Text
                        style={[
                          styles.chipText,
                          { color: isOn ? c.primary : c.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </Animated.View>

        {/* ── Start Day Section ───────────────────────────────────── */}
        <Animated.View entering={sectionEnter(440)}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Start Day</Text>
          <Text style={[styles.sectionSub, { color: c.muted }]}>
            Which day your weekly plan begins
          </Text>

          <View style={styles.dayRow}>
            {DAY_NAMES.map((name, i) => {
              const selected = activeStartDay === i;
              return (
                <Pressable
                  key={i}
                  onPress={() => handleStartDay(i)}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: selected ? c.primary + "18" : c.surface,
                      borderColor: selected ? c.primary : c.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayPillText,
                      { color: selected ? c.primary : c.text },
                    ]}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  backBtn: {
    marginRight: spacing.sm,
  },

  // Regen notice
  regenBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  regenText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: spacing.lg,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 13,
    marginBottom: spacing.md,
  },

  // Tier cards
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  tierAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  tierBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  tierLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  pawRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tierTagline: {
    fontSize: 12,
    lineHeight: 17,
  },
  tierCheck: {
    marginRight: 14,
  },

  // Goal grid
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  goalCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  goalDesc: {
    fontSize: 11,
  },
  goalCheck: {
    position: "absolute",
    top: 8,
    right: 8,
  },

  // Restrictions
  restrictionSection: {
    marginBottom: spacing.md,
  },
  restrictionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipCheck: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },

  // Start day
  dayRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
