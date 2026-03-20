import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import type { EmoteId } from "../../lib/types";

const EMOTE_EMOJIS: Record<EmoteId, string> = {
  howl: "\uD83D\uDC3A",
  flex: "\uD83D\uDCAA",
  meditate: "\uD83E\uDDD8",
  sprint: "\uD83C\uDFC3",
  celebrate: "\uD83C\uDF89",
  challenge: "\u2694\uFE0F",
};

type Props = {
  emoteId: EmoteId;
  onComplete?: () => void;
};

function EmoteReactionInner({ emoteId, onComplete }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Fade in + scale up
    opacity.value = withSequence(
      withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
      withDelay(800, withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }))
    );

    scale.value = withSequence(
      withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 }),
      withDelay(600, withTiming(0.5, { duration: 400 }))
    );

    // Fire onComplete after animation
    const timeout = setTimeout(() => {
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timeout);
  }, [emoteId]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Animated.Text style={styles.emoji}>{EMOTE_EMOJIS[emoteId]}</Animated.Text>
    </Animated.View>
  );
}

export const EmoteReaction = React.memo(EmoteReactionInner);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  emoji: {
    fontSize: 64,
  },
});
