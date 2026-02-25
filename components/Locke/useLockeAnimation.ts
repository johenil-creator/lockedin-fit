/**
 * useLockeAnimation — Reanimated hook that drives all Locke animations.
 *
 * Returns animatedProps objects to inject into LockeSVG's animated groups.
 * Keeps animation logic completely separate from SVG shape logic.
 */

import { useEffect, useRef } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import type { LockeMood } from "./LockeSVG";
import type { RankKey } from "./lockeTokens";
import type { LockeAnimationPreset } from "../../lib/lockeMachine";
import { MOOD_POSE, EYE } from "./lockeTokens";

// ── Easing constants ──────────────────────────────────────────────────────────
const EASE_IO  = Easing.inOut(Easing.sin);
const EASE_OUT = Easing.out(Easing.quad);

// ── Per-preset config ─────────────────────────────────────────────────────────
const PRESET_CFG: Record<LockeAnimationPreset, {
  breatheHalf: number;   // ms per half-cycle (lower = livelier)
  glowPulse:   boolean;  // eye glow loops (encouraging)
  rimBoost:    number;   // added to rim opacity target (0–0.3)
}> = {
  breathe:         { breatheHalf: 2000, glowPulse: false, rimBoost: 0    },
  pulse_warm:      { breatheHalf: 1500, glowPulse: true,  rimBoost: 0    },
  arm_raise:       { breatheHalf: 2000, glowPulse: false, rimBoost: 0    },
  celebrate:       { breatheHalf: 600,  glowPulse: true,  rimBoost: 0.2  },
  disappointed:    { breatheHalf: 3200, glowPulse: false, rimBoost: 0    },
  onboarding_pulse:{ breatheHalf: 1800, glowPulse: true,  rimBoost: 0    },
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useLockeAnimation(
  mood:   LockeMood,
  _rank:  RankKey,
  preset: LockeAnimationPreset = "breathe"
) {
  const pose = MOOD_POSE[mood];
  const pcfg = PRESET_CFG[preset];

  // ── Shared values ─────────────────────────────────────────────────────────
  const breatheY      = useSharedValue(0);
  const breatheScaleY = useSharedValue(1);
  const tailRotate    = useSharedValue(0);
  const eyelidRY      = useSharedValue(EYE.lidRY);
  const browOffsetY   = useSharedValue(0);
  const armOffsetY    = useSharedValue(0);
  const glowScale     = useSharedValue(1);
  const rimOpacity    = useSharedValue(0);

  // ── Unified state effect (mood + preset) ──────────────────────────────────
  useEffect(() => {
    const half     = pcfg.breatheHalf;
    const duration = (mood === "celebrating" || mood === "disappointed") ? 500 : 280;
    const rimDelay = mood === "intense" ? 0 : 120;
    const glowDelay= mood === "celebrating" ? 80 : 70;

    // ── Body motion — per preset ──────────────────────────────────────────
    if (mood === "celebrating") {
      // Quick jump: shoot up, bounce back, then settle to fast breathing
      breatheY.value = withSequence(
        withTiming(-14, { duration: 160, easing: Easing.out(Easing.back(1.5)) }),
        withTiming(4,   { duration: 120, easing: Easing.in(Easing.quad) }),
        withTiming(-3,  { duration: 100, easing: EASE_IO }),
        withTiming(0,   { duration: 120, easing: EASE_IO }),
        withRepeat(
          withSequence(
            withTiming(-2, { duration: half, easing: EASE_IO }),
            withTiming(0,  { duration: half, easing: EASE_IO })
          ),
          -1,
          false
        )
      );
      breatheScaleY.value = withSequence(
        withTiming(0.92, { duration: 160 }),
        withTiming(1.05, { duration: 120 }),
        withTiming(1.0,  { duration: 200, easing: EASE_IO }),
        withRepeat(
          withSequence(
            withTiming(1.015, { duration: half, easing: EASE_IO }),
            withTiming(1.0,   { duration: half, easing: EASE_IO })
          ),
          -1,
          false
        )
      );
    } else if (mood === "disappointed") {
      // Slow droopy slump: body sinks slightly then drifts into sluggish breathing
      breatheY.value = withSequence(
        withTiming(5,  { duration: 700, easing: Easing.out(Easing.quad) }),
        withTiming(3,  { duration: 500, easing: EASE_IO }),
        withRepeat(
          withSequence(
            withTiming(4,  { duration: half, easing: EASE_IO }),
            withTiming(2,  { duration: half, easing: EASE_IO })
          ),
          -1,
          false
        )
      );
      breatheScaleY.value = withRepeat(
        withSequence(
          withTiming(0.99, { duration: half, easing: EASE_IO }),
          withTiming(1.0,  { duration: half, easing: EASE_IO })
        ),
        -1,
        false
      );
    } else {
      // All other moods: standard floating breathing loop
      breatheY.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: half, easing: EASE_IO }),
          withTiming(0,  { duration: half, easing: EASE_IO })
        ),
        -1,
        false
      );
      breatheScaleY.value = withRepeat(
        withSequence(
          withTiming(1.012, { duration: half, easing: EASE_IO }),
          withTiming(1.0,   { duration: half, easing: EASE_IO })
        ),
        -1,
        false
      );
    }

    // ── Tail sway ──
    const tailTarget = pose.tailAngle;
    tailRotate.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(tailTarget + 3,  { duration: half, easing: EASE_IO }),
          withTiming(tailTarget - 3,  { duration: half, easing: EASE_IO })
        ),
        -1,
        false
      )
    );

    // ── Brow + arm pose ──
    browOffsetY.value = withTiming(pose.browY, { duration, easing: EASE_OUT });
    armOffsetY.value  = withTiming(pose.armY,  { duration, easing: EASE_OUT });

    // ── Eye glow ──
    if (pcfg.glowPulse) {
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1200, easing: EASE_IO }),
          withTiming(1.0, { duration: 1200, easing: EASE_IO })
        ),
        -1,
        false
      );
    } else {
      glowScale.value = withDelay(
        glowDelay,
        withTiming(mood === "neutral" || mood === "disappointed" ? 1 : 1.25, {
          duration: duration + 100,
          easing:   EASE_OUT,
        })
      );
    }

    // ── Rim glow ──
    const rimBase   = mood === "neutral" ? 0 : 1;
    const rimTarget = Math.min(1, rimBase + pcfg.rimBoost);
    rimOpacity.value = withDelay(
      rimDelay,
      withTiming(rimTarget, {
        duration: mood === "celebrating" ? 300 : mood === "disappointed" ? 800 : 350,
        easing:   EASE_OUT,
      })
    );
  }, [mood, preset]);

  // ── Blink (independent — random interval, no deps) ────────────────────────
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleBlink() {
      // Disappointed blinks less often (sluggish), celebrating blinks normally
      const minDelay = mood === "disappointed" ? 4000 : 3000;
      const maxExtra = mood === "disappointed" ? 4000 : 2000;
      const delay = minDelay + Math.random() * maxExtra;
      blinkTimer.current = setTimeout(() => {
        eyelidRY.value = withSequence(
          withTiming(0,         { duration: 80,  easing: EASE_OUT }),
          withTiming(EYE.lidRY, { duration: 100, easing: EASE_OUT })
        );
        scheduleBlink();
      }, delay);
    }
    scheduleBlink();
    return () => { if (blinkTimer.current) clearTimeout(blinkTimer.current); };
  }, [mood]);

  // ── Animated styles ───────────────────────────────────────────────────────

  // bodyAnimProps: Animated.Image style — translateY + scale
  const bodyAnimProps = useAnimatedStyle(() => ({
    transform: [
      { translateY: breatheY.value },
      { scaleY:     breatheScaleY.value },
    ],
  }));

  // Legacy props kept so the signature doesn't break — LockeSVG ignores them
  const eyelidAnimProps = {};
  const browAnimProps   = {};
  const armAnimProps    = {};
  const tailAnimProps   = {};
  const glowAnimProps   = {};
  const rimAnimProps    = {};

  return {
    bodyAnimProps,
    eyelidAnimProps,
    browAnimProps,
    armAnimProps,
    tailAnimProps,
    glowAnimProps,
    rimAnimProps,
  };
}
