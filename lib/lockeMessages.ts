import type { LockeState, LockeTrigger } from "./types";

// ── Message bank ──────────────────────────────────────────────────────────────
// Each entry is keyed by trigger, then state.
//
// Tone guide (10 states):
//   neutral          — direct, matter-of-fact. No hype, no mockery.
//   encouraging      — confident warmth. Earned, not empty.
//   celebrating      — terse acknowledgment of genuine achievement.
//   disappointed     — sharp but not cruel. The truth.
//   intense          — competitive, hard-edged, pushing.
//   savage           — ruthless alpha energy. Brutal honesty.
//   focused          — dialed-in precision. Calm but locked in.
//   concerned        — worried but caring. Flags risk, suggests caution.
//   proud            — quietly satisfied. Genuine respect for consistency.
//   analytical       — data-driven, observing. Studying the numbers.
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
    focused: [
      "Controlled execution. That's how you peak.",
      "Clean session. Every rep intentional.",
      "Precision over volume. Smart work.",
    ],
    concerned: [
      "You pushed through, but watch the fatigue.",
      "Session done. But your body's flagging — listen to it.",
      "Logged, but recovery needs to come first now.",
    ],
    proud: [
      "Another one. The habit is the weapon.",
      "Consistent as clockwork. Respect.",
      "You keep showing up. That's the difference.",
    ],
    analytical: [
      "Data captured. Trends are forming.",
      "Volume tracked. Let's review the week.",
      "Session logged. Numbers tell the story.",
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
    proud: [
      "PR earned through consistency. That's real.",
      "The work paid off. Savor it.",
      "That number reflects who you've become.",
    ],
    analytical: [
      "PR confirmed. Updating your ceiling.",
      "New data point. Trajectory is positive.",
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
    proud: [
      "That streak is built on discipline. Respect.",
      "Day after day. That's character.",
      "Consistency is your superpower now.",
    ],
    analytical: [
      "Streak data trending positive.",
      "Adherence rate is climbing. Keep it locked.",
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
    concerned: [
      "Haven't seen you. Everything alright?",
      "Extended break. Let's ease back in carefully.",
      "Your body detrains fast. The sooner you return, the less you lose.",
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
    proud: [
      "Rank earned. That's all you.",
      "Every session brought you here. Remember that.",
      "You leveled up through discipline. Not luck.",
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
    concerned: [
      "Numbers dropped. Could be fatigue — check your recovery.",
      "Low output. Are you under-recovered or under-motivated?",
      "Dip like this needs attention, not avoidance.",
    ],
    analytical: [
      "Week-over-week performance declining. Review training load.",
      "Data shows a drop. Identify the variable.",
      "Numbers are below baseline. Let's course-correct.",
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
    proud: [
      "Weeks like this are what legacy looks like.",
      "High output, earned through discipline.",
      "That's the version of you that wins.",
    ],
    analytical: [
      "Performance metrics are elevated. Trend is strong.",
      "Week-over-week improvement confirmed.",
      "Training response is positive. Keep the stimulus.",
    ],
    onboarding_guide: [
      "Strong start. Build the habit.",
    ],
  },

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

/**
 * Pick a random message from ANY mood pool for the given trigger.
 * Returns both the message and the mood it came from.
 */
export function pickMessageWithMood(trigger: LockeTrigger): { message: string; mood: LockeState } {
  const bank = MESSAGES[trigger];
  if (!bank) return { message: "Log it and move on.", mood: "neutral" };

  const entries: { message: string; mood: LockeState }[] = [];
  for (const [mood, pool] of Object.entries(bank)) {
    if (pool?.length) {
      for (const msg of pool) {
        entries.push({ message: msg, mood: mood as LockeState });
      }
    }
  }
  if (!entries.length) return { message: "Log it and move on.", mood: "neutral" };

  return entries[Math.floor(Math.random() * entries.length)];
}
