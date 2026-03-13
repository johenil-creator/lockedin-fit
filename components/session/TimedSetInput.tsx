import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { impact, ImpactStyle, notification, NotificationType } from "../../lib/haptics";

type Props = {
  targetSeconds: number; // from reps field (parsed)
  completed: boolean;
  locked: boolean;
  isFutureSet: boolean;
  colors: {
    primary: string;
    primaryText: string;
    text: string;
    muted: string;
    mutedBg: string;
    surface: string;
    success: string;
    accent: string;
  };
  onComplete: () => void;
};

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}`;
}

function TimedSetInputInner({
  targetSeconds,
  completed,
  locked,
  isFutureSet,
  colors,
  onComplete,
}: Props) {
  const [remaining, setRemaining] = useState(targetSeconds || 60);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when target changes
  useEffect(() => {
    if (!started) setRemaining(targetSeconds || 60);
  }, [targetSeconds, started]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Timer tick
  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            // Timer done
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            notification(NotificationType.Success);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining, onComplete]);

  const handlePlayPause = useCallback(() => {
    if (completed || isFutureSet || locked) return;
    impact(ImpactStyle.Light);
    if (!started) {
      setStarted(true);
      setRemaining(targetSeconds || 60);
    }
    setRunning((prev) => !prev);
  }, [completed, isFutureSet, locked, started, targetSeconds]);

  // Completed state
  if (completed) {
    return (
      <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text style={[styles.doneText, { color: colors.success }]}>
          {formatTime(targetSeconds || 60)}
        </Text>
      </View>
    );
  }

  // Future / locked
  if (isFutureSet || locked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
        <Text style={[styles.timeText, { color: colors.muted }]}>
          {formatTime(targetSeconds || 60)}
        </Text>
      </View>
    );
  }

  const progress = targetSeconds > 0 ? 1 - remaining / targetSeconds : 0;

  return (
    <Pressable
      onPress={handlePlayPause}
      style={[
        styles.container,
        {
          backgroundColor: running
            ? colors.primary + "20"
            : colors.mutedBg,
          borderWidth: running ? 1.5 : 0,
          borderColor: running ? colors.primary : "transparent",
        },
      ]}
    >
      <Ionicons
        name={running ? "pause" : "play"}
        size={16}
        color={running ? colors.primary : colors.accent}
      />
      <Text
        style={[
          styles.timeText,
          {
            color: running ? colors.primary : started ? colors.text : colors.text,
            fontWeight: running ? "800" : "600",
          },
        ]}
      >
        {started ? formatTime(remaining) : formatTime(targetSeconds || 60)}
      </Text>
    </Pressable>
  );
}

export const TimedSetInput = React.memo(TimedSetInputInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    height: 44,
    marginRight: 12,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  doneText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
