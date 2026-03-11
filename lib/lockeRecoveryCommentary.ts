/**
 * lockeRecoveryCommentary.ts — Context-aware Locke commentary for the muscle energy grid.
 *
 * Generates gamified wolf-mascot commentary based on:
 *   - Dominant muscle energy state (what most muscles are doing)
 *   - Peak / charged muscle counts (urgent recovery or supercompensation)
 *   - Rank-based tone shifting (Runt=nurturing → Apex=savage)
 *   - Return-after-break detection (3+ day gap → welcoming override)
 *   - Upper/lower readiness imbalance detection
 *
 * Pure functions, module-level constants, round-robin phrase selection.
 * No React dependencies.
 */

import type { RankLevel } from './types';
import type { MuscleEnergyState } from './muscleEnergyStates';

// ── Types ────────────────────────────────────────────────────────────────────

export type RecoveryCommentaryTone =
  | 'nurturing'
  | 'coaching'
  | 'intense'
  | 'savage'
  | 'welcoming';

export type RecoveryCommentaryInputs = {
  dominantState: MuscleEnergyState;
  peakMuscleCount: number;
  chargedMuscleCount: number;
  rank: RankLevel;
  daysSinceLastSession: number;
  upperReadiness: number; // 0-100
  lowerReadiness: number; // 0-100
};

export type RecoveryCommentary = {
  headline: string; // max 50 chars
  subtext: string;  // max 100 chars
  tone: RecoveryCommentaryTone;
};

// ── Constants ────────────────────────────────────────────────────────────────

const BREAK_THRESHOLD_DAYS = 3;

const READINESS_IMBALANCE_THRESHOLD = 30;

// ── Rank → Tone Mapping ─────────────────────────────────────────────────────

const RANK_TONE_MAP: Record<RankLevel, RecoveryCommentaryTone> = {
  Runt:        'nurturing',
  Scout:       'nurturing',
  Stalker:     'coaching',
  Hunter:      'coaching',
  Sentinel:    'intense',
  Alpha:       'savage',
  Apex:        'savage',
  Apex_Bronze: 'savage',
  Apex_Silver: 'savage',
  Apex_Gold:   'savage',
};

// ── Phrase Banks ─────────────────────────────────────────────────────────────

type PhrasePair = { headline: string; subtext: string };

/** Return-after-break phrases, keyed by tone. */
const RETURN_PHRASES: Record<RecoveryCommentaryTone, PhrasePair[]> = {
  welcoming: [
    { headline: "The pack missed you.",               subtext: "Let's ease back in. No rush, just show up." },
    { headline: "You're back. That's what matters.",   subtext: "Start light. Momentum builds from here." },
    { headline: "Welcome home, wolf.",                 subtext: "The den's been waiting. Let's move." },
  ],
  nurturing: [
    { headline: "The pack missed you.",               subtext: "Let's ease back in — your body remembers." },
    { headline: "Good to see you again.",              subtext: "Start wherever you are. That's enough." },
    { headline: "You came back. That's strength.",     subtext: "Go easy today. Consistency is the goal." },
  ],
  coaching: [
    { headline: "Welcome back. Rebuild momentum.",     subtext: "First session back sets the tone. Keep it smart." },
    { headline: "Break's over. Time to move.",         subtext: "Ease in today, ramp up this week." },
    { headline: "Gap closed. Let's go.",               subtext: "Don't chase where you left off. Build forward." },
  ],
  intense: [
    { headline: "Absence makes the wolf hungrier.",    subtext: "Channel the hunger. Controlled aggression today." },
    { headline: "You disappeared. Now earn it back.",  subtext: "The pack doesn't wait. Prove you belong." },
    { headline: "Time away sharpens the edge.",        subtext: "Use the rest. Attack with purpose." },
  ],
  savage: [
    { headline: "You disappeared. Prove your worth.",  subtext: "Words mean nothing. Only reps count now." },
    { headline: "The pack moved on without you.",      subtext: "Catch up or fall behind. Your call." },
    { headline: "Back from the dead. Show me why.",    subtext: "No excuses. Just execution." },
  ],
};

/** State-based phrases, keyed by energy state then tone. */
const STATE_PHRASES: Record<MuscleEnergyState, Record<RecoveryCommentaryTone, PhrasePair[]>> = {
  dormant: {
    nurturing: [
      { headline: "Your body's a blank slate.",            subtext: "Every rep starts the story. You choose what to write." },
      { headline: "No data yet. That's okay.",             subtext: "Your first session tells us everything we need." },
      { headline: "Fresh start. Clean page.",              subtext: "Begin wherever feels right. We'll track it all." },
    ],
    coaching: [
      { headline: "Blank slate. Time to write.",           subtext: "No history yet — that changes with one session." },
      { headline: "Zero baseline. Start building.",        subtext: "First session creates the foundation. Make it count." },
      { headline: "No data yet. Every rep counts.",        subtext: "One session gives us something real to work with." },
    ],
    intense: [
      { headline: "Empty grid. Fill it.",                  subtext: "Your muscles have nothing to show. Change that today." },
      { headline: "No signal detected. Go create one.",    subtext: "Dormant muscles are wasted potential. Move." },
      { headline: "The grid is dark. Light it up.",        subtext: "Training data starts now. No more waiting." },
    ],
    savage: [
      { headline: "Nothing to show. That bothers me.",     subtext: "A dormant grid is an insult. Get to work." },
      { headline: "Grid's dead. Are you?",                 subtext: "Prove there's a pulse. Start lifting." },
      { headline: "All dark. Unacceptable.",               subtext: "Wolves don't sit dormant. Hunt." },
    ],
    welcoming: [
      { headline: "Fresh start. Let's make it count.",     subtext: "No pressure. Just show up and begin." },
      { headline: "Clean slate waiting for you.",          subtext: "Every journey starts somewhere. This is yours." },
      { headline: "Ready when you are.",                   subtext: "The grid is yours to fill. Take the first step." },
    ],
  },

  primed: {
    nurturing: [
      { headline: "Fresh muscles, loaded and ready.",      subtext: "Green across the board. Great position to train." },
      { headline: "Recovery is complete. Nice work.",      subtext: "Your body did its job. Now do yours." },
      { headline: "All systems green.",                    subtext: "Muscles are fresh and waiting. Good day to train." },
    ],
    coaching: [
      { headline: "Primed and ready. Attack day.",         subtext: "Green across the board. Execute the plan." },
      { headline: "Fresh muscles are loaded cannons.",     subtext: "Fire with intent. Everything is recovered." },
      { headline: "Recovery complete. Go to work.",        subtext: "You're in the optimal window. Don't waste it." },
    ],
    intense: [
      { headline: "Locked and loaded. Fire.",              subtext: "Everything is primed. No excuses left." },
      { headline: "Peak freshness. Maximum output.",       subtext: "Your muscles are begging to work. Oblige them." },
      { headline: "All green. All systems. Go.",           subtext: "This is the window you trained for. Push it." },
    ],
    savage: [
      { headline: "Fully primed. No mercy today.",         subtext: "Fresh muscles mean zero excuses. Dominate." },
      { headline: "Green board. War mode.",                 subtext: "Everything is recovered. Destroy the session." },
      { headline: "Loaded cannons. Pull the trigger.",     subtext: "This freshness is a weapon. Use it or waste it." },
    ],
    welcoming: [
      { headline: "Looking fresh. Good to see you.",       subtext: "Muscles are primed. A good day to get after it." },
      { headline: "All green. Welcome back.",              subtext: "Your body's ready. Let's ease into it." },
      { headline: "Fresh and ready to roll.",              subtext: "Start where you're comfortable. Build from there." },
    ],
  },

  charged: {
    nurturing: [
      { headline: "Supercompensation window is open.",     subtext: "Your muscles adapted and grew stronger. Train now." },
      { headline: "Golden hour. Don't miss it.",           subtext: "This is your body's reward for recovery. Use it." },
      { headline: "You've earned this window.",            subtext: "Adaptation happened. Now build on top of it." },
    ],
    coaching: [
      { headline: "Supercompensation. Act now.",           subtext: "This is the golden hour — your muscles overbuilt. Train." },
      { headline: "Charged window is OPEN.",               subtext: "Muscles recovered past baseline. Capitalize today." },
      { headline: "Peak adaptation window. Execute.",      subtext: "Training now compounds your gains. Don't miss it." },
    ],
    intense: [
      { headline: "Supercomp active. Go hard.",            subtext: "Your muscles are stronger than before. Push the limit." },
      { headline: "Golden hour. Maximum effort.",          subtext: "This window closes. Extract everything you can." },
      { headline: "Charged and dangerous. Unleash it.",    subtext: "Adaptation peaked. Channel it into performance." },
    ],
    savage: [
      { headline: "Supercomp window. Waste it and weep.", subtext: "Your body overbuilt itself. Reward that with intensity." },
      { headline: "Charged muscles. Time to dominate.",    subtext: "This window doesn't last. Make it legendary." },
      { headline: "Golden hour. No prisoners.",            subtext: "Adaptation is peaking. Anything less than max is theft." },
    ],
    welcoming: [
      { headline: "Great timing. Muscles are charged.",    subtext: "Your body adapted while you were away. Ride the wave." },
      { headline: "Supercompensation awaits.",             subtext: "Welcome back to a golden window. Let's use it." },
      { headline: "Perfect moment to return.",             subtext: "Muscles recovered past baseline. Good timing." },
    ],
  },

  strained: {
    nurturing: [
      { headline: "Working fatigue. You're building.",     subtext: "Strain means stimulus. Your body is adapting." },
      { headline: "Controlled strain. That's growth.",     subtext: "This is the cost of progress. Keep going steady." },
      { headline: "Some fatigue. Totally normal.",         subtext: "Your muscles are processing the work. Stay patient." },
    ],
    coaching: [
      { headline: "Strained but building.",                subtext: "Controlled strain breeds adaptation. Stay the course." },
      { headline: "Working fatigue — manage it.",          subtext: "You're in the productive zone. Don't tip over." },
      { headline: "Strain is signal, not danger.",         subtext: "Train smart today. Volume down, quality up." },
    ],
    intense: [
      { headline: "Fatigue is fuel. Burn through it.",     subtext: "Strain separates builders from bystanders." },
      { headline: "Strained and still standing. Good.",    subtext: "This is where weaker wolves quit. You don't." },
      { headline: "Working through the grind.",            subtext: "Controlled strain is the price of getting stronger." },
    ],
    savage: [
      { headline: "Strained? So what. Keep going.",        subtext: "Fatigue is information, not permission to stop." },
      { headline: "Strain is just the entrance fee.",      subtext: "Pay it and keep moving. Or quit. Your call." },
      { headline: "Working fatigue. Work harder.",         subtext: "Comfortable wolves don't grow. Embrace the strain." },
    ],
    welcoming: [
      { headline: "Some strain from before. All good.",    subtext: "Your muscles remember. We'll work around it." },
      { headline: "A little fatigue carried over.",        subtext: "Nothing to worry about. We'll manage the load." },
      { headline: "Welcome back. Some strain remains.",    subtext: "We'll adjust today's plan for where you are." },
    ],
  },

  overloaded: {
    nurturing: [
      { headline: "Amber alert. Ease up today.",           subtext: "Your muscles need lighter work or active recovery." },
      { headline: "Your body's asking for a break.",       subtext: "Listen to it. Recovery is part of the program." },
      { headline: "Load is high. Time to manage.",         subtext: "Back off the volume. Quality over quantity today." },
    ],
    coaching: [
      { headline: "Overloaded. Manage or break down.",     subtext: "Back off or break down. Choose wisely." },
      { headline: "Amber zone. Reduce volume today.",      subtext: "You've accumulated enough stimulus. Let it process." },
      { headline: "Load exceeds recovery. Deload.",        subtext: "The smart play is reducing intensity. Do it." },
    ],
    intense: [
      { headline: "Overloaded. Tread carefully.",          subtext: "Even the strongest wolves know when to ease back." },
      { headline: "Amber alert. Controlled retreat.",      subtext: "Pull back today to push harder tomorrow." },
      { headline: "Heavy fatigue. Strategic rest.",        subtext: "This isn't weakness. It's tactical recovery." },
    ],
    savage: [
      { headline: "Overloaded. Even I say pull back.",     subtext: "Pushing through this is stupidity, not strength." },
      { headline: "Amber zone. Don't be an idiot.",        subtext: "Smart predators rest. Reckless ones get eaten." },
      { headline: "Your muscles are screaming. Listen.",   subtext: "Ignore this and you'll pay in injuries." },
    ],
    welcoming: [
      { headline: "Some overload carried over.",           subtext: "Welcome back. We'll keep today light and smart." },
      { headline: "High fatigue. Let's be gentle.",        subtext: "Good that you showed up. We'll manage the load." },
      { headline: "Welcome back. Easy does it today.",     subtext: "Your muscles are loaded. Light session works best." },
    ],
  },

  peak: {
    nurturing: [
      { headline: "Red zone. Rest is the priority.",       subtext: "Your body needs recovery, not more training." },
      { headline: "Recovery isn't optional right now.",     subtext: "Take the day. Your muscles will thank you." },
      { headline: "Maxed out. Be kind to yourself.",       subtext: "Rest today, come back stronger tomorrow." },
    ],
    coaching: [
      { headline: "Red zone. Recovery only.",              subtext: "Your body is screaming — listen to it." },
      { headline: "Peak fatigue. No training today.",      subtext: "Active recovery or full rest. Those are your options." },
      { headline: "System overload. Mandatory rest.",      subtext: "Training now sets you backwards. Rest sets you forward." },
    ],
    intense: [
      { headline: "Red zone. Even wolves rest.",           subtext: "This is the line. Cross it and you break." },
      { headline: "Peak load. Stand down.",                subtext: "Recovery today is the hardest thing you'll do." },
      { headline: "Maxed out. Recovery is the mission.",   subtext: "Discipline means resting when everything says go." },
    ],
    savage: [
      { headline: "Red zone. Sit down.",                   subtext: "I don't care how you feel. Your body says no." },
      { headline: "Overtrained. You did this to yourself.",subtext: "Now fix it. Rest, eat, sleep. In that order." },
      { headline: "Peak load. Don't be stupid.",           subtext: "Training now is ego. Recovery now is intelligence." },
    ],
    welcoming: [
      { headline: "High fatigue. Rest day today.",         subtext: "Welcome back — but your muscles need recovery first." },
      { headline: "Glad you're here. Easy day though.",    subtext: "Peak fatigue means rest is the best move." },
      { headline: "Welcome back. Recovery mode.",          subtext: "Your body carried a lot. Let it heal today." },
    ],
  },
};

/** Special-case phrases when chargedMuscleCount >= 3 (supercompensation emphasis). */
const SUPERCOMP_PHRASES: Record<RecoveryCommentaryTone, PhrasePair[]> = {
  nurturing: [
    { headline: "Multiple muscles in supercomp!",      subtext: "Several muscle groups adapted. Great time to train." },
    { headline: "Wide-open recovery window.",           subtext: "Your body overbuilt in multiple areas. Use it!" },
  ],
  coaching: [
    { headline: "Supercomp across the board.",          subtext: "Multiple groups peaked. This is a rare window — attack." },
    { headline: "Multi-muscle golden hour.",            subtext: "Several groups hit supercompensation. Train now." },
  ],
  intense: [
    { headline: "Massive supercomp window. GO.",        subtext: "Multiple muscle groups at peak adaptation. All-out." },
    { headline: "Full-body supercompensation.",         subtext: "This window is rare. Extract maximum performance." },
  ],
  savage: [
    { headline: "Supercomp everywhere. Destroy it.",    subtext: "Your entire body overbuilt. This is the day. No excuses." },
    { headline: "Multi-muscle peak. Legendary session.", subtext: "Windows like this don't come often. Make it count." },
  ],
  welcoming: [
    { headline: "Great timing — muscles are charged.",  subtext: "Multiple groups in supercompensation. Perfect return." },
    { headline: "Welcome to the golden window.",        subtext: "Several muscle groups are peaking. Let's go." },
  ],
};

/** Special-case phrases when peakMuscleCount >= 3 (urgent recovery emphasis). */
const URGENT_RECOVERY_PHRASES: Record<RecoveryCommentaryTone, PhrasePair[]> = {
  nurturing: [
    { headline: "Multiple muscles in the red.",        subtext: "Your body needs a full rest day. Please listen." },
    { headline: "Too many groups maxed out.",           subtext: "Take care of yourself today. Recovery comes first." },
  ],
  coaching: [
    { headline: "Red across multiple groups.",          subtext: "Systemic fatigue detected. Full rest day required." },
    { headline: "Multi-muscle overload. Stop.",         subtext: "Training now creates negative returns. Rest instead." },
  ],
  intense: [
    { headline: "System-wide red alert.",               subtext: "Multiple groups peaked. This is a mandatory rest day." },
    { headline: "Body-wide overload. Stand down.",      subtext: "Even the hungriest wolf rests before the kill." },
  ],
  savage: [
    { headline: "Everything is red. Are you blind?",    subtext: "Multiple groups maxed out. Sit down. Now." },
    { headline: "Full system overload. Don't be dumb.", subtext: "Training through this isn't tough — it's reckless." },
  ],
  welcoming: [
    { headline: "High fatigue across the board.",       subtext: "Welcome back, but today is a recovery day." },
    { headline: "Lots of red. Let's take it easy.",    subtext: "Your muscles are loaded. Rest is the move today." },
  ],
};

/** Imbalance phrases when upper/lower readiness differ by 30+. */
const IMBALANCE_PHRASES: Record<RecoveryCommentaryTone, PhrasePair[]> = {
  nurturing: [
    { headline: "Upper/lower imbalance detected.",     subtext: "One half is fresh, the other needs rest. Train the fresh half." },
    { headline: "Uneven recovery across your body.",   subtext: "Focus on the recovered side today." },
  ],
  coaching: [
    { headline: "Split readiness. Train smart.",        subtext: "Big gap between upper and lower. Target the fresh half." },
    { headline: "Readiness imbalance. Adjust plan.",    subtext: "One side is ready, the other isn't. Split accordingly." },
  ],
  intense: [
    { headline: "Imbalance detected. Exploit it.",     subtext: "One half is primed, the other isn't. Attack the ready side." },
    { headline: "Split readiness. Tactical training.",  subtext: "Focus firepower on the recovered muscle groups." },
  ],
  savage: [
    { headline: "Lopsided recovery. Adapt or fail.",   subtext: "Upper and lower are out of sync. Train what's ready." },
    { headline: "Imbalanced. Don't train blind.",      subtext: "Ignoring the split is how injuries happen. Be smart." },
  ],
  welcoming: [
    { headline: "Uneven recovery. We'll work with it.", subtext: "One half is fresher than the other. Let's plan around it." },
    { headline: "Mixed readiness. No problem.",         subtext: "We'll target the recovered side today." },
  ],
};

// ── Module-Level Cursors ─────────────────────────────────────────────────────

/**
 * Round-robin cursors for each phrase category.
 * Keyed as "category:tone" → index.
 */
const cursors: Record<string, number> = {};

function advanceCursor(key: string, poolSize: number): number {
  const current = cursors[key] ?? 0;
  const idx = current % poolSize;
  cursors[key] = (current + 1) % poolSize;
  return idx;
}

function pickPhrase(pool: PhrasePair[], cursorKey: string): PhrasePair {
  const idx = advanceCursor(cursorKey, pool.length);
  return pool[idx];
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Returns true if 3+ days since last session (return-after-break). */
export function isReturnAfterBreak(daysSinceLastSession: number): boolean {
  return daysSinceLastSession >= BREAK_THRESHOLD_DAYS;
}

/**
 * Generate context-aware recovery commentary for Locke.
 *
 * Pure function aside from module-level cursor state for round-robin
 * phrase rotation (in-memory only, no side effects).
 */
export function getRecoveryCommentary(
  inputs: RecoveryCommentaryInputs,
): RecoveryCommentary {
  const {
    dominantState,
    peakMuscleCount,
    chargedMuscleCount,
    rank,
    daysSinceLastSession,
    upperReadiness,
    lowerReadiness,
  } = inputs;

  // Determine base tone from rank
  const baseTone = RANK_TONE_MAP[rank];

  // Return-after-break overrides tone to welcoming
  const returning = isReturnAfterBreak(daysSinceLastSession);
  const tone: RecoveryCommentaryTone = returning ? 'welcoming' : baseTone;

  // Priority 1: Return after break
  if (returning) {
    const pool = RETURN_PHRASES[tone];
    const { headline, subtext } = pickPhrase(pool, `return:${tone}`);
    return { headline, subtext, tone };
  }

  // Priority 2: Urgent recovery (3+ muscles in peak/overtrained)
  if (peakMuscleCount >= 3) {
    const pool = URGENT_RECOVERY_PHRASES[tone];
    const { headline, subtext } = pickPhrase(pool, `urgent:${tone}`);
    return { headline, subtext, tone };
  }

  // Priority 3: Supercompensation opportunity (3+ muscles in charged)
  if (chargedMuscleCount >= 3) {
    const pool = SUPERCOMP_PHRASES[tone];
    const { headline, subtext } = pickPhrase(pool, `supercomp:${tone}`);
    return { headline, subtext, tone };
  }

  // Priority 4: Upper/lower imbalance (30+ point difference)
  const readinessDiff = Math.abs(upperReadiness - lowerReadiness);
  if (readinessDiff >= READINESS_IMBALANCE_THRESHOLD) {
    const pool = IMBALANCE_PHRASES[tone];
    const { headline, subtext } = pickPhrase(pool, `imbalance:${tone}`);
    return { headline, subtext, tone };
  }

  // Priority 5: Dominant state commentary
  const statePool = STATE_PHRASES[dominantState][tone];
  const { headline, subtext } = pickPhrase(
    statePool,
    `state:${dominantState}:${tone}`,
  );
  return { headline, subtext, tone };
}
