/**
 * WeightTrendGraph — SVG line chart showing body weight over time.
 *
 * Architecture (performance):
 *   - All path computation in a single useMemo (no allocations in render)
 *   - React.memo with reference-equality comparator
 *   - Module-level helpers — never recreated
 *   - Caps to last 30 entries
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { WeightLogEntry } from "../../src/data/mealTypes";

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_ENTRIES = 30;
const WIDTH = 320;
const HEIGHT_FULL = 160;
const HEIGHT_SINGLE = 80;
const PAD = { top: 20, right: 52, bottom: 30, left: 10 } as const;


const ON_TRACK_COLOR = "#3FB950";
const OFF_TRACK_COLOR = "#E5534B";
const GOAL_COLOR = "#BA7517";

// ── Module-level helpers ─────────────────────────────────────────────────────
type Point = { x: number; y: number };

/** Catmull-Rom -> cubic bezier smooth path through points. */
function smoothPath(pts: Point[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1)
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

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

/** Convert kg to display unit. */
function toDisplay(kg: number, unit: "kg" | "lbs"): number {
  return unit === "lbs"
    ? Math.round(kg * 2.20462 * 10) / 10
    : Math.round(kg * 10) / 10;
}

/** Format a "YYYY-MM-DD" date as "M/D". */
function shortDate(iso: string): string {
  const parts = iso.split("-");
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

// ── Props ────────────────────────────────────────────────────────────────────
type Props = {
  entries: WeightLogEntry[]; // should be sorted by date ascending
  goalWeightKg?: number;
  weightUnit: "kg" | "lbs";
};

// ── Inner component ──────────────────────────────────────────────────────────
function WeightTrendGraphInner({ entries, goalWeightKg, weightUnit }: Props) {
  const { theme } = useAppTheme();

  // ── All chart computation in one useMemo ─────────────────────────────────
  const chart = useMemo(() => {
    const sliced = entries.slice(-MAX_ENTRIES);
    const count = sliced.length;
    if (count < 2) return null;

    const chartW = WIDTH - PAD.left - PAD.right;
    const chartH = HEIGHT_FULL - PAD.top - PAD.bottom;

    // Determine Y range in kg
    const weights = sliced.map((e) => e.weightKg);
    let minKg = Math.min(...weights);
    let maxKg = Math.max(...weights);
    if (goalWeightKg !== undefined) {
      minKg = Math.min(minKg, goalWeightKg);
      maxKg = Math.max(maxKg, goalWeightKg);
    }
    minKg -= 2;
    maxKg += 2;
    const rangeKg = maxKg - minKg || 1;

    const weightToY = (kg: number) =>
      PAD.top + chartH * (1 - (kg - minKg) / rangeKg);

    const xStep = chartW / (count - 1);
    const points: Point[] = sliced.map((e, i) => ({
      x: PAD.left + i * xStep,
      y: weightToY(e.weightKg),
    }));

    const linePath = smoothPath(points);

    const chartBottom = PAD.top + chartH;
    const areaPath =
      linePath +
      ` L ${points[count - 1].x.toFixed(1)} ${chartBottom.toFixed(1)}` +
      ` L ${points[0].x.toFixed(1)} ${chartBottom.toFixed(1)} Z`;

    const goalY =
      goalWeightKg !== undefined ? weightToY(goalWeightKg) : undefined;

    let lineColor: string | null = null;
    if (goalWeightKg !== undefined) {
      const lastWeight = sliced[count - 1].weightKg;
      const firstWeight = sliced[0].weightKg;
      const isCutting = goalWeightKg < firstWeight;
      const trending = lastWeight - firstWeight;
      if (isCutting) {
        lineColor = trending <= 0 ? ON_TRACK_COLOR : OFF_TRACK_COLOR;
      } else {
        lineColor = trending >= 0 ? ON_TRACK_COLOR : OFF_TRACK_COLOR;
      }
    }

    // X-axis labels
    const xLabels: Array<{ x: number; label: string }> = [];
    const firstIdx = 0;
    const midIdx = Math.floor((count - 1) / 2);
    const lastIdx = count - 1;
    const labelIndices = [firstIdx];
    if (midIdx !== firstIdx && midIdx !== lastIdx) labelIndices.push(midIdx);
    labelIndices.push(lastIdx);
    for (const idx of labelIndices) {
      xLabels.push({
        x: PAD.left + idx * xStep,
        label: shortDate(sliced[idx].date),
      });
    }

    // Y-axis labels
    const yMin = toDisplay(minKg + 2, weightUnit);
    const yMax = toDisplay(maxKg - 2, weightUnit);
    const yMid = toDisplay((minKg + maxKg) / 2, weightUnit);
    const yLabels = [
      { y: weightToY(maxKg - 2), label: `${yMax}` },
      { y: weightToY((minKg + maxKg) / 2), label: `${yMid}` },
      { y: weightToY(minKg + 2), label: `${yMin}` },
    ];

    const gridYs = [
      weightToY(maxKg - 2),
      weightToY((minKg + maxKg) / 2),
      weightToY(minKg + 2),
    ];

    // Weight change from first to last entry
    const firstDisplayW = toDisplay(sliced[0].weightKg, weightUnit);
    const lastDisplayW = toDisplay(sliced[count - 1].weightKg, weightUnit);
    const totalChange = Math.round((lastDisplayW - firstDisplayW) * 10) / 10;

    // Last point label
    const lastPoint = points[count - 1];

    return {
      points,
      linePath,
      areaPath,
      goalY,
      lineColor,
      xLabels,
      yLabels,
      gridYs,
      chartBottom,
      totalChange,
      lastDisplayW,
      lastPoint,
      goalDisplayWeight:
        goalWeightKg !== undefined
          ? toDisplay(goalWeightKg, weightUnit)
          : undefined,
    };
  }, [entries, goalWeightKg, weightUnit]);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!chart) {
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
        <View style={styles.emptyContainer}>
          <Ionicons
            name="scale-outline"
            size={28}
            color={theme.colors.muted}
          />
          <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
            Log at least 2 weigh-ins to see your trend
          </Text>
        </View>
      </View>
    );
  }

  // ── Multi-point chart ─────────────────────────────────────────────────────
  const primaryColor = chart.lineColor ?? theme.colors.primary;
  const mutedColor = theme.colors.muted;

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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="scale-outline"
            size={14}
            color={theme.colors.text}
            style={styles.headerIcon}
          />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Weight Trend
          </Text>
        </View>
        {chart.totalChange !== 0 && (
          <View
            style={[
              styles.changeBadge,
              {
                backgroundColor:
                  chart.totalChange < 0
                    ? `${ON_TRACK_COLOR}18`
                    : `${OFF_TRACK_COLOR}18`,
              },
            ]}
          >
            <Text
              style={[
                styles.changeBadgeText,
                {
                  color:
                    chart.totalChange < 0 ? ON_TRACK_COLOR : OFF_TRACK_COLOR,
                },
              ]}
            >
              {chart.totalChange < 0 ? "↓" : "↑"}{" "}
              {Math.abs(chart.totalChange)} {weightUnit}
            </Text>
          </View>
        )}
      </View>

      <Svg
        width="100%"
        height={HEIGHT_FULL}
        viewBox={`0 0 ${WIDTH} ${HEIGHT_FULL}`}
      >
        <Defs>
          <LinearGradient id="weightAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={primaryColor} stopOpacity={0.25} />
            <Stop offset="1" stopColor={primaryColor} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Subtle horizontal gridlines */}
        {chart.gridYs.map((gy, i) => (
          <Line
            key={`grid-${i}`}
            x1={PAD.left}
            y1={gy}
            x2={WIDTH - PAD.right}
            y2={gy}
            stroke={mutedColor}
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.08}
          />
        ))}

        {/* Baseline at chart bottom */}
        <Line
          x1={PAD.left}
          y1={chart.chartBottom}
          x2={WIDTH - PAD.right}
          y2={chart.chartBottom}
          stroke={mutedColor}
          strokeWidth={1}
          opacity={0.1}
        />

        {/* Goal line */}
        {chart.goalY !== undefined && (
          <G>
            <Line
              x1={PAD.left}
              y1={chart.goalY}
              x2={WIDTH - PAD.right}
              y2={chart.goalY}
              stroke={GOAL_COLOR}
              strokeWidth={1.2}
              strokeDasharray="6,4"
              opacity={0.8}
            />
            <SvgText
              x={WIDTH - PAD.right + 4}
              y={chart.goalY - 6}
              textAnchor="start"
              fontSize={8}
              fill={GOAL_COLOR}
              fontWeight="600"
            >
              Goal
            </SvgText>
            {chart.goalDisplayWeight !== undefined && (
              <SvgText
                x={WIDTH - PAD.right + 4}
                y={chart.goalY + 5}
                textAnchor="start"
                fontSize={8}
                fill={GOAL_COLOR}
                fontWeight="500"
              >
                {chart.goalDisplayWeight}
              </SvgText>
            )}
          </G>
        )}

        {/* Area fill */}
        <Path
          d={chart.areaPath}
          fill="url(#weightAreaGradient)"
          stroke="none"
        />

        {/* Weight line */}
        <Path
          d={chart.linePath}
          stroke={primaryColor}
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data point dots */}
        {chart.points.map(({ x, y }, i) => {
          const isLast = i === chart.points.length - 1;
          return (
            <G key={`wp-${i}`}>
              {isLast && (
                <>
                  <Circle cx={x} cy={y} r={8} fill={primaryColor} fillOpacity={0.12} />
                  <Circle cx={x} cy={y} r={6} fill={primaryColor} fillOpacity={0.2} />
                </>
              )}
              <Circle
                cx={x}
                cy={y}
                r={isLast ? 4 : 2.5}
                fill={primaryColor}
              />
              {isLast && (
                <SvgText
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight="700"
                  fill={primaryColor}
                >
                  {chart.lastDisplayW}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* X-axis date labels */}
        {chart.xLabels.map(({ x, label }, i) => (
          <SvgText
            key={`xl-${i}`}
            x={x}
            y={HEIGHT_FULL - PAD.bottom + 16}
            textAnchor="middle"
            fontSize={10}
            fill={mutedColor}
          >
            {label}
          </SvgText>
        ))}

        {/* Y-axis weight labels */}
        {chart.yLabels.map(({ y, label }, i) => {
          if (
            chart.goalY !== undefined &&
            Math.abs(y - chart.goalY) < 14
          ) {
            return null;
          }
          return (
            <SvgText
              key={`yl-${i}`}
              x={WIDTH - PAD.right + 6}
              y={y + 3}
              textAnchor="start"
              fontSize={9}
              fill={mutedColor}
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

// ── Export with reference-equality comparator ─────────────────────────────────
export const WeightTrendGraph = React.memo(
  WeightTrendGraphInner,
  (prev, next) =>
    prev.entries === next.entries &&
    prev.goalWeightKg === next.goalWeightKg &&
    prev.weightUnit === next.weightUnit,
);

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  changeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  changeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.small.fontSize,
    textAlign: "center",
  },
});
