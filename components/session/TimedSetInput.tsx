import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { impact, ImpactStyle, notification, NotificationType } from "../../lib/haptics";

type Props = {
  targetSeconds: number;
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
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `0:${s.toString().padStart(2, "0")}`;
}

function TimedSetInputInner({
  targetSeconds,
  completed,
  locked,
  isFutureSet,
  colors,
  onComplete,
}: Props) {
  const target = targetSeconds || 60;

  // Use refs to keep timer logic stable across parent re-renders
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [remaining, setRemaining] = useState(target);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  // Sync target when it changes externally (and timer hasn't started)
  useEffect(() => {
    if (!started) setRemaining(target);
  }, [target, started]);

  // Core timer - only depends on `running`, uses refs for everything else
  useEffect(() => {
    if (running) {
      runningRef.current = true;
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            runningRef.current = false;
            setRunning(false);
            notification(NotificationType.Success);
            // Use ref so this callback never causes effect re-runs
            onCompleteRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      runningRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  const handlePlayPause = useCallback(() => {
    if (completed || isFutureSet || locked) return;
    impact(ImpactStyle.Light);
    if (!started) {
      setStarted(true);
      setRemaining(target);
    }
    setRunning((prev) => !prev);
  }, [completed, isFutureSet, locked, started, target]);

  // Completed state
  if (completed) {
    return (
      <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text style={[styles.timeText, { color: colors.success }]}>
          {formatTime(target)}
        </Text>
      </View>
    );
  }

  // Future / locked
  if (isFutureSet || locked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
        <Text style={[styles.timeText, { color: colors.muted }]}>
          {formatTime(target)}
        </Text>
      </View>
    );
  }

  const elapsed = target - remaining;
  const progress = target > 0 ? elapsed / target : 0;

  return (
    <Pressable onPress={handlePlayPause} style={[styles.container, { backgroundColor: colors.mutedBg }]}>
      {/* Progress bar background */}
      {started && (
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: running ? colors.primary + "30" : colors.accent + "25",
              width: `${Math.min(progress * 100, 100)}%`,
            },
          ]}
        />
      )}
      {/* Content */}
      <View style={styles.content}>
        <Ionicons
          name={running ? "pause" : "play"}
          size={18}
          color={running ? colors.primary : colors.accent}
        />
        <Text
          style={[
            styles.timeText,
            {
              color: running ? colors.primary : colors.text,
              fontWeight: running ? "800" : "600",
              fontSize: running ? 18 : 16,
            },
          ]}
        >
          {started ? formatTime(remaining) : formatTime(target)}
        </Text>
      </View>
    </Pressable>
  );
}

export const TimedSetInput = React.memo(TimedSetInputInner, (prev, next) => {
  // Custom comparison — ignore onComplete reference changes
  return (
    prev.targetSeconds === next.targetSeconds &&
    prev.completed === next.completed &&
    prev.locked === next.locked &&
    prev.isFutureSet === next.isFutureSet &&
    prev.colors === next.colors
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    borderRadius: 10,
    height: 44,
    marginRight: 12,
  },
  progressBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
