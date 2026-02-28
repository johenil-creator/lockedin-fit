/**
 * RecoveryTrendGraph — 7-day fatigue trend visualization.
 *
 * Lines rendered:
 *   • Overall average fatigue       → theme primary (viridian green)
 *   • Top 3 most-fatigued muscles   → fixed accent palette
 *
 * Architecture (performance):
 *   • All path computation in a single useMemo (no allocations in render)
 *   • React.memo + reference-equality comparator on data array
 *   • Single Animated.View fade-in (one animated node, useAnimatedStyle)
 *   • Module-level helpers — never recreated
 *   • Cap history to 12 weeks / 84 days; default 7-day window
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '../../contexts/ThemeContext';
import { typography } from '../../lib/theme';
import type { DailySnapshot, MuscleGroup } from '../../lib/types';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_WEEKS = 12;
const MAX_DAYS = MAX_WEEKS * 7;

const PAD = { top: 12, right: 12, bottom: 32, left: 36 } as const;

const Y_TICKS = [0, 25, 50, 75, 100] as const;

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// Line colors: overall + up to 3 muscles
const LINE_COLORS = {
  overall:  null as null, // resolved from theme at render time
  muscle0:  '#FF9800',
  muscle1:  '#64B5F6',
  muscle2:  '#CE93D8',
} as const;
const MUSCLE_PALETTE = [LINE_COLORS.muscle0, LINE_COLORS.muscle1, LINE_COLORS.muscle2] as const;

// ── Module-level helpers (zero allocation on re-render) ───────────────────────
type Point = { x: number; y: number };

/** Catmull-Rom → cubic bezier smooth path through points. */
function smoothPath(pts: Point[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(i - 2, 0)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(i + 1, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)},${cp2x.toFixed(1)} ${cp2y.toFixed(1)},${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Map fatigue 0-100 to a y-pixel within the chart area. */
function fatigueToY(fatigue: number, chartTop: number, chartH: number): number {
  // fatigue 0 → bottom of chart; 100 → top
  return chartTop + chartH * (1 - fatigue / 100);
}

/** "YYYY-MM-DD" for a date offset by `daysAgo` from today. */
function dateKey(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Day abbreviation for a "YYYY-MM-DD" string. */
function dayLabel(isoDate: string): string {
  const dow = new Date(isoDate + 'T12:00:00').getDay();
  return DAY_ABBR[dow];
}

/** Determine top 3 muscles by average fatigue across all snapshots. */
function topMusclesForPeriod(snapshots: DailySnapshot[]): MuscleGroup[] {
  const totals = new Map<MuscleGroup, { sum: number; count: number }>();
  for (const snap of snapshots) {
    for (const { muscle, fatigue } of snap.topMusclesFatigue ?? []) {
      const cur = totals.get(muscle) ?? { sum: 0, count: 0 };
      totals.set(muscle, { sum: cur.sum + fatigue, count: cur.count + 1 });
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count)
    .slice(0, 3)
    .map(([m]) => m);
}

/** Human-readable label for a muscle group string. */
function muscleLabel(muscle: MuscleGroup): string {
  return muscle
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Props ──────────────────────────────────────────────────────────────────────
export type RecoveryTrendGraphProps = {
  /** Snapshots to render. Newest-first or any order — sorted internally. */
  data: DailySnapshot[];
  /** Number of days to display. Default 7. Max 84 (12 weeks). */
  days?: number;
  width?: number;
  height?: number;
};

// ── Inner component ───────────────────────────────────────────────────────────
function RecoveryTrendGraphInner({
  data,
  days = 7,
  width: widthProp,
  height = 200,
}: RecoveryTrendGraphProps) {
  const { theme, isDark } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const width = widthProp ?? screenWidth - 32;

  // Fade-in on mount — one animated node
  const fadeOpacity = useSharedValue(0);
  useEffect(() => {
    fadeOpacity.value = withTiming(1, { duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }), []);

  // ── All chart computation in one useMemo ─────────────────────────────────
  const chart = useMemo(() => {
    const clampedDays = Math.min(Math.max(days, 2), MAX_DAYS);
    const chartW = width - PAD.left - PAD.right;
    const chartH = height - PAD.top - PAD.bottom;
    const chartLeft = PAD.left;
    const chartTop = PAD.top;

    // Build date index for the window
    const windowDates: string[] = [];
    for (let i = clampedDays - 1; i >= 0; i--) {
      windowDates.push(dateKey(i)); // oldest → newest
    }

    // Index snapshots by date for O(1) lookup
    const byDate = new Map<string, DailySnapshot>();
    for (const snap of data) {
      byDate.set(snap.date, snap);
    }

    // Determine top muscles for the period
    const relevantSnaps = windowDates
      .map((d) => byDate.get(d))
      .filter((s): s is DailySnapshot => s !== undefined);
    const topMuscles = topMusclesForPeriod(relevantSnaps);

    // X step
    const xStep = chartW / Math.max(clampedDays - 1, 1);

    // Build point arrays per line
    const overallPts: Point[] = [];
    const musclePts: Point[][] = topMuscles.map(() => []);

    // X-axis labels
    const xLabels: Array<{ x: number; label: string; isToday: boolean }> = [];

    windowDates.forEach((date, i) => {
      const x = chartLeft + i * xStep;
      const snap = byDate.get(date);

      // Only label every other day when showing many days
      if (clampedDays <= 7 || i % 2 === 0 || i === clampedDays - 1) {
        const isToday = i === clampedDays - 1;
        xLabels.push({ x, label: isToday ? 'Today' : dayLabel(date), isToday });
      }

      if (snap) {
        overallPts.push({ x, y: fatigueToY(snap.overallFatigue, chartTop, chartH) });
        topMuscles.forEach((muscle, mi) => {
          const entry = snap.topMusclesFatigue?.find((e) => e.muscle === muscle);
          if (entry) {
            musclePts[mi].push({ x, y: fatigueToY(entry.fatigue, chartTop, chartH) });
          }
        });
      }
    });

    // Gridlines
    const gridLines = Y_TICKS.map((tick) => ({
      y: fatigueToY(tick, chartTop, chartH),
      label: String(tick),
    }));

    // Build area fill path: smooth line path closed to chart bottom
    const overallSmoothPath = smoothPath(overallPts);
    let areaPath = '';
    if (overallPts.length >= 2) {
      const chartBottom = chartTop + chartH;
      areaPath =
        overallSmoothPath +
        ` L ${overallPts[overallPts.length - 1].x.toFixed(1)} ${chartBottom.toFixed(1)}` +
        ` L ${overallPts[0].x.toFixed(1)} ${chartBottom.toFixed(1)} Z`;
    }

    return {
      overallPath: overallSmoothPath,
      areaPath,
      musclePaths: musclePts.map(smoothPath),
      topMuscles,
      xLabels,
      gridLines,
      overallPts,
      musclePts,
      chartLeft,
      chartTop,
      chartW,
      chartH,
    };
  }, [data, days, width, height]);

  const overallColor = theme.colors.primary;
  const mutedColor = theme.colors.muted;
  const gridColor = isDark ? '#2A3040' : '#E8EDF2';
  const textSize = 10;

  return (
    <View>
      <Animated.View style={fadeStyle}>
        <Svg
          width={width}
          height={height}
          shouldRasterizeIOS={false} // animated (fading in), so don't cache yet
          renderToHardwareTextureAndroid
        >
          {/* Y-axis gridlines + labels */}
          {chart.gridLines.map(({ y, label }) => (
            <G key={`grid-${label}`}>
              <Line
                x1={PAD.left}
                y1={y}
                x2={width - PAD.right}
                y2={y}
                stroke={gridColor}
                strokeWidth={1}
              />
              <SvgText
                x={PAD.left - 4}
                y={y + 4}
                textAnchor="end"
                fontSize={textSize}
                fill={mutedColor}
              >
                {label}
              </SvgText>
            </G>
          ))}

          {/* X-axis labels */}
          {chart.xLabels.map(({ x, label, isToday }) => (
            <SvgText
              key={`xl-${label}-${x}`}
              x={x}
              y={height - PAD.bottom + 14}
              textAnchor="middle"
              fontSize={textSize}
              fill={isToday ? overallColor : mutedColor}
              fontWeight={isToday ? '700' : '400'}
            >
              {label}
            </SvgText>
          ))}

          {/* Area fill under overall line */}
          {chart.areaPath ? (
            <Path
              d={chart.areaPath}
              fill={overallColor}
              fillOpacity={0.08}
              stroke="none"
            />
          ) : null}

          {/* Muscle fatigue lines (behind overall) */}
          {chart.musclePaths.map((d, i) =>
            d ? (
              <Path
                key={`ml-${i}`}
                d={d}
                stroke={MUSCLE_PALETTE[i]}
                strokeWidth={1.5}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null,
          )}

          {/* Overall fatigue line */}
          {chart.overallPath ? (
            <Path
              d={chart.overallPath}
              stroke={overallColor}
              strokeWidth={2.5}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {/* Data point dots on overall line */}
          {chart.overallPts.map(({ x, y }, i) => {
            const isLast = i === chart.overallPts.length - 1;
            return (
              <G key={`od-${i}`}>
                {isLast && (
                  <Circle cx={x} cy={y} r={6} fill={overallColor} fillOpacity={0.2} />
                )}
                <Circle cx={x} cy={y} r={isLast ? 4 : 3} fill={overallColor} />
              </G>
            );
          })}
        </Svg>
      </Animated.View>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendDot color={overallColor} label="Overall" />
        {chart.topMuscles.map((muscle, i) => (
          <LegendDot
            key={muscle}
            color={MUSCLE_PALETTE[i] ?? mutedColor}
            label={muscleLabel(muscle)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Legend dot ─────────────────────────────────────────────────────────────────
const LegendDot = React.memo(function LegendDot({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: theme.colors.muted }]}>{label}</Text>
    </View>
  );
});

// ── Export with reference-equality comparator ─────────────────────────────────
export const RecoveryTrendGraph = React.memo(
  RecoveryTrendGraphInner,
  (prev, next) =>
    prev.data === next.data &&
    prev.days === next.days &&
    prev.width === next.width &&
    prev.height === next.height,
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: PAD.left,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
});
