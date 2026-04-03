import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useAppTheme } from "../../contexts/ThemeContext";
import { typography } from "../../lib/theme";
import type { Macros } from "../../src/data/mealTypes";

type Props = {
  current: Macros;
  target: Macros;
  size?: number;
};

const RING_COLORS = {
  calories: "#3FB950",
  protein: "#378ADD",
  carbs: "#BA7517",
  fat: "#7F77DD",
} as const;

const STROKE_WIDTH = 5;
const RING_GAP = 9;

function clamp01(value: number): number {
  if (value <= 0 || !isFinite(value)) return 0;
  return Math.min(value, 1);
}

export const MacroRings = React.memo(function MacroRings({ current, target, size = 120 }: Props) {
  const { theme } = useAppTheme();
  const center = size / 2;

  const rings: { key: keyof Macros; color: string; radius: number }[] = [
    { key: "calories", color: RING_COLORS.calories, radius: center - STROKE_WIDTH / 2 - 2 },
    { key: "protein", color: RING_COLORS.protein, radius: center - STROKE_WIDTH / 2 - 2 - RING_GAP },
    { key: "carbs", color: RING_COLORS.carbs, radius: center - STROKE_WIDTH / 2 - 2 - RING_GAP * 2 },
    { key: "fat", color: RING_COLORS.fat, radius: center - STROKE_WIDTH / 2 - 2 - RING_GAP * 3 },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {rings.map(({ key, color, radius: r }) => {
          const circumference = 2 * Math.PI * r;
          const pct = target[key] > 0 ? clamp01(current[key] / target[key]) : 0;
          const offset = circumference * (1 - pct);

          return (
            <React.Fragment key={key}>
              {/* Track */}
              <Circle
                cx={center}
                cy={center}
                r={r}
                stroke={color + "20"}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {/* Progress */}
              <Circle
                cx={center}
                cy={center}
                r={r}
                stroke={color}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                rotation={-90}
                origin={`${center}, ${center}`}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.centerLabel}>
        <View
          style={[
            styles.centerBg,
            {
              width: size * 0.42,
              height: size * 0.42,
              borderRadius: size * 0.21,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Text style={[styles.calNumber, { color: theme.colors.text, fontSize: size * 0.17 }]}>
            {Math.round(current.calories)}
          </Text>
          <Text style={[styles.calLabel, { color: theme.colors.muted, fontSize: size * 0.1 }]}>cal</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBg: {
    alignItems: "center",
    justifyContent: "center",
  },
  calNumber: {
    fontWeight: "700",
  },
  calLabel: {
    marginTop: -1,
  },
});
