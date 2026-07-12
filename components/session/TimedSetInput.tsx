import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
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
    danger: string;
  };
  onComplete: (actualSeconds: number) => void;
  /** Called when the timer starts. `timerTarget` is 0 for countup mode. */
  onTimerStart?: (timerTarget: number) => void;
  /** Called each second while running. `remaining` is 0 in countup mode. */
  onTick?: (remaining: number, elapsed: number) => void;
  /** Called when the timer pauses, stops early, or auto-completes. */
  onTimerStop?: () => void;
};

type TimerState = "idle" | "running" | "paused" | "completed";

/* --- helpers --- */

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Preset options for the inline time picker */
const TIME_PRESETS = [10, 15, 20, 30, 45, 60, 90, 120];
const NUDGE_STEP = 5;

/* --- component --- */

function TimedSetInputInner({
  targetSeconds,
  completed,
  locked,
  isFutureSet,
  colors,
  onComplete,
  onTimerStart,
  onTick,
  onTimerStop,
}: Props) {
  const isCountup = targetSeconds === 0;
  const target = isCountup ? 0 : targetSeconds || 60;

  // Stable callback refs -- never cause effect re-runs
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onTimerStartRef = useRef(onTimerStart);
  onTimerStartRef.current = onTimerStart;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const onTimerStopRef = useRef(onTimerStop);
  onTimerStopRef.current = onTimerStop;

  const [timerState, setTimerState] = useState<TimerState>(
    completed ? "completed" : "idle"
  );
  const [remaining, setRemaining] = useState(isCountup ? 0 : target);
  const [adjustedTarget, setAdjustedTarget] = useState(isCountup ? 0 : target);
  const [actualElapsed, setActualElapsed] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Urgency pulse animation
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Sync target when it changes externally and timer is idle
  useEffect(() => {
    if (timerState === "idle" && !isCountup) {
      setAdjustedTarget(target);
      setRemaining(target);
    }
  }, [target, timerState, isCountup]);

  // Sync completed prop from parent
  useEffect(() => {
    if (completed && timerState !== "completed") {
      clearTimer();
      if ((timerState === "running" || timerState === "paused") && actualElapsed > 0) {
        onCompleteRef.current(actualElapsed);
      }
      setTimerState("completed");
    }
  }, [completed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Urgency pulse: when countdown has <= 3 seconds remaining
  useEffect(() => {
    if (!isCountup && timerState === "running" && remaining <= 3 && remaining > 0) {
      if (!pulseLoopRef.current) {
        pulseLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(pulseAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ])
        );
        pulseLoopRef.current.start();
      }
    } else {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
        pulseAnim.setValue(0);
      }
    }
  }, [timerState, remaining, isCountup, pulseAnim]);

  // Cleanup pulse on unmount
  useEffect(() => {
    return () => {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
      }
    };
  }, []);

  // Core timer
  useEffect(() => {
    if (timerState === "running") {
      startTimeRef.current = Date.now();

      if (isCountup) {
        // Count UP mode
        intervalRef.current = setInterval(() => {
          setActualElapsed((el) => {
            const next = el + 1;
            if (next % 10 === 0) impact(ImpactStyle.Light);
            onTickRef.current?.(0, next);
            return next;
          });
        }, 1000);
      } else {
        // Count DOWN mode
        intervalRef.current = setInterval(() => {
          setRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(intervalRef.current!);
              intervalRef.current = null;
              notification(NotificationType.Success);
              setActualElapsed((el) => {
                const finalElapsed = el + 1;
                onCompleteRef.current(finalElapsed);
                onTimerStopRef.current?.();
                return finalElapsed;
              });
              setTimerState("completed");
              return 0;
            }
            const next = prev - 1;
            if (next === 3) impact(ImpactStyle.Light);
            else if (next === 2) impact(ImpactStyle.Medium);
            else if (next === 1) impact(ImpactStyle.Heavy);
            setActualElapsed((el) => {
              const nextEl = el + 1;
              onTickRef.current?.(next, nextEl);
              return nextEl;
            });
            return next;
          });
        }, 1000);
      }
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

  /* --- actions --- */

  const handlePlay = useCallback(() => {
    if (completed || isFutureSet || locked) return;
    impact(ImpactStyle.Medium);
    if (timerState === "paused") {
      setTimerState("running");
    } else {
      setActualElapsed(0);
      if (!isCountup) setRemaining(adjustedTarget);
      onTimerStartRef.current?.(isCountup ? 0 : adjustedTarget);
      setTimerState("running");
    }
  }, [completed, isFutureSet, locked, adjustedTarget, timerState, isCountup]);

  const handlePause = useCallback(() => {
    impact(ImpactStyle.Light);
    clearTimer();
    onTimerStopRef.current?.();
    setTimerState("paused");
  }, [clearTimer]);

  const handleStop = useCallback(() => {
    impact(ImpactStyle.Medium);
    clearTimer();
    notification(NotificationType.Success);
    onCompleteRef.current(actualElapsed);
    onTimerStopRef.current?.();
    setTimerState("completed");
  }, [clearTimer, actualElapsed]);

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

  const handleNudge = useCallback(
    (delta: number) => {
      if (timerState !== "idle" || isCountup) return;
      impact(ImpactStyle.Light);
      setAdjustedTarget((prev) => {
        const next = Math.max(NUDGE_STEP, prev + delta);
        setRemaining(next);
        return next;
      });
    },
    [timerState, isCountup]
  );

  const togglePicker = useCallback(() => {
    if (timerState !== "idle" || isFutureSet || locked || isCountup) return;
    impact(ImpactStyle.Light);
    setShowPicker((prev) => !prev);
  }, [timerState, isFutureSet, locked, isCountup]);

  // Interpolated color for urgency pulse
  const urgencyColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary, colors.danger],
  });

  /* --- render: completed --- */

  if (timerState === "completed" || completed) {
    const displayTime = actualElapsed > 0 ? actualElapsed : (isCountup ? 0 : target);
    const ranFull = isCountup || actualElapsed >= adjustedTarget;
    return (
      <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
        <View style={styles.content}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          {ranFull || actualElapsed === 0 ? (
            // Full completion or externally marked complete: single green time
            <Text style={[styles.timeText, { color: colors.success }]}>
              {formatTime(displayTime)}
            </Text>
          ) : (
            // Stopped early: achieved / target in muted tones
            <>
              <Text style={[styles.timeText, { color: colors.text }]}>
                {formatTime(displayTime)}
              </Text>
              <Text style={[styles.subtargetText, { color: colors.muted }]}>
                / {formatTime(adjustedTarget)}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  /* --- render: future / locked --- */

  if (isFutureSet || locked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
        <View style={styles.content}>
          <Text style={[styles.timeText, { color: colors.muted }]}>
            {isCountup ? "Max" : formatTime(adjustedTarget)}
          </Text>
        </View>
      </View>
    );
  }

  /* --- render: running --- */

  if (timerState === "running") {
    if (isCountup) {
      // Countup running: show elapsed time + stop button
      return (
        <View
          style={[
            styles.container,
            styles.runningContainer,
            { backgroundColor: colors.mutedBg, borderColor: colors.primary },
          ]}
        >
          <Pressable onPress={handleStop} style={styles.runningContent}>
            <Ionicons name="stop" size={16} color={colors.primary} />
            <Text style={[styles.countdownText, { color: colors.primary }]}>
              {formatTime(actualElapsed)}
            </Text>
          </Pressable>
        </View>
      );
    }

    // Countdown running
    const elapsed = adjustedTarget - remaining;
    const progress = adjustedTarget > 0 ? elapsed / adjustedTarget : 0;
    const isUrgent = remaining <= 3 && remaining > 0;

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
          {isUrgent ? (
            <Animated.Text
              style={[styles.countdownText, { color: urgencyColor }]}
            >
              {formatTime(remaining)}
            </Animated.Text>
          ) : (
            <Text style={[styles.countdownText, { color: colors.primary }]}>
              {formatTime(remaining)}
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  /* --- render: paused --- */

  if (timerState === "paused") {
    if (isCountup) {
      return (
        <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
          <View style={styles.runningContent}>
            <Pressable onPress={handlePlay} style={styles.pausedBtnGroup}>
              <Ionicons name="play" size={16} color={colors.accent} />
              <Text style={[styles.countdownText, { color: colors.text }]}>
                {formatTime(actualElapsed)}
              </Text>
            </Pressable>
            <Pressable onPress={handleStop} hitSlop={8}>
              <Ionicons name="stop-circle" size={22} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      );
    }

    const elapsed = adjustedTarget - remaining;
    const progress = adjustedTarget > 0 ? elapsed / adjustedTarget : 0;

    return (
      <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.accent + "25",
              width: `${Math.min(progress * 100, 100)}%`,
            },
          ]}
        />
        <Pressable onPress={handlePlay} style={styles.runningContent}>
          <Ionicons name="play" size={16} color={colors.accent} />
          <Text style={[styles.countdownText, { color: colors.text }]}>
            {formatTime(remaining)}
          </Text>
        </Pressable>
      </View>
    );
  }

  /* --- render: idle --- */

  if (isCountup) {
    // Countup idle: play button + "Start" label
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: colors.mutedBg }]}>
          <View style={styles.idleContent}>
            <Pressable
              onPress={handlePlay}
              style={[styles.playBtn, { backgroundColor: colors.primary + "20" }]}
              hitSlop={8}
            >
              <Ionicons name="play" size={16} color={colors.primary} />
            </Pressable>
            <Text style={[styles.timeText, { color: colors.muted }]}>Start</Text>
          </View>
        </View>
      </View>
    );
  }

  // Countdown idle
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

          {/* Tappable time — opens preset picker */}
          <Pressable onPress={togglePicker} hitSlop={6} style={styles.idleTimeBtn}>
            <Text
              style={[
                styles.timeText,
                { color: colors.text },
              ]}
            >
              {formatTime(adjustedTarget)}
            </Text>
            <Ionicons
              name={showPicker ? "chevron-up" : "chevron-down"}
              size={12}
              color={colors.muted}
              style={{ marginLeft: 2 }}
            />
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

/* --- memo --- */

export const TimedSetInput = React.memo(TimedSetInputInner, (prev, next) => {
  return (
    prev.targetSeconds === next.targetSeconds &&
    prev.completed === next.completed &&
    prev.locked === next.locked &&
    prev.isFutureSet === next.isFutureSet &&
    prev.colors === next.colors
    // onComplete, onTimerStart, onTick, onTimerStop intentionally excluded -- stored in refs
  );
});

/* --- styles --- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    borderRadius: 10,
    height: 48,
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
    gap: 8,
    paddingHorizontal: 8,
  },
  idleTimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  runningContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  pausedBtnGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
