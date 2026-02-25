/**
 * LockeExpressions.tsx — SVG facial expression overlay system.
 *
 * Renders eyes (glow → sclera → iris → pupil → sparkle → eyelid), brows,
 * and mouth on top of the Locke PNG body. Each mood has distinct facial
 * features that crossfade smoothly using Reanimated shared values.
 *
 * Geometry is authored at 160px reference canvas and scales proportionally.
 * Eye centers: left (61.6, 61.6), right (98.4, 61.6) at 160px.
 *
 * Must be rendered as a CHILD of the same Animated.View as the PNG
 * so all expressions float/breathe with the body.
 */

import React, { useEffect, useMemo } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import Svg, {
  Ellipse,
  Circle,
  Path,
  G,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";
import type { LockeMascotMood } from "./LockeMascot";

// ── Animated SVG primitives ──────────────────────────────────────────────────

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

// ── Colors (from UI/UX spec) ─────────────────────────────────────────────────

const COLOR = {
  iris:    "#00E676",
  pupil:   "#061009",
  sclera:  "#141A15",
  glow:    "#00FF6A",
  fur:     "#2E2E38",  // eyelid / mask fill
  brow:    "#1A1A22",
  mouth:   "#1A1A22",
  sparkle: "#FFFFFF",
  teeth:   "#E8E8E0",
} as const;

// ── Reference geometry at 160px canvas ───────────────────────────────────────

const REF = 160;

// Eye centers (absolute px at 160px canvas)
const EYE_L_CX = 61.6;
const EYE_R_CX = 98.4;
const EYE_CY   = 61.6;

// Base eye ellipse
const BASE_EYE_RX = 7.5;
const BASE_EYE_RY = 6.0;

// Brow baseline Y (above eye center)
const BROW_BASE_Y = EYE_CY - 12;

// Brow half-length
const BROW_HALF_W = 8;

// ── Per-mood expression specs ────────────────────────────────────────────────

interface EyeSpec {
  /** Eyelid openness (0-1, where 1 = fully open, 0 = fully closed) */
  lidOpen: number;
  /** Iris rx */
  irisRX: number;
  /** Pupil radius */
  pupilR: number;
  /** Eye glow bloom opacity */
  glowOpacity: number;
  /** Whether to show a sparkle highlight */
  sparkle: boolean;
  /** Whether to show a bottom lid squeeze */
  bottomLid: boolean;
}

interface BrowSpec {
  /** Y offset from baseline (negative = raised, positive = lowered) */
  offsetY: number;
  /** Rotation in degrees (positive = inner end lowered / angry) */
  angle: number;
  /** Stroke width */
  strokeW: number;
}

interface MouthSpec {
  /** SVG path data at 160px reference */
  path: string;
  /** Width of the mouth (informational) */
  width: number;
  /** Whether the mouth path has a dark fill (celebrating open smile) */
  filled: boolean;
  /** Whether to show teeth (celebrating) */
  teeth: boolean;
}

interface ExpressionSpec {
  eye: EyeSpec;
  brow: BrowSpec;
  mouth: MouthSpec;
}

const SPECS: Record<LockeMascotMood, ExpressionSpec> = {
  neutral: {
    eye:  { lidOpen: 0.85, irisRX: 5.0, pupilR: 2.2, glowOpacity: 0.22, sparkle: false, bottomLid: false },
    brow: { offsetY: 0, angle: 0, strokeW: 1.8 },
    mouth: { path: "M72,78 Q80,78.5 88,76.5", width: 16, filled: false, teeth: false },
  },
  encouraging: {
    eye:  { lidOpen: 0.92, irisRX: 5.2, pupilR: 2.5, glowOpacity: 0.28, sparkle: false, bottomLid: false },
    brow: { offsetY: -1, angle: -3, strokeW: 1.8 },
    mouth: { path: "M70,78 Q80,77 90,74.5", width: 20, filled: false, teeth: false },
  },
  celebrating: {
    eye:  { lidOpen: 1.0, irisRX: 5.5, pupilR: 2.8, glowOpacity: 0.40, sparkle: true, bottomLid: false },
    brow: { offsetY: -2, angle: -5, strokeW: 2.0 },
    mouth: { path: "M68,76 Q80,82 92,76", width: 24, filled: true, teeth: true },
  },
  disappointed: {
    eye:  { lidOpen: 0.55, irisRX: 4.8, pupilR: 2.0, glowOpacity: 0.10, sparkle: false, bottomLid: false },
    brow: { offsetY: 5, angle: 8, strokeW: 2.0 },
    mouth: { path: "M73,79 Q80,80.5 87,79", width: 14, filled: false, teeth: false },
  },
  intense: {
    eye:  { lidOpen: 0.65, irisRX: 4.5, pupilR: 1.8, glowOpacity: 0.30, sparkle: false, bottomLid: true },
    brow: { offsetY: 3, angle: 12, strokeW: 2.2 },
    mouth: { path: "M72.5,78 L80,78.5 L87.5,78", width: 15, filled: false, teeth: false },
  },
  savage: {
    eye:  { lidOpen: 0.55, irisRX: 4.2, pupilR: 1.6, glowOpacity: 0.45, sparkle: false, bottomLid: true },
    brow: { offsetY: 4, angle: 16, strokeW: 2.4 },
    mouth: { path: "M71,79 Q80,81.5 89,79", width: 18, filled: false, teeth: false },
  },
};

// ── Timing constants ─────────────────────────────────────────────────────────

const EYELID_MS  = 250;
const PUPIL_MS   = 200;
const BROW_MS    = 300;
const MOUTH_MS   = 250;
const EASE_INOUT = Easing.inOut(Easing.quad);

// ── Props ────────────────────────────────────────────────────────────────────

export interface LockeExpressionsProps {
  /** Canvas size in pixels (e.g. 160 for full, 64 for icon) */
  canvasSize: number;
  /** Current mood — expression transitions smoothly when this changes */
  mood: LockeMascotMood;
}

// ── Helper: scale a 160px value to canvas size ───────────────────────────────

function s(val: number, canvas: number): number {
  return val * (canvas / REF);
}

// ── Component ────────────────────────────────────────────────────────────────

function LockeExpressionsInner({ canvasSize: c, mood }: LockeExpressionsProps) {
  const sc = c / REF; // scale factor
  const isSmall = c < 48; // below 48px: drop sparkle + mouth

  // Icon-size adjustments per spec
  const browStrokeMultiplier = c <= 64 ? 1.2 : 1.0;
  const glowOpacityMultiplier = c <= 64 ? 1.3 : 1.0;

  const initSpec = SPECS[mood];

  // ── Animated shared values ──────────────────────────────────────────────

  // Eye: eyelid ry (openness * base ry)
  const lidRY = useSharedValue(initSpec.eye.lidOpen * BASE_EYE_RY * sc);
  // Eye: iris rx
  const irisRX = useSharedValue(initSpec.eye.irisRX * sc);
  // Eye: pupil radius
  const pupilR = useSharedValue(initSpec.eye.pupilR * sc);
  // Eye: glow opacity
  const glowOp = useSharedValue(initSpec.eye.glowOpacity * glowOpacityMultiplier);
  // Sparkle opacity (only for celebrating)
  const sparkleOp = useSharedValue(initSpec.eye.sparkle ? 1 : 0);
  // Bottom lid opacity (only for intense)
  const bottomLidOp = useSharedValue(initSpec.eye.bottomLid ? 1 : 0);

  // Brow — crossfade layers (same pattern as mouth for smooth angle+Y transitions)
  const browOpNeutral      = useSharedValue(mood === "neutral" ? 1 : 0);
  const browOpEncouraging  = useSharedValue(mood === "encouraging" ? 1 : 0);
  const browOpCelebrating  = useSharedValue(mood === "celebrating" ? 1 : 0);
  const browOpDisappointed = useSharedValue(mood === "disappointed" ? 1 : 0);
  const browOpIntense      = useSharedValue(mood === "intense" ? 1 : 0);
  const browOpSavage       = useSharedValue(mood === "savage" ? 1 : 0);

  const browOpacities: Record<LockeMascotMood, SharedValue<number>> = {
    neutral:      browOpNeutral,
    encouraging:  browOpEncouraging,
    celebrating:  browOpCelebrating,
    disappointed: browOpDisappointed,
    intense:      browOpIntense,
    savage:       browOpSavage,
  };

  // Mouth — crossfade layers
  const mouthOpNeutral      = useSharedValue(mood === "neutral" ? 1 : 0);
  const mouthOpEncouraging  = useSharedValue(mood === "encouraging" ? 1 : 0);
  const mouthOpCelebrating  = useSharedValue(mood === "celebrating" ? 1 : 0);
  const mouthOpDisappointed = useSharedValue(mood === "disappointed" ? 1 : 0);
  const mouthOpIntense      = useSharedValue(mood === "intense" ? 1 : 0);
  const mouthOpSavage       = useSharedValue(mood === "savage" ? 1 : 0);

  const mouthOpacities: Record<LockeMascotMood, SharedValue<number>> = {
    neutral:      mouthOpNeutral,
    encouraging:  mouthOpEncouraging,
    celebrating:  mouthOpCelebrating,
    disappointed: mouthOpDisappointed,
    intense:      mouthOpIntense,
    savage:       mouthOpSavage,
  };

  // ── Animate on mood change ──────────────────────────────────────────────

  useEffect(() => {
    const sp = SPECS[mood];
    const eyelidTiming  = { duration: EYELID_MS, easing: EASE_INOUT };
    const pupilTiming   = { duration: PUPIL_MS,  easing: EASE_INOUT };
    const browTiming    = { duration: BROW_MS,   easing: EASE_INOUT };
    const mouthTiming   = { duration: MOUTH_MS,  easing: EASE_INOUT };

    // Eye
    lidRY.value     = withTiming(sp.eye.lidOpen * BASE_EYE_RY * sc, eyelidTiming);
    irisRX.value    = withTiming(sp.eye.irisRX * sc, pupilTiming);
    pupilR.value    = withTiming(sp.eye.pupilR * sc, pupilTiming);
    glowOp.value    = withTiming(sp.eye.glowOpacity * glowOpacityMultiplier, eyelidTiming);
    sparkleOp.value = withTiming(sp.eye.sparkle && !isSmall ? 1 : 0, eyelidTiming);
    bottomLidOp.value = withTiming(sp.eye.bottomLid ? 1 : 0, eyelidTiming);

    // Brow crossfade
    const allMoods: LockeMascotMood[] = ["neutral", "encouraging", "celebrating", "disappointed", "intense", "savage"];
    for (const m of allMoods) {
      browOpacities[m].value = withTiming(m === mood ? 1 : 0, browTiming);
    }

    // Mouth crossfade
    for (const m of allMoods) {
      mouthOpacities[m].value = withTiming(m === mood ? 1 : 0, mouthTiming);
    }
  }, [mood, c]);

  // ── Animated props ──────────────────────────────────────────────────────

  // Sclera ellipse (ry animated for eyelid openness)
  const leftScleraProps = useAnimatedProps(() => ({
    ry: lidRY.value,
  }));
  const rightScleraProps = useAnimatedProps(() => ({
    ry: lidRY.value,
  }));

  // Iris (rx animated)
  const leftIrisProps = useAnimatedProps(() => ({
    rx: irisRX.value,
    ry: irisRX.value, // keep iris circular-ish
  }));
  const rightIrisProps = useAnimatedProps(() => ({
    rx: irisRX.value,
    ry: irisRX.value,
  }));

  // Pupil (r animated)
  const leftPupilProps = useAnimatedProps(() => ({
    r: pupilR.value,
  }));
  const rightPupilProps = useAnimatedProps(() => ({
    r: pupilR.value,
  }));

  // Glow (opacity animated)
  const glowAnimProps = useAnimatedProps(() => ({
    opacity: glowOp.value,
  }));

  // Sparkle (opacity animated)
  const sparkleAnimProps = useAnimatedProps(() => ({
    opacity: sparkleOp.value,
  }));

  // Bottom lid (opacity animated)
  const bottomLidAnimProps = useAnimatedProps(() => ({
    opacity: bottomLidOp.value,
  }));

  // Brow group opacity per mood
  const browNeutralProps      = useAnimatedProps(() => ({ opacity: browOpNeutral.value }));
  const browEncouragingProps  = useAnimatedProps(() => ({ opacity: browOpEncouraging.value }));
  const browCelebratingProps  = useAnimatedProps(() => ({ opacity: browOpCelebrating.value }));
  const browDisappointedProps = useAnimatedProps(() => ({ opacity: browOpDisappointed.value }));
  const browIntenseProps      = useAnimatedProps(() => ({ opacity: browOpIntense.value }));
  const browSavageProps       = useAnimatedProps(() => ({ opacity: browOpSavage.value }));

  const browAnimProps: Record<LockeMascotMood, ReturnType<typeof useAnimatedProps>> = {
    neutral:      browNeutralProps,
    encouraging:  browEncouragingProps,
    celebrating:  browCelebratingProps,
    disappointed: browDisappointedProps,
    intense:      browIntenseProps,
    savage:       browSavageProps,
  };

  // Mouth group opacity per mood
  const mouthNeutralProps      = useAnimatedProps(() => ({ opacity: mouthOpNeutral.value }));
  const mouthEncouragingProps  = useAnimatedProps(() => ({ opacity: mouthOpEncouraging.value }));
  const mouthCelebratingProps  = useAnimatedProps(() => ({ opacity: mouthOpCelebrating.value }));
  const mouthDisappointedProps = useAnimatedProps(() => ({ opacity: mouthOpDisappointed.value }));
  const mouthIntenseProps      = useAnimatedProps(() => ({ opacity: mouthOpIntense.value }));
  const mouthSavageProps       = useAnimatedProps(() => ({ opacity: mouthOpSavage.value }));

  const mouthAnimProps: Record<LockeMascotMood, ReturnType<typeof useAnimatedProps>> = {
    neutral:      mouthNeutralProps,
    encouraging:  mouthEncouragingProps,
    celebrating:  mouthCelebratingProps,
    disappointed: mouthDisappointedProps,
    intense:      mouthIntenseProps,
    savage:       mouthSavageProps,
  };

  // ── Pre-computed scaled geometry ────────────────────────────────────────

  const lCX = s(EYE_L_CX, c);
  const rCX = s(EYE_R_CX, c);
  const eCY = s(EYE_CY, c);
  const baseRX = s(BASE_EYE_RX, c);

  // Fur mask — slightly larger than max eye opening to cover PNG eyes
  const maskRX = baseRX * 1.45;
  const maskRY = s(BASE_EYE_RY, c) * 1.65;

  // Glow bloom radius
  const glowR = baseRX * 2.2;

  // Sparkle position (upper-right of each eye)
  const sparkleOffX = baseRX * 0.45;
  const sparkleOffY = s(BASE_EYE_RY, c) * -0.5;
  const sparkleR = s(1.2, c);

  // Bottom lid (intense) — thin ellipse at bottom edge of eye
  const bottomLidRY = s(BASE_EYE_RY, c) * 0.35;
  const bottomLidCY = eCY + s(BASE_EYE_RY, c) * 0.55;

  // Mouth mask — fur-colored ellipse to cover PNG's painted smirk
  // PNG mouth sits at roughly cx=80, cy=77 at 160px, ~20px wide, ~6px tall
  const mouthMaskCX = s(80, c);
  const mouthMaskCY = s(77.5, c);
  const mouthMaskRX = s(14, c);  // covers widest mouth (celebrating 24px) with margin
  const mouthMaskRY = s(5, c);   // covers smirk height + mouth variations

  // Brow geometry
  const browBaseY = s(BROW_BASE_Y, c);
  const browHW = s(BROW_HALF_W, c);

  // Mouth paths scaled to canvas
  const mouthPaths = useMemo(() => {
    const result: Record<LockeMascotMood, { path: string; spec: MouthSpec }> = {} as any;
    for (const [m, sp] of Object.entries(SPECS) as [LockeMascotMood, ExpressionSpec][]) {
      // Scale the path coordinates from 160px reference to canvas size
      const scaled = sp.mouth.path.replace(
        /(\d+\.?\d*)/g,
        (match) => String(parseFloat(match) * sc),
      );
      result[m] = { path: scaled, spec: sp.mouth };
    }
    return result;
  }, [c, sc]);

  // Teeth path for celebrating (slightly inside the mouth curve)
  const teethPath = useMemo(() => {
    const mx = s(72, c);
    const my = s(77.5, c);
    const cx1 = s(80, c);
    const cy1 = s(80, c);
    const ex = s(88, c);
    const ey = s(77.5, c);
    return `M${mx},${my} Q${cx1},${cy1} ${ex},${ey}`;
  }, [c, sc]);

  // ── Render a single eye (layer order: glow → sclera → iris → pupil → sparkle → top lid → bottom lid) ──

  const renderEye = (cx: number, side: "left" | "right") => {
    const scleraP = side === "left" ? leftScleraProps : rightScleraProps;
    const irisP   = side === "left" ? leftIrisProps   : rightIrisProps;
    const pupilP  = side === "left" ? leftPupilProps  : rightPupilProps;
    const glowId  = `eyeGlow_${side}`;

    return (
      <G key={side}>
        {/* Fur-colored mask to cover PNG's painted eye */}
        <Ellipse
          cx={cx}
          cy={eCY}
          rx={maskRX}
          ry={maskRY}
          fill={COLOR.fur}
        />

        {/* 1. Glow bloom (behind everything else in the eye) */}
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={COLOR.glow} stopOpacity={0.6} />
            <Stop offset="100%" stopColor={COLOR.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <AnimatedCircle
          cx={cx}
          cy={eCY}
          r={glowR}
          fill={`url(#${glowId})`}
          animatedProps={glowAnimProps}
        />

        {/* 2. Sclera (ry animated = eyelid openness) */}
        <AnimatedEllipse
          cx={cx}
          cy={eCY}
          rx={baseRX}
          animatedProps={scleraP}
          fill={COLOR.sclera}
        />

        {/* 3. Iris (rx animated per mood) */}
        <AnimatedEllipse
          cx={cx}
          cy={eCY}
          animatedProps={irisP}
          fill={COLOR.iris}
        />

        {/* 4. Pupil (r animated per mood) */}
        <AnimatedCircle
          cx={cx}
          cy={eCY}
          animatedProps={pupilP}
          fill={COLOR.pupil}
        />

        {/* 5. Sparkle highlight (celebrating only, fades in/out) */}
        {!isSmall && (
          <AnimatedCircle
            cx={cx + sparkleOffX}
            cy={eCY + sparkleOffY}
            r={sparkleR}
            fill={COLOR.sparkle}
            animatedProps={sparkleAnimProps}
          />
        )}

        {/* 6. Top eyelid — fur-colored rect clipping above the sclera */}
        {/* (The sclera ry shrinkage IS the top eyelid effect; no extra shape needed) */}

        {/* 7. Bottom lid squeeze (intense only, fades in/out) */}
        <AnimatedEllipse
          cx={cx}
          cy={bottomLidCY}
          rx={baseRX * 0.9}
          ry={bottomLidRY}
          fill={COLOR.fur}
          animatedProps={bottomLidAnimProps}
        />
      </G>
    );
  };

  // ── Pre-compute brow geometry per mood (for crossfade layers) ─────────────

  const browLayers = useMemo(() => {
    const allMoods: LockeMascotMood[] = ["neutral", "encouraging", "celebrating", "disappointed", "intense", "savage"];
    return allMoods.map((m) => {
      const sp = SPECS[m];
      const yOff = sp.brow.offsetY * sc;
      const sw = sp.brow.strokeW * sc * browStrokeMultiplier;

      const makeBrow = (cx: number, side: "left" | "right") => {
        const outerX = side === "left" ? cx - browHW : cx + browHW;
        const innerX = side === "left" ? cx + browHW * 0.6 : cx - browHW * 0.6;
        const centerX = (outerX + innerX) / 2;
        const angle = side === "left" ? sp.brow.angle : -sp.brow.angle;
        return { outerX, innerX, centerX, angle, yOff, sw };
      };

      return {
        mood: m,
        left: makeBrow(lCX, "left"),
        right: makeBrow(rCX, "right"),
      };
    });
  }, [c, sc, browStrokeMultiplier, lCX, rCX, browHW, browBaseY]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Svg
      width={c}
      height={c}
      viewBox={`0 0 ${c} ${c}`}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {/* Eyes (full layer stack per eye) */}
      {renderEye(lCX, "left")}
      {renderEye(rCX, "right")}

      {/* Brows — per-mood layers crossfaded via animated opacity */}
      {browLayers.map(({ mood: m, left: lb, right: rb }) => (
        <AnimatedG key={`brows_${m}`} animatedProps={browAnimProps[m]}>
          {/* Left brow */}
          <G transform={`rotate(${lb.angle}, ${lb.centerX}, ${browBaseY + lb.yOff})`}>
            <Path
              d={`M ${lb.outerX} ${browBaseY + lb.yOff} L ${lb.innerX} ${browBaseY + lb.yOff}`}
              stroke={COLOR.brow}
              strokeWidth={lb.sw}
              strokeLinecap="round"
              fill="none"
            />
          </G>
          {/* Right brow */}
          <G transform={`rotate(${rb.angle}, ${rb.centerX}, ${browBaseY + rb.yOff})`}>
            <Path
              d={`M ${rb.outerX} ${browBaseY + rb.yOff} L ${rb.innerX} ${browBaseY + rb.yOff}`}
              stroke={COLOR.brow}
              strokeWidth={rb.sw}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </AnimatedG>
      ))}

      {/* Mouth mask — fur-colored ellipse to cover PNG's painted smirk */}
      {!isSmall && (
        <Ellipse
          cx={mouthMaskCX}
          cy={mouthMaskCY}
          rx={mouthMaskRX}
          ry={mouthMaskRY}
          fill={COLOR.fur}
        />
      )}

      {/* Mouth — one path per mood, crossfaded via animated group opacity */}
      {!isSmall && (
        <>
          {(Object.keys(SPECS) as LockeMascotMood[]).map((m) => {
            const { path, spec: mSpec } = mouthPaths[m];
            return (
              <AnimatedG key={`mouth_${m}`} animatedProps={mouthAnimProps[m]}>
                {/* Mouth stroke (and fill for celebrating) */}
                <Path
                  d={path}
                  stroke={COLOR.mouth}
                  strokeWidth={Math.max(1, s(1.5, c))}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={mSpec.filled ? COLOR.mouth : "none"}
                />
                {/* Teeth line for celebrating */}
                {mSpec.teeth && (
                  <Path
                    d={teethPath}
                    stroke={COLOR.teeth}
                    strokeWidth={Math.max(0.5, s(0.8, c))}
                    strokeLinecap="round"
                    fill="none"
                  />
                )}
              </AnimatedG>
            );
          })}
        </>
      )}
    </Svg>
  );
}

export const LockeExpressions = React.memo(LockeExpressionsInner);
export default LockeExpressions;
