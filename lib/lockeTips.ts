// lib/lockeTips.ts — Locke's offline coaching tips, keyed by cardio modality.
// Tone: short, upbeat, coach-like (Duolingo-style).

export type LockeTip = {
  setup: string;
  cues: [string, string, string];
  avoid: [string, string];
};

const TIPS: Record<string, LockeTip> = {
  running: {
    setup: "Stand tall, slight forward lean, eyes ahead.",
    cues: [
      "Land midfoot, not on your heels",
      "Keep arms at 90°, relaxed fists",
      "Breathe in rhythm — 3 steps in, 2 out",
    ],
    avoid: [
      "Don't clench your fists or hunch your shoulders",
      "Don't overstride — quick steps beat long ones",
    ],
  },

  cycling: {
    setup: "Seat at hip height, slight knee bend at the bottom of the stroke.",
    cues: [
      "Push down and pull back through the full pedal circle",
      "Keep a light grip — let the legs do the work",
      "Core tight, but stay relaxed in the upper body",
    ],
    avoid: [
      "Don't bob your hips — that's wasted energy",
      "Don't lock your elbows; keep a soft bend",
    ],
  },

  rowing: {
    setup: "Sit tall, arms straight, shins vertical before each drive.",
    cues: [
      "Drive with your legs first, then lean back, then pull arms",
      "Keep the chain level and horizontal throughout",
      "Breathe out on the drive, in on the recovery",
    ],
    avoid: [
      "Don't pull with your arms before your legs are extended",
      "Don't rush the slide — control the recovery",
    ],
  },

  walking: {
    setup: "Head up, shoulders back, arms swinging naturally.",
    cues: [
      "Strike heel-to-toe with each step",
      "Engage your core lightly — pretend you're bracing for a soft punch",
      "Maintain a pace where you can talk but feel it",
    ],
    avoid: [
      "Don't look down at your phone while moving",
      "Don't take tiny shuffling steps — stride with purpose",
    ],
  },

  swimming: {
    setup: "Body parallel to the water, head neutral, hips near the surface.",
    cues: [
      "Rotate your hips with each stroke — it powers your pull",
      "Exhale steadily underwater, inhale quickly to the side",
      "Keep your kick tight and below the waterline",
    ],
    avoid: [
      "Don't lift your head to breathe — rotate to the side instead",
      "Don't let your hips sink — kick just enough to stay level",
    ],
  },

  elliptical: {
    setup: "Stand tall on the pedals, light grip on the handles.",
    cues: [
      "Push through your heels, not your toes",
      "Drive the handles forward and back to activate your upper body",
      "Keep your core braced and avoid leaning on the machine",
    ],
    avoid: [
      "Don't let the machine drag you — stay in control of the motion",
      "Don't lean heavily on the handles; that shifts work off your legs",
    ],
  },

  stairclimber: {
    setup: "Stand upright, lightly touch the rails for balance only.",
    cues: [
      "Step fully onto each step — press through the whole foot",
      "Keep your chest up and avoid rounding your back",
      "Control the descent; don't let each step drop too fast",
    ],
    avoid: [
      "Don't lean on the handrails — it cheats your core and glutes",
      "Don't take very shallow steps; full range of motion counts",
    ],
  },

  jump_rope: {
    setup: "Feet together, elbows close to your sides, wrists doing the work.",
    cues: [
      "Land softly on the balls of your feet, knees slightly bent",
      "Keep jumps low — just enough clearance for the rope",
      "Maintain a steady, relaxed rhythm; don't muscle through it",
    ],
    avoid: [
      "Don't jump too high — that wastes energy and tires you fast",
      "Don't flare your elbows out wide when turning the rope",
    ],
  },

  other: {
    setup: "Check your posture first — good form makes everything safer.",
    cues: [
      "Stay in control of your breathing throughout",
      "Keep your core lightly engaged no matter the movement",
      "Focus on quality reps or steady effort over raw speed",
    ],
    avoid: [
      "Don't sacrifice form for pace — slow and right beats fast and sloppy",
      "Don't ignore discomfort; distinguish between effort and pain",
    ],
  },
};

export function getLockeTip(modality: string): LockeTip {
  return TIPS[modality] ?? TIPS.other;
}
