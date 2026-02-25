/**
 * LockeSVG — Locke mascot rendered from PNG asset.
 * Body motion (breathe, jump, droop) is driven by Reanimated transforms
 * applied to the base image. SVG overlays animate the eye glow + pendant glow.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Ellipse, Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import type { RankKey } from "./lockeTokens";
import { EYE_VIRIDIAN, RANK_CONFIG, SIZE } from "./lockeTokens";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LockeBase = require("../../assets/locke/locke_base.png");

// ── Types ─────────────────────────────────────────────────────────────────────
export type LockeMood =
  | "neutral"
  | "encouraging"
  | "celebrating"
  | "disappointed"
  | "intense"
  | "onboarding_guide";

export interface LockeSVGProps {
  size:    "icon" | "full";
  mood:    LockeMood;
  rank:    RankKey;
  /** Animated style from useLockeAnimation — applied to Animated.Image */
  bodyAnimProps?:   object;
  /** Kept for API compatibility — no-op in PNG mode */
  eyelidAnimProps?: object;
  browAnimProps?:   object;
  armAnimProps?:    object;
  tailAnimProps?:   object;
  glowAnimProps?:   object;
  rimAnimProps?:    object;
}

// ── Eye glow overlay positions (relative to full 160px canvas) ───────────────
// Eyes sit at roughly 40% from top, 38% left / 62% right of the image.
const EYE_LEFT  = { cx: 0.385, cy: 0.385 };
const EYE_RIGHT = { cx: 0.615, cy: 0.385 };

// ── Pendant glow position (relative to full canvas) ──────────────────────────
const PENDANT = { cx: 0.5, cy: 0.595 };

// ── Mood → rim glow color ─────────────────────────────────────────────────────
const RIM_COLOR: Record<LockeMood, string> = {
  neutral:          "#00FF6A",
  encouraging:      "#00FF6A",
  celebrating:      "#00FF6A",
  disappointed:     "#5BBCFF",
  intense:          "#FF3B30",
  onboarding_guide: "#00FF6A",
};

// ── Main SVG component ────────────────────────────────────────────────────────
export function LockeSVG({
  size,
  mood,
  rank,
  bodyAnimProps = {},
  // remaining props are no-ops — motion baked into Animated.Image style
}: LockeSVGProps) {
  const cfg      = SIZE[size];
  const rankCfg  = RANK_CONFIG[rank];
  const canvas   = cfg.canvas;
  const eyes     = EYE_VIRIDIAN;
  const rimColor = RIM_COLOR[mood];

  // ── Icon mode: just the head crop ─────────────────────────────────────────
  if (!cfg.showBody) {
    // For icon size (32px), show a small version of the full image cropped to head
    return (
      <View style={{ width: canvas, height: canvas, overflow: "hidden", borderRadius: canvas / 2 }}>
        {/* Rim glow ring */}
        <Svg
          width={canvas}
          height={canvas}
          viewBox={`0 0 ${canvas} ${canvas}`}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="rimIcon" cx="50%" cy="50%" r="50%">
              <Stop offset="55%" stopColor={rimColor} stopOpacity={0} />
              <Stop offset="100%" stopColor={rimColor} stopOpacity={0.45 * rankCfg.rimIntensity} />
            </RadialGradient>
          </Defs>
          <Circle cx={canvas / 2} cy={canvas / 2} r={canvas / 2} fill="url(#rimIcon)" />
        </Svg>

        {/* Character image — head fills the icon, cropped from top ~55% of image */}
        <Animated.Image
          source={LockeBase}
          style={[
            {
              width:    canvas * 2.2,
              height:   canvas * 2.2,
              position: "absolute",
              top:      -canvas * 0.08,
              left:     -canvas * 0.6,
            },
            bodyAnimProps as any,
          ]}
          resizeMode="contain"
        />

        {/* Eye glow overlay */}
        <Svg
          width={canvas}
          height={canvas}
          viewBox={`0 0 ${canvas} ${canvas}`}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {[EYE_LEFT, EYE_RIGHT].map((e, i) => (
            <Circle
              key={i}
              cx={e.cx * canvas}
              cy={e.cy * canvas * 0.72}
              r={canvas * 0.12}
              fill={eyes.glow}
              opacity={rankCfg.glowOpacity * 0.28}
            />
          ))}
        </Svg>
      </View>
    );
  }

  // ── Full body mode ────────────────────────────────────────────────────────
  return (
    <View style={{ width: canvas, height: canvas }}>
      {/* Rim glow halo behind character */}
      <Svg
        width={canvas}
        height={canvas}
        viewBox={`0 0 ${canvas} ${canvas}`}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="rimFull" cx="50%" cy="52%" r="46%">
            <Stop offset="45%" stopColor={rimColor} stopOpacity={0} />
            <Stop offset="100%" stopColor={rimColor} stopOpacity={0.38 * rankCfg.rimIntensity} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={canvas * 0.5}
          cy={canvas * 0.55}
          rx={canvas * 0.44}
          ry={canvas * 0.46}
          fill="url(#rimFull)"
        />
      </Svg>

      {/* Character — full body PNG with breathing/jump transforms */}
      <Animated.Image
        source={LockeBase}
        style={[
          {
            width:  canvas,
            height: canvas,
          },
          bodyAnimProps as any,
        ]}
        resizeMode="contain"
      />

      {/* Eye glow overlay — sits above the PNG */}
      <Svg
        width={canvas}
        height={canvas}
        viewBox={`0 0 ${canvas} ${canvas}`}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {/* Eye blooms */}
        {[EYE_LEFT, EYE_RIGHT].map((e, i) => (
          <React.Fragment key={i}>
            <Circle
              cx={e.cx * canvas}
              cy={e.cy * canvas}
              r={canvas * 0.072}
              fill={eyes.glow}
              opacity={rankCfg.glowOpacity * 0.22}
            />
          </React.Fragment>
        ))}

        {/* Pendant glow (always shown, brighter when collarGlow rank) */}
        <Circle
          cx={PENDANT.cx * canvas}
          cy={PENDANT.cy * canvas}
          r={canvas * 0.055}
          fill={eyes.glow}
          opacity={rankCfg.collarGlow ? 0.55 : 0.28}
        />
        {rankCfg.collarGlow && (
          <Circle
            cx={PENDANT.cx * canvas}
            cy={PENDANT.cy * canvas}
            r={canvas * 0.085}
            fill={eyes.glow}
            opacity={0.18}
          />
        )}
      </Svg>
    </View>
  );
}
