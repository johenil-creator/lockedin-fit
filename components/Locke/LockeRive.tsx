/**
 * LockeRive.tsx — Rive-powered mascot component.
 *
 * Renders the Locke wolf via a Rive state machine with mood-driven animations.
 * Falls back to the PNG-based LockeMascot if the .riv asset fails to load.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View, ViewStyle } from "react-native";
import Rive, { Fit, RiveRef } from "rive-react-native";
import { LockeMascot } from "./LockeMascot";
import type { LockeMascotMood } from "./LockeMascot";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const lockeRivAsset = require("../../assets/locke/locke.riv");

// ── Types ────────────────────────────────────────────────────────────────────

export type LockeRiveMood =
  | "neutral"
  | "encouraging"
  | "celebrating"
  | "disappointed"
  | "intense"
  | "onboarding_guide";

export interface LockeRiveProps {
  mood?: LockeRiveMood;
  size?: "icon" | "full";
  onPress?: () => void;
  style?: ViewStyle;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATE_MACHINE_NAME = "LockeState";
const MOOD_INPUT_NAME = "mood";

const SIZE_PX: Record<"icon" | "full", number> = {
  icon: 48,
  full: 160,
};

/** Map mood string to the integer the Rive state machine expects. */
const MOOD_VALUE: Record<LockeRiveMood, number> = {
  neutral: 0,
  encouraging: 1,
  celebrating: 2,
  disappointed: 3,
  intense: 4,
  onboarding_guide: 0,
};

// ── Component ────────────────────────────────────────────────────────────────

function LockeRiveInner({
  mood = "neutral",
  size = "full",
  onPress,
  style,
}: LockeRiveProps) {
  const riveRef = useRef<RiveRef>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Update mood input whenever mood prop changes
  useEffect(() => {
    if (useFallback) return;
    riveRef.current?.setInputState(
      STATE_MACHINE_NAME,
      MOOD_INPUT_NAME,
      MOOD_VALUE[mood],
    );
  }, [mood, useFallback]);

  const handleError = useCallback(() => {
    setUseFallback(true);
  }, []);

  const px = SIZE_PX[size];

  // ── Fallback to PNG mascot ─────────────────────────────────────────────────
  if (useFallback) {
    const fallbackMood: LockeMascotMood =
      mood === "onboarding_guide" ? "neutral" : mood;
    return (
      <LockeMascot
        size={size === "icon" ? "icon" : "full"}
        mood={fallbackMood}
        onPress={onPress}
      />
    );
  }

  // ── Rive rendering ─────────────────────────────────────────────────────────
  const riveView = (
    <View style={[{ width: px, height: px }, style]}>
      <Rive
        ref={riveRef}
        source={lockeRivAsset}
        stateMachineName={STATE_MACHINE_NAME}
        autoplay
        fit={Fit.Contain}
        style={{
          width: px,
          height: px,
          backgroundColor: "transparent",
        }}
        onError={handleError}
      />
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {riveView}
      </Pressable>
    );
  }

  return riveView;
}

export const LockeRive = React.memo(LockeRiveInner);
export default LockeRive;
