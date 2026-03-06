import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { useProfileContext } from "../contexts/ProfileContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { useStreak } from "../hooks/useStreak";
import { BackButton } from "../components/BackButton";
import { BADGE_DEFINITIONS, getBadgeProgress, type BadgeStats } from "../lib/badgeService";
import { glowColors, spacing, radius, typography } from "../lib/theme";
import type { Badge } from "../lib/types";

// ── Icon mapping ────────────────────────────────────────────────────────────

const BADGE_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  footprint: "footsteps-outline",
  flag: "flag-outline",
  fire: "flame-outline",
  zap: "flash-outline",
  heart: "heart-outline",
  dumbbell: "barbell-outline",
  layers: "layers-outline",
  trophy: "trophy-outline",
  flame: "flame-outline",
  award: "ribbon-outline",
  calendar: "calendar-outline",
  map: "map-outline",
  stopwatch: "stopwatch-outline",
  body: "body-outline",
  fitness: "fitness-outline",
  "swap-horizontal": "swap-horizontal-outline",
  star: "star-outline",
  diamond: "diamond-outline",
  medal: "medal-outline",
};

// ── Category grouping ───────────────────────────────────────────────────────

const CATEGORIES: { label: string; ids: string[] }[] = [
  {
    label: "Cardio",
    ids: ["first_run", "5k_finisher", "10k_finisher", "60_min_beast", "marathon_prep", "interval_warrior", "consistent_cardio"],
  },
  {
    label: "Strength",
    ids: ["first_lift", "100_sets_club", "500_sets_club", "1rm_breaker", "iron_regular"],
  },
  {
    label: "Consistency",
    ids: ["streak_7", "streak_30", "streak_100", "streak_365"],
  },
  {
    label: "Milestones",
    ids: ["double_threat", "quarter_century", "half_century", "centurion"],
  },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── Badge Row ───────────────────────────────────────────────────────────────

function BadgeRow({
  def,
  unlocked,
  progress,
}: {
  def: (typeof BADGE_DEFINITIONS)[number];
  unlocked: Badge | undefined;
  progress: string | null;
}) {
  const { theme } = useAppTheme();
  const isUnlocked = !!unlocked;
  const iconName = BADGE_ICON_MAP[def.icon] ?? "help-circle-outline";

  return (
    <View style={[styles.badgeRow, { opacity: isUnlocked ? 1 : 0.4 }]}>
      <View style={[styles.iconCircle, { backgroundColor: isUnlocked ? glowColors.viridianDim : theme.colors.mutedBg }]}>
        <Ionicons
          name={iconName}
          size={20}
          color={isUnlocked ? glowColors.viridian : theme.colors.muted}
        />
      </View>
      <View style={styles.badgeInfo}>
        <Text style={[styles.badgeName, { color: theme.colors.text }]}>{def.name}</Text>
        <Text style={[styles.badgeDesc, { color: theme.colors.muted }]}>{def.description}</Text>
        {isUnlocked && unlocked.unlockedAt && (
          <Text style={[styles.badgeDate, { color: glowColors.viridian }]}>
            {formatDate(unlocked.unlockedAt)}
          </Text>
        )}
        {!isUnlocked && progress && (
          <Text style={[styles.badgeProgress, { color: theme.colors.primary }]}>
            {progress}
          </Text>
        )}
      </View>
      {isUnlocked && (
        <Ionicons name="checkmark-circle" size={20} color={glowColors.viridian} />
      )}
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function BadgesScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { profile } = useProfileContext();
  const { workouts } = useWorkouts();
  const { streak } = useStreak();

  const unlockedMap = new Map<string, Badge>();
  for (const b of profile.badges ?? []) {
    unlockedMap.set(b.id, b);
  }

  const total = BADGE_DEFINITIONS.length;
  const earned = unlockedMap.size;
  const progressPct = total > 0 ? earned / total : 0;

  // Compute stats for progress indicators
  const completed = workouts.filter((w) => !!w.completedAt);
  const badgeStats: BadgeStats = {
    cardioCount: completed.filter((w) => w.sessionType === "cardio").length,
    strengthCount: completed.filter(
      (w) => w.sessionType === "strength" || (w.sessionType !== "cardio" && w.exercises.some((e) => e.sets.some((s) => s.completed)))
    ).length,
    totalWorkouts: completed.length,
    totalSets: completed.reduce((sum, w) => sum + w.exercises.flatMap((e) => e.sets).filter((s) => s.completed).length, 0),
    streakDays: streak.current,
    has1RM: !!(profile.estimated1RM && Object.values(profile.estimated1RM).some((v) => v != null && v !== "")),
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.heading, { color: theme.colors.text }]}>Badges</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {/* Summary card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>Badges Earned</Text>
            <Text style={[styles.summaryCount, { color: glowColors.viridian }]}>
              {earned} / {total}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.mutedBg }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: glowColors.viridian, width: `${Math.max(progressPct * 100, 2)}%` },
              ]}
            />
          </View>
        </View>

        {/* Category cards */}
        {CATEGORIES.map((cat) => {
          const defs = cat.ids
            .map((id) => BADGE_DEFINITIONS.find((d) => d.id === id))
            .filter(Boolean) as (typeof BADGE_DEFINITIONS)[number][];

          return (
            <View key={cat.label} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>{cat.label}</Text>
              {defs.map((def) => (
                <BadgeRow
                  key={def.id}
                  def={def}
                  unlocked={unlockedMap.get(def.id)}
                  progress={unlockedMap.has(def.id) ? null : getBadgeProgress(def.id, badgeStats)}
                />
              ))}
            </View>
          );
        })}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scrollBody: { padding: spacing.md },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  summaryCount: {
    fontSize: 15,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    minWidth: 4,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: "700",
  },
  badgeDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  badgeDate: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  badgeProgress: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
