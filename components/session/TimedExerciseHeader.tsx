import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type TimedExerciseHeaderProps = {
  exerciseName: string;
  targetSeconds: number;
  isCountup: boolean;
  bestSeconds: number;
  colors: {
    primary: string;
    primaryText: string;
    text: string;
    muted: string;
    mutedBg: string;
    surface: string;
    success: string;
    accent: string;
    danger: string;
    border: string;
  };
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const TimedExerciseHeader = React.memo(function TimedExerciseHeader({
  targetSeconds,
  isCountup,
  bestSeconds,
  colors,
}: TimedExerciseHeaderProps) {
  // PB progress fill: what fraction of PB does the target represent?
  const pbFillRatio =
    !isCountup && bestSeconds > 0 && targetSeconds > 0
      ? Math.min(targetSeconds / bestSeconds, 1)
      : 0;

  // Delta hint text and color
  let deltaText: string | null = null;
  let deltaColor = colors.muted;
  if (!isCountup && bestSeconds > 0 && targetSeconds > 0) {
    const gap = bestSeconds - targetSeconds;
    if (gap > 0) {
      deltaText = `+${gap}s to beat PB`;
      deltaColor = colors.muted;
    } else {
      deltaText = '\u2265 PB';
      deltaColor = colors.success;
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary + '12',
          borderLeftColor: colors.primary,
        },
      ]}
    >
      {/* Row 1: label left, PB right */}
      <View style={styles.row}>
        <View style={styles.labelRow}>
          <Ionicons
            name="timer-outline"
            size={13}
            color={colors.primary}
            style={styles.icon}
          />
          <Text style={[styles.skillLabel, { color: colors.primary }]}>
            SKILL HOLD
          </Text>
        </View>

        <View style={styles.pbBlock}>
          {bestSeconds > 0 ? (
            <>
              <Text style={[styles.pbCaption, { color: colors.muted }]}>PB</Text>
              <Text style={[styles.pbValue, { color: colors.primary }]}>
                {formatTime(bestSeconds)}
              </Text>
            </>
          ) : (
            <Text style={[styles.pbCaption, { color: colors.muted }]}>
              No PB yet
            </Text>
          )}
        </View>
      </View>

      {/* Row 2: large target time centered, or MAX HOLD for countup */}
      <View style={styles.row}>
        <View style={styles.targetBlock}>
          {isCountup ? (
            <>
              <Text style={[styles.targetTime, { color: colors.primary }]}>
                MAX HOLD
              </Text>
              <Text style={[styles.countupSub, { color: colors.muted }]}>
                Go until failure
              </Text>
            </>
          ) : (
            <Text style={[styles.targetTime, { color: colors.primary }]}>
              {formatTime(targetSeconds)}
            </Text>
          )}
        </View>

        {/* Delta hint — right-aligned, sits beside the target */}
        {deltaText !== null && (
          <Text style={[styles.delta, { color: deltaColor }]}>{deltaText}</Text>
        )}
      </View>

      {/* Optional PB progress bar */}
      {pbFillRatio > 0 && (
        <View style={[styles.barTrack, { backgroundColor: colors.primary + '20' }]}>
          <View
            style={[
              styles.barFill,
              {
                backgroundColor:
                  pbFillRatio >= 1 ? colors.success : colors.primary,
                width: `${Math.round(pbFillRatio * 100)}%`,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 72,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 5,
  },
  skillLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  pbBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pbCaption: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pbValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  targetBlock: {
    flex: 1,
    marginTop: 4,
  },
  targetTime: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  countupSub: {
    fontSize: 11,
    marginTop: 1,
  },
  delta: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  barTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 2,
  },
});
