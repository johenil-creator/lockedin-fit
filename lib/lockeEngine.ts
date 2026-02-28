/**
 * lockeEngine — thin adapter between app call sites and lockeMachine.
 *
 * Existing API is preserved exactly. Internal resolution now delegates
 * to lockeMachine so state, animation, and tone stay in sync.
 */

import type { LockeState, LockeTrigger, RankLevel, LockeMachineEvent, LockeMachineRecord } from "./types";
import { defaultMachineRecord, react } from "./lockeMachine";
import { pickMessage } from "./lockeMessages";

// ── Context passed to the engine (unchanged public API) ──────────────────────

export type LockeContext = {
  trigger:               LockeTrigger;
  streakDays?:           number;
  weekScore?:            number;
  daysSinceLastSession?: number;
  rank?:                 RankLevel;
  isPR?:                 boolean;
};

export type LockeOutput = {
  state:     LockeState;
  message:   string;
  animation: import("./lockeMachine").LockeAnimationPreset;
};

// ── Map trigger → machine event ───────────────────────────────────────────────

function toMachineEvent(ctx: LockeContext): LockeMachineEvent {
  const { trigger, weekScore = 50, daysSinceLastSession = 0 } = ctx;

  switch (trigger) {
    case "session_complete":
      return { type: "WORKOUT_COMPLETE", weekScore, daysSinceLastSession };

    case "pr_hit":
      return { type: "PR_ACHIEVED" };

    case "rank_up":
      return { type: "RANK_UP" };

    case "inactivity":
      return { type: "INACTIVITY_THRESHOLD", daysSince: daysSinceLastSession };

    case "high_performance":
      return { type: "WEEKLY_SCORE_UPDATE", score: weekScore };

    case "low_performance":
      return { type: "WEEKLY_SCORE_UPDATE", score: weekScore < 45 ? weekScore : 30 };

    case "streak_milestone":
      // Treat as a mid-high session
      return { type: "WORKOUT_COMPLETE", weekScore: weekScore ?? 65, daysSinceLastSession: 0 };

    default:
      return { type: "WORKOUT_COMPLETE", weekScore: 50, daysSinceLastSession: 0 };
  }
}

// ── Main engine call (public API unchanged) ───────────────────────────────────

/**
 * Given a context, determine Locke's state, animation, and message.
 * Call sites pass the same LockeContext they always have — nothing changes upstream.
 */
/**
 * @param ctx     — trigger context (same API as before)
 * @param record  — persisted machine record from LockeContext; falls back to
 *                  a fresh idle record when not provided (stateless callers).
 * @returns { state, animation, message, nextRecord }
 *          Callers that persist state should save nextRecord back to storage.
 */
export function lockeReact(
  ctx: LockeContext,
  record?: LockeMachineRecord
): LockeOutput & { nextRecord: LockeMachineRecord } {
  const existing = record ?? defaultMachineRecord();

  // Bypass triggers: fixed visual state, no machine transition
  if (ctx.trigger === "onboarding") {
    const message = pickMessage("onboarding", "onboarding_guide");
    return { state: "onboarding_guide", animation: "onboarding_pulse", message, nextRecord: existing };
  }
  if (ctx.trigger === "1rm_test") {
    const message = pickMessage("1rm_test", "intense");
    return { state: "intense", animation: "arm_raise", message, nextRecord: existing };
  }

  const event = toMachineEvent(ctx);
  const { lockeState, animation, trigger, nextRecord } = react(existing, event);
  const message = pickMessage(trigger, lockeState);
  return { state: lockeState, animation, message, nextRecord };
}
