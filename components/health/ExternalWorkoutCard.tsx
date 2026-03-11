/**
 * components/health/ExternalWorkoutCard.tsx — External workout detected via Apple Health.
 *
 * Displays a workout recorded outside LockedInFIT with type, duration,
 * calories, source app, and a "Detected via Apple Health" badge.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import type { HealthExternalWorkout } from '../../lib/healthkit/types';

type Props = {
  workout: HealthExternalWorkout;
};

const ACTIVITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Running: 'walk',
  Cycling: 'bicycle',
  Swimming: 'water',
  Walking: 'footsteps',
  Hiking: 'trail-sign',
  Yoga: 'body',
  TraditionalStrengthTraining: 'barbell',
  FunctionalStrengthTraining: 'barbell',
  HighIntensityIntervalTraining: 'flame',
  CrossTraining: 'fitness',
  Elliptical: 'fitness',
  Rowing: 'boat',
  Soccer: 'football',
  Basketball: 'basketball',
  Tennis: 'tennisball',
  Dance: 'musical-notes',
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ExternalWorkoutCard({ workout }: Props) {
  const { theme } = useAppTheme();

  const icon = ACTIVITY_ICONS[workout.activityType] ?? 'fitness';
  const displayType = workout.activityType.replace(/([A-Z])/g, ' $1').trim();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Top row: icon + type + timestamp */}
      <View style={styles.topRow}>
        <View style={[styles.iconBadge, { backgroundColor: theme.colors.primary + '20' }]}>
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.activityType, { color: theme.colors.text }]}>
            {displayType}
          </Text>
          <Text style={[styles.timestamp, { color: theme.colors.muted }]}>
            {formatDate(workout.startDate)} at {formatTime(workout.startDate)}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={14} color={theme.colors.muted} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {formatDuration(workout.duration)}
          </Text>
        </View>

        {workout.calories > 0 && (
          <View style={styles.stat}>
            <Ionicons name="flame-outline" size={14} color={theme.colors.muted} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {Math.round(workout.calories)} kcal
            </Text>
          </View>
        )}
      </View>

      {/* Badge */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: theme.colors.primary + '15' }]}>
          <Ionicons name="heart" size={10} color={theme.colors.primary} />
          <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
            Detected via Apple Health
          </Text>
        </View>
        {workout.source !== 'Apple Health' && (
          <Text style={[styles.source, { color: theme.colors.muted }]}>
            {workout.source}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  activityType: {
    fontSize: 15,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  source: {
    fontSize: 11,
  },
});
