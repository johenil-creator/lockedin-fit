/**
 * components/health/HealthInsightBanner.tsx — Health-derived insight banner.
 *
 * Collapsible banner for Home/Recovery screens showing the most
 * relevant health signal and its impact on readiness.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import type { HealthSignalResult } from '../../lib/healthkit/types';

type InsightType = 'heart' | 'sleep' | 'activity' | 'workout' | 'hrv';

type Props = {
  healthSignal: HealthSignalResult;
  /** Optional override for the insight type icon */
  insightType?: InsightType;
};

const ICON_MAP: Record<InsightType, keyof typeof Ionicons.glyphMap> = {
  heart: 'heart',
  sleep: 'moon',
  activity: 'footsteps',
  workout: 'barbell',
  hrv: 'pulse',
};

/**
 * Determine the most relevant insight type from health signal factors.
 */
function deriveInsightType(factors: HealthSignalResult['factors']): InsightType {
  const entries: [InsightType, number][] = [
    ['heart', factors.restingHR],
    ['hrv', factors.hrv],
    ['sleep', factors.sleep],
    ['activity', factors.backgroundActivity],
  ];
  // Lowest factor score = most impactful insight to surface
  const [type] = entries.reduce((min, cur) => (cur[1] < min[1] ? cur : min), entries[0]);
  return type;
}

function HealthInsightBanner({ healthSignal, insightType }: Props) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  if (healthSignal.confidence === 0) return null;

  const type = insightType ?? deriveInsightType(healthSignal.factors);
  const icon = ICON_MAP[type];

  const scoreColor =
    healthSignal.score >= 70
      ? theme.colors.primary
      : healthSignal.score >= 50
        ? '#F5A623' // warning orange — no theme.colors.warning available
        : theme.colors.danger;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded(!expanded)}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.iconBadge, { backgroundColor: scoreColor + '20' }]}>
          <Ionicons name={icon} size={16} color={scoreColor} />
        </View>
        <Text style={[styles.headline, { color: theme.colors.text }]} numberOfLines={2}>
          {healthSignal.label}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.muted}
        />
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={styles.detail}>
          <View style={styles.factorRow}>
            <FactorBar
              label="Resting HR"
              value={healthSignal.factors.restingHR}
              theme={theme}
            />
            <FactorBar
              label="HRV"
              value={healthSignal.factors.hrv}
              theme={theme}
            />
            <FactorBar
              label="Sleep"
              value={healthSignal.factors.sleep}
              theme={theme}
            />
            <FactorBar
              label="Activity"
              value={healthSignal.factors.backgroundActivity}
              theme={theme}
            />
          </View>
          <Text style={[styles.confidence, { color: theme.colors.muted }]}>
            Data confidence: {Math.round(healthSignal.confidence * 100)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default React.memo(HealthInsightBanner);

function FactorBar({
  label,
  value,
  theme,
}: {
  label: string;
  value: number;
  theme: any;
}) {
  const color =
    value >= 70
      ? theme.colors.primary
      : value >= 50
        ? '#F5A623'
        : theme.colors.danger;

  return (
    <View style={styles.factor}>
      <Text style={[styles.factorLabel, { color: theme.colors.muted }]}>{label}</Text>
      <View style={[styles.barBg, { backgroundColor: theme.colors.border }]}>
        <View
          style={[styles.barFill, { width: `${value}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={[styles.factorValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  detail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  factorRow: {
    gap: 8,
  },
  factor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorLabel: {
    width: 80,
    fontSize: 12,
  },
  barBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  factorValue: {
    width: 28,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  confidence: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'right',
  },
});
