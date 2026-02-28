/**
 * Locke — composed mascot component.
 * Combines LockeSVG (shapes) + useLockeAnimation (motion) + optional speech bubble.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from "react-native";
import { LockeSVG } from "./LockeSVG";
import { useLockeAnimation } from "./useLockeAnimation";
import type { LockeMood } from "./LockeSVG";
import type { RankKey } from "./lockeTokens";
import { SIZE } from "./lockeTokens";
import { useAppTheme } from "../../contexts/ThemeContext";
import type { LockeAnimationPreset } from "../../lib/lockeMachine";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LockeProps {
  size?:            "icon" | "full";
  mood?:            LockeMood;
  rank?:            RankKey;
  animationPreset?: LockeAnimationPreset;
  message?:         string;
  onPress?:         () => void;
  style?:           ViewStyle;
}

// ── Speech Bubble ─────────────────────────────────────────────────────────────

function SpeechBubble({ message, mood }: { message: string; mood: LockeMood }) {
  const { theme } = useAppTheme();

  const borderColor =
    mood === "celebrating"   ? theme.colors.primary :
    mood === "intense"       ? theme.colors.danger   :
    mood === "encouraging"   ? theme.colors.primary  :
    mood === "onboarding_guide" ? theme.colors.primary :
                               theme.colors.border;

  return (
    <View style={[styles.bubble, { backgroundColor: theme.colors.surface, borderColor }]}>
      {/* Tail pointer */}
      <View style={[styles.bubbleTail, { borderBottomColor: theme.colors.surface }]} />
      <Text style={[styles.bubbleText, { color: theme.colors.text }]}>
        {message}
      </Text>
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Locke({
  size            = "full",
  mood            = "neutral",
  rank            = "runt",
  animationPreset,
  message,
  onPress,
  style,
}: LockeProps) {
  const canvasSize = SIZE[size].canvas;

  const {
    bodyAnimProps,
    eyelidAnimProps,
    browAnimProps,
    armAnimProps,
    tailAnimProps,
    glowAnimProps,
    rimAnimProps,
  } = useLockeAnimation(mood, rank, animationPreset);

  const content = (
    <View style={[styles.container, style]}>
      <LockeSVG
        size={size}
        mood={mood}
        rank={rank}
        bodyAnimProps={bodyAnimProps}
        eyelidAnimProps={eyelidAnimProps}
        browAnimProps={browAnimProps}
        armAnimProps={armAnimProps}
        tailAnimProps={tailAnimProps}
        glowAnimProps={glowAnimProps}
        rimAnimProps={rimAnimProps}
      />
      {message && size === "full" && (
        <SpeechBubble message={message} mood={mood} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[{ width: canvasSize }, style]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  bubble: {
    marginTop:    10,
    borderRadius: 12,
    borderWidth:  1.5,
    paddingHorizontal: 14,
    paddingVertical:   10,
    maxWidth:     220,
    position:     "relative",
  },
  bubbleTail: {
    position:         "absolute",
    top:              -8,
    left:             "50%",
    marginLeft:       -7,
    borderLeftWidth:  7,
    borderRightWidth: 7,
    borderBottomWidth:8,
    borderLeftColor:  "transparent",
    borderRightColor: "transparent",
    // borderBottomColor set inline
  },
  bubbleText: {
    fontSize:   14,
    lineHeight: 20,
    fontWeight: "500",
    textAlign:  "center",
  },
});
