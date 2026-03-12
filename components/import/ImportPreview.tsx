import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { notification, NotificationType } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import { spacing, radius, typography } from '../../lib/theme';
import { groupByWeekDay } from '../../lib/importPlan';
import type { ParsedPlanSummary } from '../../lib/importPlan';
import type { Exercise } from '../../lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  fileName: string;
  summary: ParsedPlanSummary;
  warnings: string[];
  exercises: Exercise[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

type StatCardProps = {
  value: number;
  label: string;
};

const StatCard = React.memo(function StatCard({ value, label }: StatCardProps) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.colors.mutedBg }]}>
      <Text style={[styles.statValue, { color: theme.colors.primary }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.colors.muted }]}>{label}</Text>
    </View>
  );
});

// ── Exercise Row ──────────────────────────────────────────────────────────────

type ExerciseRowProps = {
  exercise: Exercise;
  index: number;
};

const ExerciseRow = React.memo(function ExerciseRow({ exercise, index }: ExerciseRowProps) {
  const { theme } = useAppTheme();
  const hasSetsReps = exercise.sets || exercise.reps;
  return (
    <View
      style={[
        styles.exerciseRow,
        index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
      ]}
    >
      <View style={styles.exerciseIndex}>
        <Text style={[styles.exerciseIndexText, { color: theme.colors.muted }]}>
          {index + 1}
        </Text>
      </View>
      <View style={styles.exerciseInfo}>
        <Text style={[styles.exerciseName, { color: theme.colors.text }]} numberOfLines={1}>
          {exercise.exercise}
        </Text>
        {hasSetsReps ? (
          <Text style={[styles.exerciseMeta, { color: theme.colors.muted }]}>
            {[exercise.sets && `${exercise.sets} sets`, exercise.reps && `${exercise.reps} reps`]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : (
          <Text style={[styles.exerciseWarning, { color: theme.colors.danger }]}>
            No sets/reps
          </Text>
        )}
      </View>
    </View>
  );
});

// ── Day Group ─────────────────────────────────────────────────────────────────

type DayGroupProps = {
  day: string;
  exercises: Exercise[];
};

const DayGroup = React.memo(function DayGroup({ day, exercises }: DayGroupProps) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.dayGroup, { borderColor: theme.colors.border }]}>
      <Text style={[styles.dayLabel, { color: theme.colors.muted }]}>{day}</Text>
      {exercises.map((ex, i) => (
        <ExerciseRow key={`${ex.exercise}-${i}`} exercise={ex} index={i} />
      ))}
    </View>
  );
});

// ── Confirm Button ────────────────────────────────────────────────────────────

type ConfirmButtonProps = {
  onPress: () => void;
  loading: boolean;
};

const ConfirmButton = React.memo(function ConfirmButton({
  onPress,
  loading,
}: ConfirmButtonProps) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!loading) scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [loading, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePress = useCallback(() => {
    if (loading) return;
    notification(NotificationType.Success);
    onPress();
  }, [loading, onPress]);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={loading}
        style={[
          styles.confirmBtn,
          { backgroundColor: theme.colors.primary },
          loading && styles.btnDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.primaryText} size="small" />
        ) : (
          <Text style={[styles.confirmBtnText, { color: theme.colors.primaryText }]}>
            Import Plan
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
});

// ── ImportPreview ─────────────────────────────────────────────────────────────

/** Maximum number of week groups shown in the preview scroll area. */
const PREVIEW_WEEK_LIMIT = 2;

export const ImportPreview = React.memo(function ImportPreview({
  fileName,
  summary,
  warnings,
  exercises,
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  const { theme } = useAppTheme();

  const weekGroups = useMemo(() => groupByWeekDay(exercises), [exercises]);
  const previewGroups = useMemo(
    () => weekGroups.slice(0, PREVIEW_WEEK_LIMIT),
    [weekGroups],
  );
  const hiddenWeeks = summary.totalWeeks - PREVIEW_WEEK_LIMIT;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.fileIconWrap, { backgroundColor: theme.colors.mutedBg }]}>
          <Ionicons name="document-text-outline" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>
            {fileName}
          </Text>
          <Text style={[styles.fileSubtitle, { color: theme.colors.muted }]}>
            Ready to import
          </Text>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <StatCard value={summary.totalWeeks} label="Weeks" />
        <StatCard value={summary.totalDays} label="Days" />
        <StatCard value={summary.totalExercises} label="Exercises" />
      </View>

      {/* ── Warning banner ── */}
      {warnings.length > 0 && (
        <View
          style={[
            styles.warningBanner,
            { backgroundColor: '#FF9F0A20', borderColor: '#FF9F0A' },
          ]}
        >
          <Ionicons name="warning-outline" size={16} color="#FF9F0A" />
          <View style={styles.warningTexts}>
            {warnings.map((w, i) => (
              <Text key={i} style={[styles.warningText, { color: '#FF9F0A' }]}>
                {w}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* ── Preview scroll area ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.previewHeading, { color: theme.colors.muted }]}>
          PREVIEW
        </Text>

        {previewGroups.map((wg) => (
          <View key={wg.week} style={styles.weekGroup}>
            <View
              style={[
                styles.weekLabelRow,
                { backgroundColor: theme.colors.mutedBg },
              ]}
            >
              <Text style={[styles.weekLabel, { color: theme.colors.text }]}>
                {wg.week}
              </Text>
            </View>

            {wg.days.map((dg) => (
              <DayGroup key={dg.day} day={dg.day} exercises={dg.exercises} />
            ))}
          </View>
        ))}

        {hiddenWeeks > 0 && (
          <Text style={[styles.moreWeeks, { color: theme.colors.muted }]}>
            + {hiddenWeeks} more week{hiddenWeeks !== 1 ? 's' : ''} not shown
          </Text>
        )}
      </ScrollView>

      {/* ── Actions ── */}
      <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
        <ConfirmButton onPress={onConfirm} loading={loading} />
        <Pressable onPress={onCancel} disabled={loading} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: theme.colors.muted }]}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
});

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  fileName: {
    ...typography.subheading,
    marginBottom: 2,
  },
  fileSubtitle: {
    ...typography.small,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  // Warning
  warningBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
  },
  warningTexts: {
    flex: 1,
    gap: 2,
  },
  warningText: {
    ...typography.small,
  },
  // Scroll area
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  previewHeading: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  weekGroup: {
    marginBottom: spacing.md,
  },
  weekLabelRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  weekLabel: {
    ...typography.subheading,
  },
  dayGroup: {
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  dayLabel: {
    ...typography.small,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  exerciseIndex: {
    width: 20,
    alignItems: 'center',
  },
  exerciseIndexText: {
    ...typography.caption,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...typography.body,
    fontWeight: '500',
  },
  exerciseMeta: {
    ...typography.caption,
    marginTop: 1,
  },
  exerciseWarning: {
    ...typography.caption,
    marginTop: 1,
  },
  moreWeeks: {
    ...typography.small,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  // Actions
  actions: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  confirmBtn: {
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.body,
    fontWeight: '500',
  },
});
