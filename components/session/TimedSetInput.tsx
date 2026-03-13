import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  impact,
  ImpactStyle,
  notification,
  NotificationType,
} from "../../lib/haptics";

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
  onComplete: (actualSeconds: number) => void;
};

type TimerState = "idle" | "running" | "completed";

/* ─── helpers ─── */

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Preset options for the inline time picker */
const TIME_PRESETS = [10, 15, 20, 30, 45, 60, 90, 120];

/* ─── component ─── */

function TimedSetInputInner({
  targetSeconds,
  completed,
  locked,
  isFutureSet,
  colors,
  onComplete,
}: Props) {
  const target = targetSeconds || 60;

  // Stable callback ref — never causes effect re-runs
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [timerState, setTimerState] = useState<TimerState>(
    completed ? "completed" : "idle"
  );
  const [remaining, setRemaining] = useState(target);
  const [adjustedTarget, setAdjustedTarget] = useState(target);
  const [actualElapsed, setActualElapsed] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Sync target when it changes externally and timer is idle
  useEffect(() => {
    if (timerState === "idle") {
      setAdjustedTarget(target);
      setRemaining(target);
    }
  }, [target, timerState]);

  // Sync completed prop from parent (e.g. checkmark tapped while running)
  useEffect(() => {
    if (completed && timerState !== "completed") {
      clearTimer();
      // If timer was running, record the actual elapsed time
      if (timerState === "running" && actualElapsed > 0) {
        onCompleteRef.current(actualElapsed);
      }
      setTimerState("completed");
    }
  }, [completed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Core timer — only depends on timerState
  useEffect(() => {
    if (timerState === "running") {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            // Timer finished naturally
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            notification(NotificationType.Success);
            setActualElapsed((el) => {
              const finalElapsed = el + 1;
              // Fire completion with full target (ran to zero)
              onCompleteRef.current(finalElapsed);
              return finalElapsed;
            });
            setTimerState("completed");
            return 0;
          }
          setActualElapsed((el) => el + 1);
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /* ─── actions ─── */

  const handlePlay = useCallback(() => {
    if (completed || isFutureSet || locked) return;
    impact(ImpactStyle.Medium);
    setActualElapsed(0);
    setRemaining(adjustedTarget);
    setTimerState("running");
  }, [completed, isFutureSet, locked, adjustedTarget]);

  const handlePause = useCallback(() => {
    impact(ImpactStyle.Light);
    clearTimer();
    setTimerState("idle");
    // Keep remaining where it was — user can resume by pressing play
    // (play resets; pause just stops)
  }, [clearTimer]);

  const handleTimeAdjust = useCallback(
    (seconds: number) => {
      if (timerState !== "idle") return;
      impact(ImpactStyle.Light);
      setAdjustedTarget(seconds);
      setRemaining(seconds);
      setShowPicker(false);
    },
    [timerState]
  );

  const togglePicker = useCallback(() => {
    if (timerState !== "idle" || isFutureSet || locked) return;
    impact(ImpactStyle.Light);
    setShowPicker((prev) => !prev);
  }, [timerState, isFutureSet, locked]);

  /* ─── render: completed ─── */

  if (timerState === "completed" || completed) {
    const displayTime = actualElapsed > 0 ? actualElapsed : target;
    const ranFull = actualElapsed >= adjustedTarget;
    return (
      <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
        <View style={styles.content}>
          <Text style={[styles.timeText, { color: colors.success }]}>
            {formatTime(displayTime)}
          </Text>
          {!ranFull && actualElapsed > 0 && (
            <Text style={[styles.subtargetText, { color: colors.muted }]}>
              / {formatTime(adjustedTarget)}
            </Text>
          )}
        </View>
      </View>
    );
  }

  /* ─── render: future / locked ─── */

  if (isFutureSet || locked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
        <View style={styles.content}>
          <Text style={[styles.timeText, { color: colors.muted }]}>
            {formatTime(adjustedTarget)}
          </Text>
        </View>
      </View>
    );
  }

  /* ─── render: running ─── */

  if (timerState === "running") {
    const elapsed = adjustedTarget - remaining;
    const progress = adjustedTarget > 0 ? elapsed / adjustedTarget : 0;

    return (
      <View
        style={[
          styles.container,
          styles.runningContainer,
          { backgroundColor: colors.mutedBg, borderColor: colors.primary },
        ]}
      >
        {/* Progress bar */}
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.primary + "35",
              width: `${Math.min(progress * 100, 100)}%`,
            },
          ]}
        />

        <Pressable onPress={handlePause} style={styles.runningContent}>
          <Ionicons name="pause" size={16} color={colors.primary} />
          <Text style={[styles.countdownText, { color: colors.primary }]}>
            {formatTime(remaining)}
          </Text>
        </Pressable>
      </View>
    );
  }

  /* ─── render: idle ─── */

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
        <View style={styles.idleContent}>
          {/* Play button */}
          <Pressable
            onPress={handlePlay}
            style={[styles.playBtn, { backgroundColor: colors.primary + "20" }]}
            hitSlop={8}
          >
            <Ionicons name="play" size={16} color={colors.primary} />
          </Pressable>

          {/* Tappable time — opens picker, does NOT start timer */}
          <Pressable onPress={togglePicker} hitSlop={4}>
            <Text
              style={[
                styles.timeText,
                {
                  color: colors.text,
                  textDecorationLine: "underline",
                  textDecorationColor: colors.muted,
                  textDecorationStyle: "dotted",
                },
              ]}
            >
              {formatTime(adjustedTarget)}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Inline time picker */}
      {showPicker && (
        <View
          style={[styles.pickerContainer, { backgroundColor: colors.surface }]}
        >
          {TIME_PRESETS.map((sec) => {
            const isSelected = sec === adjustedTarget;
            return (
              <Pressable
                key={sec}
                onPress={() => handleTimeAdjust(sec)}
                style={[
                  styles.pickerChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary + "30"
                      : colors.mutedBg,
                    borderColor: isSelected ? colors.primary : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pickerChipText,
                    {
                      color: isSelected ? colors.primary : colors.text,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {formatTime(sec)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ─── memo ─── */

export const TimedSetInput = React.memo(TimedSetInputInner, (prev, next) => {
  return (
    prev.targetSeconds === next.targetSeconds &&
    prev.completed === next.completed &&
    prev.locked === next.locked &&
    prev.isFutureSet === next.isFutureSet &&
    prev.colors === next.colors
    // onComplete intentionally excluded — stored in ref
  );
});

/* ─── styles ─── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    borderRadius: 10,
    height: 44,
    marginRight: 12,
    justifyContent: "center",
  },
  runningContainer: {
    borderWidth: 1.5,
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
  idleContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  runningContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  countdownText: {
    fontSize: 20,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  subtargetText: {
    fontSize: 12,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
    marginRight: 12,
    padding: 8,
    borderRadius: 10,
  },
  pickerChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerChipText: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
});
