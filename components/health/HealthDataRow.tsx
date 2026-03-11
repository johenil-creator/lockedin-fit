/**
 * components/health/HealthDataRow.tsx — Simple row for displaying a health metric.
 *
 * Shows: icon + label + value + trend arrow (up/down/stable)
 * Used in recovery dashboard and profile screens.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';

type TrendDirection = 'up' | 'down' | 'stable' | 'none';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit?: string;
  trend?: TrendDirection;
  /** Whether this trend direction is favorable (green) or concerning (red) */
  trendFavorable?: boolean;
};

export function HealthDataRow({
  icon,
  label,
  value,
  unit,
  trend = 'none',
  trendFavorable,
}: Props) {
  const { theme } = useAppTheme();

  const trendIcon =
    trend === 'up'
      ? 'arrow-up'
      : trend === 'down'
        ? 'arrow-down'
        : trend === 'stable'
          ? 'remove'
          : null;

  const trendColor =
    trend === 'none' || trendFavorable == null
      ? theme.colors.muted
      : trendFavorable
        ? theme.colors.primary
        : theme.colors.danger;

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>

      <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>

      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: theme.colors.text }]}>
          {value}
          {unit ? (
            <Text style={[styles.unit, { color: theme.colors.muted }]}> {unit}</Text>
          ) : null}
        </Text>

        {trendIcon && (
          <Ionicons
            name={trendIcon}
            size={14}
            color={trendColor}
            style={styles.trendIcon}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
  unit: {
    fontSize: 12,
    fontWeight: '400',
  },
  trendIcon: {
    marginLeft: 4,
  },
});
