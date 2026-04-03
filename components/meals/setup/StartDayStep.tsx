import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../../lib/theme";
import { LockeMascot } from "../../Locke/LockeMascot";

// ── Types ────────────────────────────────────────────────────────────────────

type Props = {
  draft: { startDayIndex?: number };
  onUpdate: (patch: { startDayIndex: number }) => void;
  onContinue: () => void;
  onBack: () => void;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Current day index Mon=0 .. Sun=6 */
function todayIndex(): number {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

/** Return a human-friendly label for a day relative to today */
function dayLabel(dayIdx: number): string | null {
  const today = todayIndex();
  if (dayIdx === today) return "Today";
  if (dayIdx === (today + 1) % 7) return "Tomorrow";
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export function StartDayStep({ draft, onUpdate, onContinue, onBack }: Props) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const selected = draft.startDayIndex ?? todayIndex();

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot */}
        <View style={styles.mascotWrap}>
          <LockeMascot size={160} mood="focused" />
        </View>

        {/* Title */}
        <Text style={[styles.eyebrow, { color: c.primary }]}>PLAN START</Text>
        <Text style={[styles.title, { color: c.text }]}>
          When do you want to start?
        </Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Your meal plan will run from this day through the rest of the week.
        </Text>

        {/* Day cards */}
        <View style={styles.dayList}>
          {DAY_NAMES.map((name, idx) => {
            const isSelected = selected === idx;
            const tag = dayLabel(idx);
            return (
              <Pressable
                key={idx}
                accessibilityRole="button"
                accessibilityLabel={`Select ${name} as start day`}
                onPress={() => onUpdate({ startDayIndex: idx })}
                style={[
                  styles.dayCard,
                  {
                    backgroundColor: isSelected ? c.primary + "18" : c.surface,
                    borderColor: isSelected ? c.primary : c.border,
                  },
                ]}
              >
                <View style={styles.dayInfo}>
                  <Text
                    style={[
                      styles.dayName,
                      { color: isSelected ? c.primary : c.text },
                    ]}
                  >
                    {name}
                  </Text>
                  {tag && (
                    <View
                      style={[
                        styles.tagBadge,
                        { backgroundColor: c.primary + "20" },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: c.primary }]}>
                        {tag}
                      </Text>
                    </View>
                  )}
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={c.primary} />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Continue */}
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          onPress={onContinue}
          style={[styles.continueBtn, { backgroundColor: c.primary }]}
        >
          <Text style={[styles.continueTxt, { color: c.primaryText }]}>
            Continue
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: 120,
    paddingBottom: spacing.xl + 80,
  },
  mascotWrap: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.heading,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  dayList: {
    gap: spacing.sm,
  },
  dayCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  dayInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dayName: {
    fontSize: 16,
    fontWeight: "600",
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  continueBtn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  continueTxt: {
    ...typography.subheading,
  },
});
