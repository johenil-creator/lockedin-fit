/**
 * lockeCoachPhrases.ts — Phrase bank for the Locke Coach Engine.
 *
 * Tone guide (matches Locke's existing voice in lockeMessages.ts):
 *   celebrating  — terse acknowledgment of genuine achievement.
 *   savage       — competitive, hard-edged, earned dominance.
 *   encouraging  — confident warmth. Earned, not empty.
 *   focused      — deliberate, precision-oriented, plateau-aware.
 *   concerned    — sharp but not cruel. The truth about fatigue.
 *   rest_day     — direct, matter-of-fact. Recovery is the work.
 *
 * Rotation: module-level index cursors per mood ensure deterministic,
 * non-random cycling. Last 5 shown per category tracked to prevent repetition.
 */

import type { CoachMood } from "./types";

// ── Phrase pool types ─────────────────────────────────────────────────────────

export interface MoodPhrases {
  headlines: string[]; // max 42 chars each
  subtexts: string[];  // max 90 chars each
}

// ── Phrase bank ───────────────────────────────────────────────────────────────

const PHRASES: Record<CoachMood, MoodPhrases> = {

  celebrating: {
    headlines: [
      "New ceiling. Logged.",             // 20
      "That's your number now.",          // 23
      "PR locked in.",                    // 13
      "Record set. Move forward.",        // 26
      "Standard updated.",                // 17
      "That lift belongs to you.",        // 26
      "The pack noticed.",                // 17
      "New floor. Build from it.",        // 25
      "Earned. No fluke.",                // 17
      "That one's in the books.",         // 24
    ],
    subtexts: [
      "Hard work calculated itself. Now repeat it.",           // 44
      "New baseline. The only way is up from here.",           // 44
      "One rep changed your standard. Don't waste it.",        // 48
      "The number's real. Now make it feel easy.",             // 42
      "Lock it in and let it fuel the next session.",          // 46
      "That lift rewrote your ceiling. Write a new one.",      // 49
      "Consistency brought you here. Keep the contract.",      // 49
      "Every PR is a promise to yourself. Keep it.",           // 45
      "Progress isn't linear — but this was real progress.",   // 53
      "You didn't just lift more. You became more capable.",   // 53
    ],
  },

  savage: {
    headlines: [
      "You're in the zone. Go.",           // 22
      "Peak condition. Use it.",           // 23
      "Full send. No excuses today.",      // 29
      "The pack trails behind you.",       // 28
      "No ceiling today.",                 // 17
      "This is your session.",             // 21
      "Prime form. No holding back.",      // 29
      "Streak momentum. Dominate.",        // 27
      "Everything is primed. Fire.",       // 28
      "High readiness. High standard.",    // 31
    ],
    subtexts: [
      "Readiness is maxed. Every rep counts double today.",         // 51
      "Streak momentum is real. Ride it hard.",                     // 39
      "Your body is primed and your mind is locked in.",            // 48
      "Days of discipline built this. Don't leave reps unearned.",  // 59
      "This window doesn't last. Make every set count.",            // 49
      "You're operating at peak. Every excuse is forfeit.",         // 52
      "The streak isn't just days — it's identity. Protect it.",   // 57
      "When your body and discipline align, you dominate.",         // 52
      "High readiness, long streak. This is the moment.",          // 51
      "You've earned the right to push hard. Do it.",              // 46
    ],
  },

  encouraging: {
    headlines: [
      "Ready. Go earn it.",                    // 18
      "Good position to build from.",          // 29
      "Body's ready. Now match it.",           // 27
      "Solid readiness. Use it.",              // 24
      "Today's a good day to train.",          // 29
      "You're in form. Make it count.",        // 30
      "Clean baseline. Build from here.",      // 32
      "Conditions are right. Work.",           // 27
      "Your body is online. Train it.",        // 30
      "Readiness earned. Now spend it.",       // 31
    ],
    subtexts: [
      "Recovery is solid. Push with intention today.",              // 46
      "Good recovery means productive training. Go get it.",        // 52
      "You're not at peak but you're ready. That's enough.",        // 52
      "The work shows up in readiness. So does recovery.",          // 52
      "Consistent habits built this readiness. Maintain them.",     // 55
      "Your muscles are recovered. Execute the plan.",              // 47
      "Solid recovery window. Train smart and train hard.",         // 52
      "Everything is aligned for a productive session.",            // 49
      "You've done the work to be here. Don't waste it.",          // 50
      "Readiness like this is built over weeks. Honor it.",        // 52
    ],
  },

  focused: {
    headlines: [
      "Lock in. Every rep deliberate.",      // 30
      "Focused execution today.",            // 24
      "Technique over ego. Always.",         // 27
      "Break the plateau here.",             // 23
      "Precision over power today.",         // 27
      "Dialed in. No distractions.",         // 27
      "Reset. Rebuild. Progress.",           // 25
      "Small gains compound. Focus.",        // 28
      "The plateau ends with intent.",       // 29
      "Execution is everything today.",      // 30
    ],
    subtexts: [
      "Progress has stalled. The stimulus needs to change.",           // 52
      "Focus on form and tempo — that's where gains hide.",           // 53
      "Plateaus are information. You've found your next target.",      // 56
      "Break through with precision, not just more weight.",           // 52
      "Every focused rep chips away at where you're stuck.",           // 53
      "When progress stalls, rep quality becomes the variable.",       // 56
      "Dialed-in technique unlocks more gains than raw effort.",       // 55
      "Deliberate practice breaks patterns. Be deliberate.",           // 52
      "The rep that breaks the plateau looks just like the others.",   // 63
      "Slow down to speed up. Precision compounds.",                   // 44
    ],
  },

  concerned: {
    headlines: [
      "Listen to your body today.",         // 26
      "Manage the load. Smart move.",       // 29
      "Lower readiness. Adapt.",            // 23
      "Recovery is training too.",          // 26
      "You're running low. Notice it.",     // 30
      "Fatigue is honest. Respect it.",     // 30
      "Back off the volume today.",         // 27
      "Sub-optimal conditions. Adjust.",    // 31
      "Readiness is down. Train smart.",    // 31
      "Load management is discipline.",     // 30
    ],
    subtexts: [
      "Low readiness means today isn't the day to push intensity.",   // 62
      "Fatigue accumulates faster than it resolves. Manage it now.",   // 60
      "Training through fatigue isn't toughness — it's poor planning.", // 64
      "Reduce intensity and protect your adaptation window.",           // 54
      "High effort plus low readiness equals wasted training.",         // 56
      "Your body's giving you data. Use it to train smarter.",         // 54
      "Volume down, quality up. That's the intelligent play.",         // 54
      "Respect the signal. Come back stronger tomorrow.",              // 51
      "Recovery is where growth happens. Prioritize it now.",          // 54
      "This session matters most for what you DON'T push today.",      // 58
    ],
  },

  rest_day: {
    headlines: [
      "Rest day. Non-negotiable.",          // 25
      "Take the deload. Seriously.",        // 27
      "Recovery is the session today.",     // 30
      "Body says no. Listen.",              // 21
      "Deload week. Stick to it.",          // 25
      "Growth happens at rest.",            // 23
      "Low readiness. Take the day.",       // 29
      "The wolf rests to hunt better.",     // 30
      "This is the plan. Rest.",            // 24
      "Recovery mode. No skipping.",        // 29
    ],
    subtexts: [
      "Forcing training today will cost you next week. Not worth it.",  // 62
      "Deload isn't weakness. It's the mechanism of adaptation.",        // 57
      "Your body hasn't caught up to your training. Give it time.",     // 59
      "Progress compounds during recovery. Rest isn't wasted time.",    // 60
      "Low readiness today means high readiness tomorrow. Rest up.",    // 60
      "Movement, sleep, and nutrition. That's today's session.",        // 56
      "You can't out-train under-recovery. Rest is strategic.",         // 55
      "A full recovery day makes your next session count for more.",    // 61
      "The best athletes take planned rest. So should you.",            // 53
      "Rest is not a setback. It's part of the program.",              // 52
    ],
  },

};

// ── Module-level rotation state ───────────────────────────────────────────────

const cursors: Record<CoachMood, { headline: number; subtext: number }> = {
  celebrating: { headline: 0, subtext: 0 },
  savage:      { headline: 0, subtext: 0 },
  encouraging: { headline: 0, subtext: 0 },
  focused:     { headline: 0, subtext: 0 },
  concerned:   { headline: 0, subtext: 0 },
  rest_day:    { headline: 0, subtext: 0 },
};

// Track last 5 shown per type to prevent repetition
// Format: "mood:h:idx" for headlines, "mood:s:idx" for subtexts
const recentKeys: string[] = [];
const RECENT_WINDOW = 5;

// ── Rotation helpers ──────────────────────────────────────────────────────────

function advancePick(
  mood: CoachMood,
  type: "h" | "s",
  pool: string[]
): string {
  const field = type === "h" ? "headline" : "subtext";
  const start = cursors[mood][field];

  // Walk the pool to find a phrase not in recent history
  for (let attempt = 0; attempt < pool.length; attempt++) {
    const idx = (start + attempt) % pool.length;
    const key = `${mood}:${type}:${idx}`;
    if (!recentKeys.includes(key)) {
      cursors[mood][field] = (idx + 1) % pool.length;
      recentKeys.push(key);
      if (recentKeys.length > RECENT_WINDOW * 2) recentKeys.shift();
      return pool[idx];
    }
  }

  // All phrases recently used (pool smaller than RECENT_WINDOW) — just advance
  const idx = cursors[mood][field];
  cursors[mood][field] = (idx + 1) % pool.length;
  return pool[idx];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Pick a non-recently-repeated headline for the given mood.
 * Rotation is deterministic (index-based), not random.
 */
export function pickHeadline(mood: CoachMood): string {
  return advancePick(mood, "h", PHRASES[mood].headlines);
}

/**
 * Pick a non-recently-repeated subtext for the given mood.
 * Rotation is deterministic (index-based), not random.
 */
export function pickSubtext(mood: CoachMood): string {
  return advancePick(mood, "s", PHRASES[mood].subtexts);
}

/** Expose pools for testing/preview. */
export function getPhrasePool(mood: CoachMood): MoodPhrases {
  return PHRASES[mood];
}
