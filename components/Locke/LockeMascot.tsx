/**
 * LockeMascot.tsx — Standalone, memoized mascot component.
 * Renders mood-specific PNG expressions with crossfade transitions,
 * subtle float/breathe animations, and a foot shadow synced to float height.
 */

import React, { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";

// ── Types ────────────────────────────────────────────────────────────────────

export type LockeMascotMood = "neutral" | "encouraging" | "celebrating" | "disappointed" | "intense" | "savage";

// ── Mood asset map ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MOOD_ASSETS: Record<LockeMascotMood, any> = {
  neutral:      require("../../assets/locke/neutral.png"),
  encouraging:  require("../../assets/locke/encouraging.png"),
  celebrating:  require("../../assets/locke/celebrating.png"),
  disappointed: require("../../assets/locke/disappointed.png"),
  intense:      require("../../assets/locke/intense.png"),
  savage:       require("../../assets/locke/savage.png"),
};

const ALL_MOODS: LockeMascotMood[] = ["neutral", "encouraging", "celebrating", "disappointed", "intense", "savage"];
type Mood = LockeMascotMood;

export interface LockeMascotProps {
  size?: number | "icon" | "full";
  mood?: Mood;
  glow?: boolean;
  onPress?: () => void;
}

// ── Size resolver ────────────────────────────────────────────────────────────

function resolveSize(size: number | "icon" | "full"): number {
  if (size === "icon") return 64;
  if (size === "full") return 160;
  return size;
}

// ── Easing shorthand ─────────────────────────────────────────────────────────

const EASE_SIN = Easing.inOut(Easing.sin);
const EASE_OUT_QUAD = Easing.out(Easing.quad);
const CROSSFADE_MS = 280;

// ── Idle loop config per mood ────────────────────────────────────────────────

const IDLE: Record<Mood, { cycle: number; floatY: number; breatheScale: number }> = {
  neutral:      { cycle: 3200, floatY: -1,   breatheScale: 1.01 },
  encouraging:  { cycle: 3200, floatY: -1,   breatheScale: 1.01 },
  celebrating:  { cycle: 2400, floatY: -1,   breatheScale: 1.01 },
  disappointed: { cycle: 4800, floatY: 1.5,  breatheScale: 1.005 },
  intense:      { cycle: 3200, floatY: 0,    breatheScale: 1.005 },
  savage:       { cycle: 2800, floatY: -0.5, breatheScale: 1.015 },
};

// ── Component ────────────────────────────────────────────────────────────────

function LockeMascotInner({
  size = "full",
  mood = "neutral",
  onPress,
}: LockeMascotProps) {
  const px = resolveSize(size);
  const { isDark } = useAppTheme();

  // ── Container shared values (float + breathe + dim) ─────────────────────
  const translateY = useSharedValue(0);
  const scaleBody = useSharedValue(1);
  const bodyOpacity = useSharedValue(1);

  // ── Crossfade shared values — one opacity per mood ────────────────────
  const opNeutral      = useSharedValue(mood === "neutral" ? 1 : 0);
  const opEncouraging  = useSharedValue(mood === "encouraging" ? 1 : 0);
  const opCelebrating  = useSharedValue(mood === "celebrating" ? 1 : 0);
  const opDisappointed = useSharedValue(mood === "disappointed" ? 1 : 0);
  const opIntense      = useSharedValue(mood === "intense" ? 1 : 0);
  const opSavage       = useSharedValue(mood === "savage" ? 1 : 0);

  const moodOpacities: Record<Mood, { value: number }> = {
    neutral:      opNeutral,
    encouraging:  opEncouraging,
    celebrating:  opCelebrating,
    disappointed: opDisappointed,
    intense:      opIntense,
    savage:       opSavage,
  };

  // Track previous mood to trigger crossfade only on actual changes
  const prevMoodRef = useRef<Mood>(mood);

  // ── Crossfade effect — runs when mood changes ─────────────────────────
  useEffect(() => {
    const prev = prevMoodRef.current;
    if (prev !== mood) {
      // Fade out old mood, fade in new mood simultaneously
      moodOpacities[prev].value = withTiming(0, {
        duration: CROSSFADE_MS,
        easing: EASE_OUT_QUAD,
      });
      moodOpacities[mood].value = withTiming(1, {
        duration: CROSSFADE_MS,
        easing: EASE_OUT_QUAD,
      });
      prevMoodRef.current = mood;
    }
  }, [mood]);

  // ── Mood-driven container animation effect ────────────────────────────
  useEffect(() => {
    cancelAnimation(translateY);
    cancelAnimation(scaleBody);
    cancelAnimation(bodyOpacity);

    const idle = IDLE[mood];
    const half = idle.cycle / 2;

    // Helper: start idle float loop
    const startIdleFloat = (baseOffset = 0) => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(idle.floatY + baseOffset, { duration: half, easing: EASE_SIN }),
          withTiming(0 + baseOffset, { duration: half, easing: EASE_SIN }),
        ),
        -1,
        false,
      );
    };

    // Helper: start idle breathe loop
    const startIdleBreathe = () => {
      scaleBody.value = withRepeat(
        withSequence(
          withTiming(idle.breatheScale, { duration: half + 100, easing: EASE_SIN }),
          withTiming(1.0, { duration: half + 100, easing: EASE_SIN }),
        ),
        -1,
        false,
      );
    };

    // ── Mood entry animations (container-level) ─────────────────────────

    switch (mood) {
      case "encouraging":
        bodyOpacity.value = withTiming(1, { duration: 100 });
        translateY.value = withSequence(
          withTiming(-2, { duration: 120, easing: EASE_OUT_QUAD }),
          withTiming(0, { duration: 120, easing: EASE_SIN }),
          withRepeat(
            withSequence(
              withTiming(idle.floatY, { duration: half, easing: EASE_SIN }),
              withTiming(0, { duration: half, easing: EASE_SIN }),
            ),
            -1,
            false,
          ),
        );
        startIdleBreathe();
        break;

      case "celebrating":
        bodyOpacity.value = withTiming(1, { duration: 100 });
        translateY.value = withSequence(
          withTiming(-5, { duration: 160, easing: EASE_OUT_QUAD }),
          withTiming(1, { duration: 120, easing: EASE_SIN }),
          withTiming(0, { duration: 100, easing: EASE_SIN }),
          withRepeat(
            withSequence(
              withTiming(idle.floatY, { duration: half, easing: EASE_SIN }),
              withTiming(0, { duration: half, easing: EASE_SIN }),
            ),
            -1,
            false,
          ),
        );
        scaleBody.value = withSequence(
          withTiming(0.97, { duration: 100 }),
          withTiming(1.02, { duration: 100 }),
          withTiming(1.0, { duration: 120, easing: EASE_SIN }),
          withRepeat(
            withSequence(
              withTiming(idle.breatheScale, { duration: half + 100, easing: EASE_SIN }),
              withTiming(1.0, { duration: half + 100, easing: EASE_SIN }),
            ),
            -1,
            false,
          ),
        );
        break;

      case "disappointed":
        bodyOpacity.value = withTiming(0.92, { duration: 500, easing: EASE_SIN });
        translateY.value = withSequence(
          withTiming(idle.floatY, { duration: 600, easing: EASE_OUT_QUAD }),
          withRepeat(
            withSequence(
              withTiming(idle.floatY + 0.5, { duration: half, easing: EASE_SIN }),
              withTiming(idle.floatY - 0.5, { duration: half, easing: EASE_SIN }),
            ),
            -1,
            false,
          ),
        );
        startIdleBreathe();
        break;

      case "intense":
        bodyOpacity.value = withTiming(1, { duration: 50 });

        translateY.value = withTiming(0, { duration: 100 });
        startIdleBreathe();
        break;

      case "savage":
        bodyOpacity.value = withTiming(1, { duration: 50 });
        translateY.value = withSequence(
          withTiming(-1, { duration: 80, easing: EASE_OUT_QUAD }),
          withTiming(0, { duration: 80, easing: EASE_SIN }),
          withRepeat(
            withSequence(
              withTiming(idle.floatY, { duration: half, easing: EASE_SIN }),
              withTiming(0, { duration: half, easing: EASE_SIN }),
            ),
            -1,
            false,
          ),
        );
        startIdleBreathe();
        break;

      default:
        bodyOpacity.value = withTiming(1, { duration: 200 });
        startIdleFloat();
        startIdleBreathe();
        break;
    }
  }, [mood, isDark]);

  // ── Container animated style (wraps all stacked images) ───────────────

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scaleBody.value },
    ],
  }));

  // ── Per-mood image animated styles ────────────────────────────────────

  const neutralStyle      = useAnimatedStyle(() => ({ opacity: opNeutral.value }));
  const encouragingStyle  = useAnimatedStyle(() => ({ opacity: opEncouraging.value }));
  const celebratingStyle  = useAnimatedStyle(() => ({ opacity: opCelebrating.value }));
  const disappointedStyle = useAnimatedStyle(() => ({ opacity: opDisappointed.value }));
  const intenseStyle      = useAnimatedStyle(() => ({ opacity: opIntense.value }));
  const savageStyle       = useAnimatedStyle(() => ({ opacity: opSavage.value }));

  const moodStyles: Record<Mood, ReturnType<typeof useAnimatedStyle>> = {
    neutral:      neutralStyle,
    encouraging:  encouragingStyle,
    celebrating:  celebratingStyle,
    disappointed: disappointedStyle,
    intense:      intenseStyle,
    savage:       savageStyle,
  };

  // ── Foot shadow — scales inversely with float height ──────────────────
  const shadowScaleX = useDerivedValue(() =>
    interpolate(translateY.value, [-5, 0, 2], [0.85, 1, 1.05], "clamp"),
  );
  const shadowOpacity = useDerivedValue(() =>
    interpolate(translateY.value, [-5, 0, 2], [0.08, isDark ? 0.15 : 0.08, isDark ? 0.18 : 0.1], "clamp"),
  );

  const footShadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: shadowScaleX.value }, { scaleY: 1 }],
    opacity: shadowOpacity.value,
  }));

  // ── Foot shadow geometry ─────────────────────────────────────────────
  const shadowW = Math.round(px * 0.5);
  const shadowH = Math.round(px * 0.08);

  // ── Render ──────────────────────────────────────────────────────────────

  const content = (
    <View style={{ width: px, height: px, overflow: "visible", alignItems: "center", justifyContent: "center" }}>
      {/* Character body — container applies float/breathe/dim to all images */}
      <Animated.View style={[{ width: px, height: px }, bodyStyle]}>
        {ALL_MOODS.map((m) => (
          <Animated.Image
            key={m}
            source={MOOD_ASSETS[m]}
            style={[
              {
                position: "absolute" as const,
                top: 0,
                left: 0,
                width: px,
                height: px,
              },
              moodStyles[m] as any,
            ]}
            resizeMode="contain"
          />
        ))}
      </Animated.View>

      {/* Foot shadow — soft oval at bottom, synced with float */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            bottom: Math.round(px * 0.04),
            width: shadowW,
            height: shadowH,
            borderRadius: shadowH / 2,
            backgroundColor: "#000",
          },
          footShadowStyle,
        ]}
      />
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export const LockeMascot = React.memo(LockeMascotInner);
export default LockeMascot;
