import React from "react";
import Svg, { Polyline, Circle } from "react-native-svg";
import { useAppTheme } from "../../contexts/ThemeContext";

type Props = {
  data: number[];
  width?: number;
  height?: number;
  /** Highlight the last point if it's a PR */
  hasPR?: boolean;
};

function SparklineInner({ data, width = 80, height = 32, hasPR = false }: Props) {
  const { theme } = useAppTheme();
  if (data.length < 2) return null;

  const padding = 4;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * w;
      const y = padding + h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  // Last point coords for PR dot
  const lastX = padding + ((data.length - 1) / (data.length - 1)) * w;
  const lastY = padding + h - ((data[data.length - 1] - min) / range) * h;

  // Trend color: compare first and last
  const trendUp = data[data.length - 1] >= data[0];
  const strokeColor = trendUp ? theme.colors.success : theme.colors.danger;

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {hasPR && (
        <Circle cx={lastX} cy={lastY} r={3.5} fill="#FFD700" />
      )}
    </Svg>
  );
}

export const Sparkline = React.memo(SparklineInner);
