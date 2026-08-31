/**
 * lib/watchSession.ts — TypeScript API for the WatchSession native module.
 *
 * Wraps the RN NativeModule so the session screen can push workout state to
 * the Apple Watch and receive set-complete / skip-rest commands from it.
 *
 * All calls are no-ops on Android or when WatchConnectivity is unavailable.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { WatchSession: _native } = NativeModules;
console.log('[WatchSession] native module loaded:', !!_native, 'platform:', Platform.OS);

// NativeEventEmitter is required so that addListener() increments the native
// module's internal listener count, enabling sendEventWithName: to actually fire.
// DeviceEventEmitter bypasses this and causes all native events to be silently dropped.
const _emitter: NativeEventEmitter | null =
  Platform.OS === 'ios' && _native ? new NativeEventEmitter(_native) : null;

// ── Types ─────────────────────────────────────────────────────────────────────

export type WatchWorkoutState = {
  /** Display name of the active exercise. */
  exerciseName: string;
  /** 0-based index of the current (next to complete) set. */
  setIndex: number;
  /** Total number of sets for this exercise (including warmups). 0 = cardio session. */
  totalSets: number;
  /** 0-based index of the current exercise in the workout. */
  exerciseIndex?: number;
  /** Total number of exercises in the workout. */
  totalExercises?: number;
  /** Target rep range string, e.g. "8-10" or "8". */
  targetReps: string;
  /** Target weight. 0 means bodyweight. */
  targetWeight: number;
  /** "lb" or "kg" — shown next to weight on Watch. */
  weightUnit: 'lb' | 'kg';
  /**
   * Virtual start timestamp (Unix seconds) = Date.now()/1000 - elapsedSec.
   * Watch computes elapsed = now - cardioVirtualStartAt, eliminating counter drift.
   * Recomputed on every sync so any drift self-corrects within one interval.
   * Not sent when paused — Watch freezes on cardioElapsedSec instead.
   */
  cardioVirtualStartAt?: number;
  /** Live active calorie estimate — sent periodically during cardio. */
  cardioCalories?: number;
  /** Live distance estimate in km — sent periodically during cardio. */
  cardioDistanceKm?: number;
  /** Whether the cardio session is currently paused. */
  cardioIsPaused?: boolean;
  /** Current elapsed seconds — sent on pause/resume so Watch stays in sync. */
  cardioElapsedSec?: number;
  /**
   * Millisecond-accurate elapsed at pause. Watch uses this instead of
   * cardioElapsedSec (integer seconds) to anchor virtualStartAt on resume,
   * preventing up to 1 s of skew between Watch and iPhone timers.
   */
  cardioElapsedMs?: number;
  /**
   * Cardio modality string (e.g. "walking", "running"). Sent once at session
   * start so the Watch can activate CMPedometer for step-based distance tracking.
   */
  cardioModality?: string;
  /** Explicit cardio flag — avoids fragile totalSets == 0 discriminator on Watch. */
  isCardio?: boolean;
  /** True when the current set is a warm-up set. */
  isWarmUp?: boolean;
  /** Which side for unilateral exercises ("L" or "R"). Omitted for bilateral. */
  side?: 'L' | 'R';
  /** Coach notes / cues for the current exercise. */
  notes?: string;
  /** True when the current exercise is timed (plank, hold, etc.). */
  isTimed?: boolean;
  /** Target hold duration in seconds. 0 = open-ended countup ("max"). */
  timerTarget?: number;
  /**
   * Unix seconds when the timer started on the iPhone.
   * 0 = timer not yet started (idle/pre-start state).
   * Watch computes elapsed = now - timerStartedAt via TimelineView.
   */
  timerStartedAt?: number;
  /** True when the Watch should show estimate input (1RM test between lifts). */
  isAwaitingEstimate?: boolean;
};

// ── API ───────────────────────────────────────────────────────────────────────

export const watchSession = {
  /** True when the native module is loaded (iOS + Watch framework linked). */
  get isAvailable(): boolean {
    return Platform.OS === 'ios' && !!_native;
  },

  /**
   * Push the current exercise / set info to the Watch.
   * Call this when the active exercise changes or a set is completed.
   */
  sendWorkoutState(state: WatchWorkoutState): void {
    if (!this.isAvailable) return;
    _native.sendWorkoutState(state);
  },

  /**
   * Notify the Watch that a rest timer has started.
   * The Watch will run its own local countdown from `restTotal` seconds.
   */
  sendRestStart(restTotal: number): void {
    if (!this.isAvailable) return;
    _native.sendRestStart(restTotal);
  },

  /** Tell the Watch to clear its rest timer (iPhone dismissed it). */
  sendRestDone(): void {
    if (!this.isAvailable || !_native.sendRestDone) return;
    _native.sendRestDone();
  },

  /** Clear the Watch display when the workout session ends. */
  endWorkout(): void {
    if (!this.isAvailable) return;
    _native.endWorkout();
  },

  /** Tell the Watch all exercises are done — shows the completion prompt. */
  sendSessionComplete(options?: { completionLabel?: string }): void {
    if (!this.isAvailable || !_native.sendSessionComplete) return;
    _native.sendSessionComplete(options ?? {});
  },

  /** Tell the Watch to show the "Update Plan Weights?" prompt. */
  sendWeightUpdatePrompt(): void {
    if (!this.isAvailable || !_native.sendWeightUpdatePrompt) return;
    _native.sendWeightUpdatePrompt();
  },

  /**
   * Subscribe to "Set Done" taps from the Watch.
   * Returns an unsubscribe function — call it in useEffect cleanup.
   */
  onSetDone(handler: () => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchSetDone', handler);
    return () => sub.remove();
  },

  /**
   * Subscribe to "Skip Rest" taps from the Watch.
   * Returns an unsubscribe function.
   */
  onSkipRest(handler: () => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchSkipRest', handler);
    return () => sub.remove();
  },

  /** Subscribe to "Pause" taps from the Watch during cardio. */
  onCardioPause(handler: () => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchCardioPause', handler);
    return () => sub.remove();
  },

  /** Subscribe to "Resume" taps from the Watch during cardio. */
  onCardioResume(handler: () => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchCardioResume', handler);
    return () => sub.remove();
  },

  /** Subscribe to "End Session" taps from the Watch during cardio. */
  onCardioEnd(handler: () => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchCardioEnd', handler);
    return () => sub.remove();
  },

  /** Subscribe to "End Session" taps from the Watch after all exercises complete. */
  onEndSession(handler: () => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchEndSession', handler);
    return () => sub.remove();
  },

  /**
   * Subscribe to real pedometer data streamed from Apple Watch CMPedometer.
   * Fires whenever the Watch has a new step/distance reading (roughly every 1–2 s
   * while walking/running). Only fires for modalities that support step counting.
   */
  onPedometerUpdate(
    handler: (data: { distanceKm: number; steps: number; paceSecPerKm?: number }) => void
  ): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchPedometerUpdate', handler);
    return () => sub.remove();
  },

  /** Subscribe to weight adjustment from the Watch (+/- delta). */
  onAdjustWeight(handler: (data: { delta: number }) => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchAdjustWeight', handler);
    return () => sub.remove();
  },

  /** Subscribe to reps adjustment from the Watch (+/- delta). */
  onAdjustReps(handler: (data: { delta: number }) => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchAdjustReps', handler);
    return () => sub.remove();
  },

  /** Subscribe to 1RM estimate submission from Watch keypad. */
  onSubmitEstimate(handler: (data: { value: string }) => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchSubmitEstimate', handler);
    return () => sub.remove();
  },

  /** Subscribe to "Update Weights" tap from the Watch. */
  onUpdateWeights(handler: () => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchUpdateWeights', handler);
    return () => sub.remove();
  },

  /** Subscribe to "Skip" tap on the weight update prompt from the Watch. */
  onSkipUpdateWeights(handler: () => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchSkipUpdateWeights', handler);
    return () => sub.remove();
  },

  /** Subscribe to "Start Timer" tap from the Watch for timed exercises. */
  onStartTimer(handler: () => void): () => void {
    if (!_emitter) return () => {};
    const sub = _emitter.addListener('WatchStartTimer', handler);
    return () => sub.remove();
  },
};
