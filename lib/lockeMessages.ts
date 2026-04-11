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
      "You showed up. Now build on it.",
      "There's more in you. Bring it next time.",
      "Finished is finished. Raise the bar next session.",
    ],
    intense: [
      "You showed up. Now push harder.",
      "Good enough isn't the goal. Chase greatness.",
      "The next one is where you prove it.",
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
      "Every day is a chance to extend it.",
      "It's just days. Make them count.",
    ],
    intense: [
      "Consistent — now push for progress.",
      "Showing up is the foundation. Growth is the goal.",
      "The streak is solid. Make the reps count too.",
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
      "Ready to get back in the hunt?",
      "Fresh start available.",
      "The log is ready when you are.",
      "New session, clean slate.",
    ],
    encouraging: [
      "Welcome back. Let's build from here.",
      "Rest is part of the process. Time to move.",
      "Back in the gym. That takes guts.",
    ],
    celebrating: [],
    disappointed: [
      "Time off happens. What matters is coming back.",
      "Reset and refocus. That's all it takes.",
      "The comeback starts with one session.",
      "Today is a fresh start. Take it.",
      "Every great run has a rest chapter.",
      "A break can be fuel. Use it.",
    ],
    intense: [
      "The iron is waiting. Let's go.",
      "Fresh legs, fresh opportunity.",
      "Time to channel that energy into something.",
    ],
    concerned: [
      "Hope you're doing well. Ready to ease back in?",
      "Extended break. Let's ease back in carefully.",
      "Your body bounces back fast. A light session is a great restart.",
    ],
    onboarding_guide: [
      "Ready to pick it back up? Let's go.",
      "The log is waiting. One session at a time.",
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
      "New rank. Higher standards now. Own it.",
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

  challenge_complete: {
    celebrating: [
      "30 days. Conquered.",
      "Challenge done. That's the standard now.",
      "You stacked every day. Respect.",
      "Month-long work. Legendary finish.",
    ],
    encouraging: [
      "Full challenge, clean finish. Proud of that.",
      "You showed up for 30 days straight. Earned.",
      "That's real discipline. Locked in.",
    ],
    proud: [
      "30 days of showing up. That's who you are now.",
      "Every rep stacked into this moment. Respect.",
      "The habit held. The work paid off.",
    ],
    intense: [
      "Challenge cleared. Now find a harder one.",
      "Done doesn't mean stop. Next hunt.",
    ],
    focused: [
      "Challenge logged. Execution was clean.",
      "30 for 30. Precision finish.",
    ],
    analytical: [
      "Challenge complete. Adherence verified.",
      "30-day cycle closed. Numbers speak.",
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
      "Give your real 1RM. Honest numbers make better training.",
      "Be honest with the numbers. They're your foundation.",
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
      "Lighter week on the books.",
      "Numbers dipped. Room to grow.",
      "Off week — they happen to everyone.",
    ],
    encouraging: [
      "Down week. Everyone gets one. Next week is yours.",
      "Not your best — but you still showed up. Build on it.",
    ],
    celebrating: [],
    disappointed: [
      "Quieter week. The bounce-back is where it counts.",
      "Not the strongest week. Fresh energy next round.",
      "The numbers will climb again. Stay the course.",
      "Off weeks are part of the process. Refocus and reload.",
    ],
    intense: [
      "You've got more in you. Time to unlock it.",
      "Lower output just means bigger upside ahead.",
      "This is the launchpad. Rise from here.",
    ],
    concerned: [
      "Numbers dropped. Could be fatigue — check your recovery.",
      "Low output. Might be worth reviewing sleep and nutrition.",
      "A dip like this is worth paying attention to. Recovery first.",
    ],
    analytical: [
      "Week-over-week performance dipped. Review training load.",
      "Data shows a drop. Let's identify the variable.",
      "Numbers are below baseline. Let's course-correct.",
    ],
    onboarding_guide: [
      "Lighter week. Stay consistent and it evens out.",
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

  fuel_plan_ready: {
    neutral: [
      "Fuel plan locked.",
      "Plan built. Nothing left to guess.",
    ],
    encouraging: [
      "Fuel plan ready. Now execute it.",
      "Smart move. Fuel drives everything.",
    ],
    celebrating: [
      "The hunt is mapped. Every meal has a job.",
    ],
    proud: [
      "Plan set. Discipline starts at the plate.",
      "Locked in. Let's eat.",
    ],
    focused: [
      "Menu locked. Execute with precision.",
    ],
    analytical: [
      "Macros calculated. Plan optimized.",
    ],
  },

  fuel_weekly_refresh: {
    neutral: [
      "New week. New fuel. Same discipline.",
      "Menu refreshed. Stay locked in.",
    ],
    encouraging: [
      "Fresh hunt plan loaded. Keep feeding the work.",
      "This week's fuel is ready. Go earn it.",
    ],
    focused: [
      "Weekly reset. New targets on the board.",
    ],
    savage: [
      "Another week mapped. No excuses at mealtime.",
    ],
  },

  home_idle: {
    neutral: [
      "Ready when you are.",
      "I've got a hunt picked out.",
      "Let's see what today brings.",
      "Another day, another opportunity.",
      "The log is open. Your move.",
    ],
    encouraging: [
      "Good to see you. Let's get after it.",
      "You keep showing up. That's the difference.",
      "I've got something lined up for you.",
      "Let's make today count.",
      "Back at it. That's the mentality.",
    ],
    celebrating: [
      "You've been on fire lately.",
      "Momentum is real. Keep it rolling.",
      "The pack sees you putting in work.",
      "This energy? Unmatched.",
    ],
    disappointed: [
      "It's been a while. Let's change that.",
      "The gym doesn't come to you. Let's go.",
      "Time to shake off the rust.",
      "One session. That's all it takes to start again.",
    ],
    intense: [
      "No days off mentally. Let's hunt.",
      "Today's the day you surprise yourself.",
      "I've got a hunt that'll test you.",
      "Stop scrolling. Start lifting.",
    ],
    savage: [
      "You didn't open this app to sit around.",
      "Excuses don't build muscle.",
      "The iron is cold. Warm it up.",
      "Talk is cheap. Reps aren't.",
    ],
    focused: [
      "Dialed in. Let's execute.",
      "One session at a time. Stay locked.",
      "Plan the work. Work the plan.",
      "Precision today. Results tomorrow.",
    ],
    concerned: [
      "How's recovery feeling? Listen to your body.",
      "Make sure you're fueled up before we start.",
      "Check in with yourself. Quality over quantity.",
    ],
    proud: [
      "Look how far you've come. Now keep going.",
      "Consistency built this. Don't stop now.",
      "Every session is proof. Let's add more.",
      "The habit is locked in. Respect.",
    ],
    analytical: [
      "Recovery data looks interesting. Let's train smart.",
      "I've analyzed your patterns. Got a hunt ready.",
      "Numbers say you're primed. Let's move.",
      "Training load is balanced. Good time to push.",
    ],
    onboarding_guide: [
      "Welcome. Let's get you set up.",
      "First things first — let's find your baseline.",
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
