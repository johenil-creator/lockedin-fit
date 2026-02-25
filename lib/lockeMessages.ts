import type { LockeState, LockeTrigger, RankLevel } from "./types";

// ── Message bank ──────────────────────────────────────────────────────────────
// Each entry is keyed by trigger, then state.
//
// Tone guide (6 states):
//   neutral          — direct, matter-of-fact. No hype, no mockery.
//   encouraging      — confident warmth. Earned, not empty.
//   celebrating      — terse acknowledgment of genuine achievement.
//   disappointed     — sharp but not cruel. The truth.
//   intense          — competitive, hard-edged, pushing.
//   onboarding_guide — clear, welcoming, no-nonsense orientation.

type MessageSet = Partial<Record<LockeState, string[]>>;

const MESSAGES: Partial<Record<LockeTrigger, MessageSet>> = {

  session_complete: {
    neutral: [
      "Session logged.",
      "Done. Next one's already scheduled.",
      "Work recorded.",
      "That's in the books.",
      "Numbers are in.",
    ],
    encouraging: [
      "Solid. Now recover properly.",
      "That was real work.",
      "Consistent. Keep it.",
      "You earned that.",
      "Strong session.",
    ],
    celebrating: [
      "Dominant session.",
      "That's the standard now.",
      "Everything clicked. Don't waste the momentum.",
      "Week like that builds something.",
    ],
    disappointed: [
      "You finished. Barely counts.",
      "Half-efforts don't build anything.",
      "The bar's on the floor. Pick it up next time.",
    ],
    intense: [
      "You barely showed up. Do better.",
      "Mediocre is a choice. You made it.",
      "The work didn't wait for you.",
    ],
    onboarding_guide: [
      "First session done. Keep the momentum.",
      "That's a start. Build on it.",
    ],
  },

  pr_hit: {
    neutral: [
      "New record. Logged.",
      "PR on the board.",
      "Standard updated.",
      "That number's yours now.",
      "Record set.",
    ],
    encouraging: [
      "PR. No fluke.",
      "Hard-earned.",
      "That one counted.",
      "New ceiling.",
    ],
    celebrating: [
      "That's a real number.",
      "New ceiling. Respect.",
      "PR detected. Lock it in.",
      "That's the one.",
    ],
    disappointed: [
      "PR, but the consistency isn't there yet.",
      "Good lift. Now show up more.",
    ],
    intense: [
      "One PR doesn't define you. Hit it again.",
      "New floor. Now what?",
      "Good. Now do it again next week.",
    ],
    onboarding_guide: [
      "New personal record. That's what calibration is for.",
      "PR already. Good start.",
    ],
  },

  streak_milestone: {
    neutral: [
      "Streak active.",
      "Consistency logged.",
      "Days stacking.",
      "Pattern established.",
    ],
    encouraging: [
      "Streak is earned.",
      "Discipline. Plain and simple.",
      "Consistent. Dangerous.",
      "That's what separates.",
    ],
    celebrating: [
      "The pack sees it.",
      "That streak has weight.",
      "Unbroken. Keep it that way.",
    ],
    disappointed: [
      "Streaks end. Don't let yours.",
      "It's just days. Make them count.",
    ],
    intense: [
      "Consistent but are you progressing?",
      "Don't confuse showing up with getting better.",
      "Numbers are easy to fake. Results aren't.",
    ],
    onboarding_guide: [
      "You're building a habit. Keep going.",
      "Showing up. That's the first step.",
    ],
  },

  inactivity: {
    neutral: [
      "You've been gone a while.",
      "Absence noted.",
      "Log shows nothing recent.",
      "Gap detected.",
    ],
    encouraging: [
      "You're back. Prove it wasn't a fluke.",
      "Rest is fine. Now move.",
      "Back in the gym. Show it means something.",
    ],
    celebrating: [],
    disappointed: [
      "Three days. What happened?",
      "You went quiet. Excuses or reasons — doesn't matter.",
      "Streak's dead. You buried it.",
      "Was it worth missing?",
      "Everyone's still training. You rested.",
      "Gap like that has a cost. You'll feel it.",
    ],
    intense: [
      "The work didn't wait for you.",
      "Everyone else kept going.",
      "Absence isn't rest. It's retreat.",
    ],
    onboarding_guide: [
      "You've been away. Pick it back up.",
      "Come back. The log's waiting.",
    ],
  },

  rank_up: {
    neutral: [
      "Rank updated.",
      "New rank logged.",
      "Level recorded.",
    ],
    encouraging: [
      "Rank up. You built that.",
      "New tier. Higher standards now.",
      "Earned it.",
    ],
    celebrating: [
      "The pack recognizes.",
      "That rank has weight. Carry it.",
      "Apex doesn't forget where you started.",
      "Rank up. Lock it in.",
    ],
    disappointed: [],
    intense: [
      "New rank. Higher standards now. Don't slide.",
      "Title changed. Work hasn't.",
    ],
    onboarding_guide: [
      "Rank unlocked. Keep climbing.",
    ],
  },

  onboarding: {
    neutral: [
      "Set your numbers. We'll use them.",
      "Establish your baseline.",
      "Starting point logged. Let's see where this goes.",
      "Numbers first. Everything else follows.",
    ],
    encouraging: [
      "Good start. Now let's calibrate properly.",
      "Baseline set. We'll build from here.",
    ],
    celebrating: [],
    disappointed: [],
    intense: [
      "Don't lowball your 1RM. You'll only cheat yourself.",
      "Be honest with the numbers. Locke doesn't forget.",
    ],
    onboarding_guide: [
      "Let's calibrate. These numbers matter.",
      "Set your baseline. Everything builds from here.",
      "Honest numbers, honest training.",
      "Your 1RM is your starting line.",
    ],
  },

  "1rm_test": {
    neutral: [
      "1RM test initiated.",
      "Calibration in progress.",
    ],
    encouraging: [
      "Warm up clean. Work up steady.",
      "Trust the protocol.",
    ],
    celebrating: [
      "Numbers confirmed. Lock them in.",
    ],
    disappointed: [],
    intense: [
      "Lock in. Every rep counts.",
      "This is calibration. Treat it like a real session.",
      "No sandbagging. Real numbers only.",
      "Let's see what you've got.",
    ],
    onboarding_guide: [
      "Follow the protocol. Warm up, build up, go.",
      "This is how we set your baseline.",
    ],
  },

  low_performance: {
    neutral: [
      "Below average week.",
      "Numbers are down.",
      "Weak output this week.",
    ],
    encouraging: [
      "Down week. Everyone gets one. Don't make it two.",
      "Not your best. Fix it next week.",
    ],
    celebrating: [],
    disappointed: [
      "That score is soft. You know it.",
      "Sub-par week. No other way to say it.",
      "The numbers don't lie. You phoned it in.",
      "Everyone has off weeks. This one was yours. Don't make it a habit.",
    ],
    intense: [
      "That's not good enough and you know it.",
      "Weak output. No excuses.",
      "This is the floor. Don't stay here.",
    ],
    onboarding_guide: [
      "Rough week. Stay consistent and it evens out.",
    ],
  },

  high_performance: {
    neutral: [
      "Strong week on the board.",
      "High output logged.",
      "Above average. Keep it.",
    ],
    encouraging: [
      "Consistent. Keep it that way.",
      "Strong week. Build on it.",
      "That's the standard. Repeat it.",
    ],
    celebrating: [
      "Top of the pack this week.",
      "Dominant. That's the standard now.",
      "Week like that builds a legacy.",
      "That's an Alpha week.",
      "Respect. Don't waste the momentum.",
    ],
    disappointed: [],
    intense: [
      "Strong week. Raise the bar.",
      "Good numbers. Now chase better ones.",
    ],
    onboarding_guide: [
      "Strong start. Build the habit.",
    ],
  },

};

// ── Rank-specific suffix lines (optional, appended sometimes) ────────────────

export const RANK_CALLOUTS: Partial<Record<RankLevel, string>> = {
  Runt:     "You're at the bottom. Earn your way up.",
  Scout:    "You're moving. Don't stop.",
  Stalker:  "Patient. Calculated. Keep going.",
  Hunter:   "You hunt. Now prove it.",
  Sentinel: "The pack watches you now.",
  Alpha:    "Lead by example or lose the title.",
  Apex:     "Top of the ladder. The only way is maintenance.",
};

// ── Selector ──────────────────────────────────────────────────────────────────

/**
 * Pick a message for the given trigger + state combination.
 * Falls back to neutral pool if the requested state has no messages.
 */
export function pickMessage(trigger: LockeTrigger, state: LockeState): string {
  const bank = MESSAGES[trigger];
  if (!bank) return "Log it and move on.";

  const pool = bank[state]?.length ? bank[state]! : (bank.neutral ?? []);
  if (!pool.length) return "Log it and move on.";

  return pool[Math.floor(Math.random() * pool.length)];
}
