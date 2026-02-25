/**
 * lockeMachine — minimal state machine for Locke's behavioural layer.
 *
 * Architecture
 * ─────────────
 *   LockeMachineEvent  →  transition()  →  LockeStateMachineState
 *                                               ↓
 *                                         toLockeState()  →  LockeState (visual)
 *                                         toAnimation()   →  animation preset name
 *                                         toSpeechTone()  →  LockeTrigger (reuses message bank)
 *
 * The machine is pure — no side effects, no async.
 * Persistence and context live in the calling hook.
 */

import type {
  LockeState,
  LockeTrigger,
  LockeStateMachineState,
  LockeMachineEvent,
  LockeMachineRecord,
} from "./types";

// ── Thresholds ────────────────────────────────────────────────────────────────

const SCORE_HIGH        = 70;   // weekScore ≥ this → encouraging
const SCORE_LOW         = 45;   // weekScore < this → challenging
const INACTIVITY_MILD   = 3;    // days without session → inactive_warning
const COOLDOWN_CELEBRATE = 6;   // hours before celebrating can re-fire

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoursSince(isoTimestamp: string): number {
  return (Date.now() - new Date(isoTimestamp).getTime()) / 3_600_000;
}

function isCelebrationCooledDown(record: LockeMachineRecord): boolean {
  if (record.state !== "celebrating") return true;
  return hoursSince(record.enteredAt) >= COOLDOWN_CELEBRATE;
}

function makeRecord(
  state: LockeStateMachineState,
  prev: LockeMachineRecord
): LockeMachineRecord {
  const sameState = prev.state === state;
  return {
    state,
    enteredAt:  sameState ? prev.enteredAt : new Date().toISOString(),
    eventCount: sameState ? prev.eventCount + 1 : 1,
  };
}

// ── Transition table ──────────────────────────────────────────────────────────

/**
 * Pure transition function.
 * Given the current record and an incoming event, returns the next record.
 * Returns the same record (reference-equal) if no transition occurs.
 */
export function transition(
  record: LockeMachineRecord,
  event: LockeMachineEvent
): LockeMachineRecord {
  const { state } = record;

  switch (event.type) {

    // ── WORKOUT_COMPLETE ──────────────────────────────────────────────────────
    case "WORKOUT_COMPLETE": {
      const { weekScore, daysSinceLastSession } = event;

      // Coming back after inactivity → always encouraging regardless of score
      if (daysSinceLastSession >= INACTIVITY_MILD) {
        return makeRecord("encouraging", record);
      }

      if (weekScore >= SCORE_HIGH) return makeRecord("encouraging", record);
      if (weekScore <  SCORE_LOW)  return makeRecord("challenging", record);

      // Mid-range: stay in current state unless idle or inactive_warning
      if (state === "idle" || state === "inactive_warning") {
        return makeRecord("encouraging", record);
      }
      return makeRecord(state, record);  // stay — no opinion at mid-range
    }

    // ── PR_ACHIEVED ───────────────────────────────────────────────────────────
    case "PR_ACHIEVED": {
      if (!isCelebrationCooledDown(record)) return record; // cooldown active
      return makeRecord("celebrating", record);
    }

    // ── INACTIVITY_THRESHOLD ──────────────────────────────────────────────────
    case "INACTIVITY_THRESHOLD": {
      // Already warning — escalate eventCount so message bank can pick harder lines
      if (state === "inactive_warning") return makeRecord("inactive_warning", record);
      // Was celebrating or encouraging — still needs the warning
      return makeRecord("inactive_warning", record);
    }

    // ── WEEKLY_SCORE_UPDATE ───────────────────────────────────────────────────
    case "WEEKLY_SCORE_UPDATE": {
      const { score } = event;
      if (score >= SCORE_HIGH) return makeRecord("encouraging", record);
      if (score <  SCORE_LOW)  return makeRecord("challenging", record);
      // Mid-range → return to idle (no strong signal either way)
      return makeRecord("idle", record);
    }

    // ── RANK_UP ───────────────────────────────────────────────────────────────
    case "RANK_UP": {
      // Rank-up always overrides cooldown — it's a genuine milestone
      return makeRecord("celebrating", record);
    }
  }
}

// ── Mood mapping ──────────────────────────────────────────────────────────────

/**
 * Maps behavioural state → LockeState (visual/SVG mood prop).
 */
export function toLockeState(state: LockeStateMachineState): LockeState {
  switch (state) {
    case "idle":             return "neutral";
    case "encouraging":      return "encouraging";
    case "challenging":      return "intense";
    case "celebrating":      return "celebrating";
    case "inactive_warning": return "disappointed";
  }
}

// ── Animation mapping ─────────────────────────────────────────────────────────

export type LockeAnimationPreset =
  | "breathe"          // idle — neutral breathing, no extra motion
  | "pulse_warm"       // encouraging — gentle scale + eye glow pulse
  | "arm_raise"        // intense — arm raised, brow down, danger rim
  | "celebrate"        // celebrating — quick jump, bright glow
  | "disappointed"     // inactive_warning — slow droop, ice rim
  | "onboarding_pulse";// onboarding_guide — warm steady pulse, friendly

/**
 * Maps behavioural state → animation preset name.
 * The Locke SVG layer reads this to decide which animation config to apply.
 */
export function toAnimationPreset(state: LockeStateMachineState): LockeAnimationPreset {
  switch (state) {
    case "idle":             return "breathe";
    case "encouraging":      return "pulse_warm";
    case "challenging":      return "arm_raise";
    case "celebrating":      return "celebrate";
    case "inactive_warning": return "disappointed";
  }
}

// ── Speech tone mapping ───────────────────────────────────────────────────────

/**
 * Maps behavioural state + originating event → LockeTrigger.
 * This feeds directly into the existing lockeMessages.ts pickMessage() call.
 * No new message infrastructure needed.
 */
export function toSpeechTrigger(
  state: LockeStateMachineState,
  event: LockeMachineEvent
): LockeTrigger {
  switch (state) {
    case "celebrating":
      return event.type === "RANK_UP" ? "rank_up" : "pr_hit";

    case "inactive_warning":
      return "inactivity";

    case "challenging":
      return event.type === "WEEKLY_SCORE_UPDATE" ? "low_performance" : "session_complete";

    case "encouraging":
      if (event.type === "WEEKLY_SCORE_UPDATE") return "high_performance";
      if (event.type === "WORKOUT_COMPLETE")    return "session_complete";
      return "streak_milestone";

    case "idle":
    default:
      return "session_complete";
  }
}

// ── Default record ────────────────────────────────────────────────────────────

export function defaultMachineRecord(): LockeMachineRecord {
  return {
    state:      "idle",
    enteredAt:  new Date().toISOString(),
    eventCount: 0,
  };
}

// ── Full reaction (convenience) ───────────────────────────────────────────────

/**
 * Single call that returns everything the UI needs:
 *   nextRecord  — persist this
 *   lockeState  — pass to <Locke mood={lockeState} />
 *   animation   — pass to animation layer
 *   trigger     — pass to pickMessage()
 */
export function react(
  record: LockeMachineRecord,
  event: LockeMachineEvent
): {
  nextRecord: LockeMachineRecord;
  lockeState: LockeState;
  animation:  LockeAnimationPreset;
  trigger:    LockeTrigger;
} {
  const nextRecord = transition(record, event);
  return {
    nextRecord,
    lockeState: toLockeState(nextRecord.state),
    animation:  toAnimationPreset(nextRecord.state),
    trigger:    toSpeechTrigger(nextRecord.state, event),
  };
}
