import React, { useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

type TimedHoldOverlayProps = {
  visible: boolean;
  exerciseName: string;
  remaining: number;
  elapsed: number;
  target: number;
  onDismiss: () => void;
  colors: {
    primary: string;
    primaryText: string;
    text: string;
    muted: string;
    bg: string;
    success: string;
    danger: string;
  };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH - 80;

const MOTIVATIONAL_TIPS = [
  'Stay tight.',
  'Lock it in.',
  'Eyes forward.',
  'Breathe steady.',
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const TimedHoldOverlay = React.memo(function TimedHoldOverlay({
  visible,
  exerciseName,
  remaining,
  elapsed,
  target,
  onDismiss,
  colors,
}: TimedHoldOverlayProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCountup = target === 0;
  const isComplete = !isCountup && remaining === 0;
  const isPulsing = !isCountup && remaining > 0 && remaining <= 3;
  const progress = target > 0 ? Math.min(elapsed / target, 1) : 0;

  const tip = useMemo(() => {
    return MOTIVATIONAL_TIPS[exerciseName.length % MOTIVATIONAL_TIPS.length];
  }, [exerciseName]);

  // Pulse animation for last 3 seconds
  useEffect(() => {
    if (isPulsing) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 220, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPulsing, pulseAnim]);

  // Auto-dismiss 1 second after completion
  useEffect(() => {
    if (isComplete && visible) {
      autoDismissRef.current = setTimeout(onDismiss, 1000);
      return () => { if (autoDismissRef.current) clearTimeout(autoDismissRef.current); };
    }
  }, [isComplete, visible, onDismiss]);

  const accentColor = isComplete ? colors.success : isPulsing ? colors.danger : colors.primary;
  const displayTime = isCountup ? elapsed : remaining;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={[styles.container, { backgroundColor: colors.bg }]}>

          {/* Exercise name */}
          <View style={styles.topSection}>
            <Text style={[styles.exerciseName, { color: colors.muted }]} numberOfLines={2}>
              {exerciseName.toUpperCase()}
            </Text>
          </View>

          {/* Giant time display */}
          <View style={styles.centerSection}>
            {isComplete ? (
              <>
                <Text style={[styles.checkmark, { color: colors.success }]}>✓</Text>
                <Text style={[styles.completeLabel, { color: colors.success }]}>COMPLETE</Text>
              </>
            ) : (
              <>
                <Animated.Text
                  style={[styles.timeDisplay, { color: accentColor, opacity: pulseAnim }]}
                >
                  {formatTime(displayTime)}
                </Animated.Text>
                {!isCountup && (
                  <Text style={[styles.targetLabel, { color: colors.muted }]}>
                    {'/ ' + formatTime(target)}
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Progress bar */}
          {!isCountup && !isComplete && (
            <View style={styles.progressSection}>
              <View style={[styles.progressTrack, { backgroundColor: colors.muted + '22' }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: accentColor, width: `${progress * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Motivational tagline */}
          {!isComplete && (
            <Text style={[styles.tagline, { color: colors.muted }]}>{tip}</Text>
          )}

          {/* Bottom hint */}
          <View style={styles.bottomSection}>
            <View style={[styles.swipeIndicator, { backgroundColor: colors.muted + '44' }]} />
            <Text style={[styles.hintText, { color: colors.muted }]}>Tap anywhere to return</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topSection: {
    position: 'absolute',
    top: '12%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    fontSize: 96,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    lineHeight: 104,
  },
  targetLabel: {
    fontSize: 20,
    fontWeight: '400',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  checkmark: {
    fontSize: 80,
    fontWeight: '700',
    lineHeight: 88,
  },
  completeLabel: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 6,
    marginTop: 8,
  },
  progressSection: {
    marginTop: 40,
    width: BAR_WIDTH,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  tagline: {
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '400',
    letterSpacing: 0.5,
    marginTop: 32,
  },
  bottomSection: {
    position: 'absolute',
    bottom: '8%',
    alignItems: 'center',
    gap: 10,
  },
  swipeIndicator: {
    width: 36,
    height: 3,
    borderRadius: 2,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});
