import type { CatalogPlan, Exercise, ExerciseSlot, ProgressionRule } from "./types";

// ── Pattern Cues ─────────────────────────────────────────────────────────────
// Short coaching cues keyed by movement pattern. Numbered variants (e.g.
// "core-2") are looked up by their base name ("core"). Slot-level comments
// always take priority over pattern cues.

const PATTERN_CUES: Record<string, string> = {
  // ── Squat patterns ──
  squat:            "Brace hard, break at hips and knees together, drive through whole foot.",
  "front-squat":    "Elbows high, upright torso, sit between your heels.",
  "squat-variation": "Control the descent, pause briefly at the bottom.",
  "quad-compound":  "Drive knees over toes, keep chest tall.",
  "machine-squat":  "Controlled tempo, full range of motion.",
  "unilateral-squat": "Keep front knee tracking over toes, torso upright.",
  "quad-iso":       "Squeeze at the top, slow eccentric.",
  "quad-acc":       "Push through the full range, controlled pace.",
  "quad-finisher":  "Chase the burn — slow reps, full squeeze.",

  // ── Hinge patterns ──
  hinge:            "Push hips back, slight knee bend, feel the hamstring stretch.",
  "hip-hinge":      "Hinge at hips, keep bar/weight close to legs.",
  "hip-extension":  "Squeeze glutes hard at lockout, pause at the top.",
  deadlift:         "Brace core, push the floor away, lock out with glutes.",
  "main-deadlift":  "Set up tight, big breath, push the floor away.",
  "deadlift-variation": "Same pull mechanics, adjust stance for the variation.",
  "deficit-work":   "Slower off the floor — stay patient, keep back flat.",
  "speed-dl":       "Explosive off the floor, reset each rep.",
  "speed-squat":    "Sit back fast, explode up — speed is the goal.",
  "paused-dl":      "Pause at knee height, hold position, then finish the pull.",
  "snatch-grip":    "Wide grip, stay over the bar longer, upper back tight.",
  sumo:             "Push knees out, hips close to bar, chest up.",
  "block-pull":     "Lock in your upper back, drive hips through at the top.",
  "good-morning":   "Hinge with the bar on your back, feel the hamstring load.",
  "single-leg-hinge": "Balance on one leg, push hips back, keep hips square.",

  // ── Bench / Press patterns ──
  bench:            "Arch slightly, retract shoulder blades, press through the chest.",
  "flat-press":     "Plant feet, retract scapulae, lower to mid-chest, drive up.",
  "flat-db":        "Dumbbells to chest level, squeeze pecs at the top.",
  "incline-press":  "30-45° angle, lower to upper chest, press straight up.",
  incline:          "Upper chest focus, control the negative.",
  "incline-compound": "Drive through the upper chest, keep shoulders pinned back.",
  "incline-push":   "Slight incline, target the upper pecs.",
  "machine-press":  "Controlled reps, full stretch at the bottom.",
  "squeeze-press":  "Press dumbbells together throughout — max chest contraction.",
  "upper-chest":    "Low incline or reverse grip for upper pec emphasis.",

  // ── Overhead press patterns ──
  press:            "Brace core, press straight overhead, lock out fully.",
  ohp:              "Strict press — no leg drive, squeeze glutes for stability.",
  "press-compound": "Big breath, brace, drive through the sticking point.",
  "shoulder-press": "Elbows slightly forward, press to full lockout.",
  "db-press":       "Neutral or pronated grip, control the descent.",
  "compound-press": "Full range overhead, engage core throughout.",
  "unilateral-press": "One arm at a time — resist rotation, brace hard.",

  // ── Row / Pull patterns ──
  row:              "Pull to lower chest/hip, squeeze shoulder blades together.",
  "horizontal-pull": "Retract scapulae, pull elbows past torso.",
  "heavy-row":      "Heavier load, slight body English is OK, still squeeze.",
  "row-variation":  "Vary grip width and angle for complete back development.",
  "cable-row":      "Sit tall, pull to belly button, squeeze the contraction.",
  "inverted-row":   "Body straight like a plank, pull chest to bar.",
  "pull-up":        "Dead hang start, pull until chin clears the bar.",
  "vertical-pull":  "Lead with elbows, stretch lats fully at the bottom.",
  pulldown:         "Lean back slightly, pull to upper chest, squeeze lats.",

  // ── Chest fly patterns ──
  fly:              "Slight elbow bend, stretch wide, squeeze chest at the top.",
  "cable-fly":      "Constant tension, cross hands slightly at the peak.",
  "machine-fly":    "Control the stretch, squeeze at the midline.",
  "fly-variation":  "Full stretch, controlled squeeze, don't go too heavy.",

  // ── Dip patterns ──
  dip:              "Lean forward for chest, stay upright for triceps.",
  "dip-compound":   "Controlled descent, drive up powerfully.",
  "dip-heavy":      "Add weight gradually, full range of motion.",

  // ── Lateral / Shoulder isolation ──
  lateral:          "Slight forward lean, lead with elbows, control the descent.",
  "lateral-raise":  "Raise to shoulder height, pinky slightly higher than thumb.",
  "cable-lateral":  "Constant cable tension, slow negative.",
  "lateral-variation": "Vary angle and grip for all three delt heads.",
  "front-raise":    "Raise to eye level, don't swing.",
  "rear-delt":      "Squeeze shoulder blades, hold the contraction briefly.",
  "rear-delt-focus": "Heavier rear delt work, control the weight.",
  "rear-delt-iso":  "Light weight, high reps, feel the rear delts working.",
  "reverse-flye":   "Elbows slightly bent, squeeze behind the shoulders.",
  "upright-row":    "Pull elbows high, keep bar close to body.",
  trap:             "Shrug straight up, hold at the top, slow lower.",
  "lu-complex":     "Lateral raise into front raise — continuous tension.",
  "band-work":      "Light resistance, high reps, prehab and blood flow.",

  // ── Bicep patterns ──
  bicep:            "Full stretch at bottom, squeeze at top, no swinging.",
  "bicep-compound": "Controlled curl, keep elbows pinned to sides.",
  "bicep-iso":      "Isolate the bicep, slow eccentric.",
  "bicep-stretch":  "Arms behind torso on incline — max stretch at the bottom.",
  "bicep-peak":     "Supinate hard at the top, squeeze the peak.",
  "drag-curl":      "Elbows drift back, bar stays close to body.",
  "chin-up":        "Supinated grip, pull with biceps and lats.",

  // ── Tricep patterns ──
  tricep:           "Lock out fully, squeeze the tricep at extension.",
  "tricep-push":    "Push down, lock elbows, squeeze at the bottom.",
  "tricep-extension": "Keep elbows fixed, extend fully overhead.",
  "tricep-compound": "Close grip compounds — elbows tucked, full lockout.",
  "tricep-iso":     "Isolate the long head, control the stretch.",
  "close-grip":     "Hands shoulder-width, elbows tucked, press to lockout.",
  "arm-superset":   "Alternate bicep and tricep with minimal rest.",

  // ── Superset patterns ──
  "superset-bi":    "Superset — move quickly to the paired tricep exercise.",
  "superset-tri":   "Superset — move quickly to the paired bicep exercise.",

  // ── Forearm patterns ──
  forearm:          "Controlled wrist movement, full range of motion.",

  // ── Glute patterns ──
  "glute-isolation": "Squeeze glutes at full extension, slow negative.",
  "glute-activation": "Light load, focus on mind-muscle connection.",
  "glute-finisher":  "High reps, chase the pump, finish strong.",
  "glute-iso":       "Constant tension, squeeze and hold at the top.",
  "hip-thrust":      "Drive through heels, full hip extension, glute squeeze.",
  "unilateral-hip-ext": "One side at a time — match reps, squeeze at lockout.",
  abduction:         "Push knees apart, hold at peak contraction.",
  "abduction-finisher": "High reps, constant tension, burn it out.",

  // ── Lunge patterns ──
  lunge:            "Long stride, front knee over ankle, drive up through the heel.",
  "lunge-pattern":  "Controlled step, keep torso upright.",
  "unilateral-lunge": "Single-leg focus, balance and control.",
  "step-up":        "Drive through the top foot, don't push off the bottom.",

  // ── Hamstring patterns ──
  hamstring:        "Slow eccentric, squeeze the curl at peak contraction.",
  "hamstring-curl": "Control the negative, full contraction at the top.",

  // ── Posterior chain ──
  "posterior-chain": "Hinge movement, squeeze glutes and hamstrings.",
  posterior:         "Strengthen the backside — glutes, hamstrings, erectors.",
  "back-extension":  "Hinge at hips, squeeze glutes at the top, don't hyperextend.",
  "reverse-hyper":   "Swing controlled, squeeze glutes hard at the top.",

  // ── Calf patterns ──
  calf:             "Full stretch at bottom, hard squeeze at top, pause briefly.",

  // ── Leg press ──
  "leg-press":      "Full depth, don't lock out knees, controlled tempo.",

  // ── Core patterns ──
  core:             "Brace like you're about to get punched, breathe behind the brace.",
  "anti-extension":  "Resist arching — keep ribs down, core tight.",
  "anti-rotation":   "Resist rotation, press out and hold steady.",
  rotation:          "Rotate from the torso, not the arms.",
  isometric:         "Hold position, breathe steadily, don't let form break.",
  rollout:           "Extend as far as you can control, pull back with abs.",
  "crunch-variation": "Exhale hard on the crunch, slow lower.",
  "lateral-stability": "Stack hips, squeeze obliques, don't let hips sag.",
  "reverse-crunch":  "Curl hips toward ribs, control the descent.",
  "weighted-flexion": "Add load gradually, full contraction each rep.",
  weighted:          "Weighted core — controlled reps, quality over speed.",
  "weighted-compound": "Heavy core work — brace hard, full range.",
  hanging:           "Dead hang, raise with control, don't swing.",
  "knee-raise":      "Curl knees to chest, pause, slow lower.",
  woodchop:          "Rotate through the torso, arms are just levers.",
  dynamic:           "Move with purpose, keep core engaged throughout.",
  carry:             "Stand tall, brace core, walk with control.",
  "lateral-flexion":  "Side bend with control, feel the oblique stretch.",
  "stability-finisher": "Unstable surface — fight for position, stay tight.",

  // ── Paused / Tempo work ──
  "paused-work":    "Hold the pause position, stay tight, then drive.",
  tempo:            "Count the tempo strictly, own every inch of the rep.",
  "top-single":     "Work up gradually, one clean heavy rep.",
  "box-work":       "Sit back on the box, pause, explode up.",

  // ── Mobility ──
  "mobility-finisher": "Slow, controlled stretches — breathe into the position.",

  // ── Conditioning / Cardio ──
  "warm-up":         "Elevate heart rate, loosen joints, prepare to work.",
  explosive:         "Max effort each rep, full recovery between sets.",
  kettlebell:        "Hip snap, let the bell float, control the backswing.",
  "kettlebell-compound": "Link movements smoothly, maintain grip and posture.",
  plyo:              "Land soft, absorb through the legs, explode on the next rep.",
  rowing:            "Drive with legs first, then pull with back, arms last.",
  bike:              "All-out sprint, recover fully between intervals.",
  "upper-conditioning": "Keep moving, maintain form even when fatigued.",
  sled:              "Low body position, drive through the ground.",
  "bodyweight-burnout": "Push to failure, maintain form as long as possible.",
  sprint:            "Max effort burst, full recovery between reps.",
  "lower-strength":  "Lighter load, higher reps, keep heart rate up.",
  "full-body":       "Every rep hits everything — smooth, powerful transitions.",
  crawl:             "Stay low, opposite hand and foot move together.",
  "steady-state":    "Moderate pace, sustainable effort, steady breathing.",
  "wall-ball":       "Full squat, launch the ball, catch and descend immediately.",
  "kb-complex":      "Chain movements without putting the bell down.",
  agility:           "Quick feet, stay on the balls of your feet.",
  conditioning:      "Push the pace, recover on the rest, repeat.",

  // ── Rehab / Prehab ──
  "external-rotation": "Light weight, elbow pinned, rotate out slowly.",
  "rehab-stability":   "Light load, perfect form, protect the joint.",
  "rotator-finisher":  "Prehab work — slow, controlled, feel the small muscles.",

  // ── Misc ──
  cable:             "Constant cable tension, slow and controlled.",
  unilateral:        "One side at a time — match reps, control the movement.",
  "accessory-push":  "Lighter pressing to build volume without taxing recovery.",
  "horizontal-push": "Push away from you, engage chest and triceps.",
  "vertical-push":   "Press overhead with full lockout.",
  "push-up-variation": "Chest to floor, elbows at 45°, full lockout.",
  burnout:           "Go until you can't, rest briefly, go again.",
  "pump-finisher":   "Light weight, high reps, max pump.",
  finisher:          "Last exercise — leave nothing in the tank.",
  isolation:         "Slow and controlled, feel every rep.",
  bodyweight:        "Bodyweight to failure, quality reps.",
  "grip-carry":      "Crush the handle, walk tall, brace everything.",
  "shoulder-acc":    "Accessory shoulder work — lighter, controlled.",
  "machine-push":    "Guided path, focus on the squeeze.",
  "main-squat":      "Your main squat variation — brace, descend with control, drive up.",
};

function slot(
  movementPattern: string,
  variations: string[],
  sets: string,
  reps: string,
  day: string,
  warmUpSets = "0",
  restTime = "90",
  comments = ""
): ExerciseSlot {
  return { movementPattern, variations, sets, reps, day, warmUpSets, restTime, comments };
}

// ── Block Periodization System ────────────────────────────────────────────────
//
// 12-week programme divided into 3 blocks × 4 weeks each:
//
//   Block 1 – ACCUMULATION  (Weeks 1–4):  8–15 reps, higher volume, moderate loads
//   Block 2 – INTENSIFICATION (Weeks 5–8): 4–8 reps, heavier loads, less volume
//   Block 3 – REALIZATION   (Weeks 9–12): 1–5 reps, lowest volume, highest intensity
//
// Within every block the week roles are:
//   Week 1: Introduce stimulus (moderate)
//   Week 2: Build (volume or intensity increase)
//   Week 3: Peak stress (hardest week of the block)
//   Week 4: Deload / pivot (reduced volume and intensity)
//
// Week 4, 8, and 12 are always deload weeks.

interface BlockWeekParams {
  sets: string;
  reps: string;
  phaseLabel: string;
  isDeload: boolean;
}

/**
 * Return the per-week sets/reps prescription for a given week (1-12),
 * exercise role (compound vs accessory), and progression type (linear vs percentage).
 *
 * Each of the 12 weeks produces a unique combination for both roles.
 */
function getBlockWeekParams(
  week: number,
  isCompound: boolean,
  progressionType: "linear" | "percentage",
  totalWeeks: number = 12
): BlockWeekParams {

  // ── 3-week programme (no deload) ────────────────────────────────────────────
  // W1 = Accumulation, W2 = Intensification, W3 = Realization
  if (totalWeeks === 3) {
    const phaseLabel =
      week === 1 ? "Accumulation" :
      week === 2 ? "Intensification" : "Realization";

    if (isCompound) {
      if (progressionType === "linear") {
        const TABLE: { sets: string; reps: string }[] = [
          { sets: "4", reps: "8" },   // W1
          { sets: "4", reps: "5" },   // W2
          { sets: "5", reps: "3" },   // W3
        ];
        return { ...TABLE[week - 1], phaseLabel, isDeload: false };
      }
      // percentage
      const TABLE: { sets: string; reps: string }[] = [
        { sets: "4", reps: "10" },  // W1
        { sets: "4", reps: "7" },   // W2
        { sets: "5", reps: "5" },   // W3
      ];
      return { ...TABLE[week - 1], phaseLabel, isDeload: false };
    }
    // accessories
    const TABLE: { sets: string; reps: string }[] = [
      { sets: "3", reps: "15" },  // W1
      { sets: "3", reps: "12" },  // W2
      { sets: "3", reps: "10" },  // W3
    ];
    return { ...TABLE[week - 1], phaseLabel, isDeload: false };
  }

  // ── 6-week programme (deload week 6) ────────────────────────────────────────
  // W1-2 = Accumulation, W3-4 = Intensification, W5 = Realization, W6 = Deload
  if (totalWeeks === 6) {
    const isDeload = week === 6;
    const phaseLabel =
      week <= 2 ? "Accumulation" :
      week <= 4 ? "Intensification" :
      week <= 6 ? "Realization" : "Realization";

    if (isCompound) {
      if (progressionType === "linear") {
        const TABLE: { sets: string; reps: string }[] = [
          { sets: "4", reps: "10" },  // W1
          { sets: "5", reps: "8" },   // W2
          { sets: "4", reps: "6" },   // W3
          { sets: "5", reps: "4" },   // W4
          { sets: "5", reps: "3" },   // W5
          { sets: "3", reps: "8" },   // W6 deload
        ];
        return { ...TABLE[week - 1], phaseLabel, isDeload };
      }
      // percentage
      const TABLE: { sets: string; reps: string }[] = [
        { sets: "4", reps: "12" },  // W1
        { sets: "4", reps: "10" },  // W2
        { sets: "4", reps: "8" },   // W3
        { sets: "5", reps: "6" },   // W4
        { sets: "5", reps: "5" },   // W5
        { sets: "3", reps: "10" },  // W6 deload
      ];
      return { ...TABLE[week - 1], phaseLabel, isDeload };
    }
    // accessories
    const TABLE: { sets: string; reps: string }[] = [
      { sets: "3", reps: "15" },  // W1
      { sets: "4", reps: "12" },  // W2
      { sets: "3", reps: "12" },  // W3
      { sets: "4", reps: "10" },  // W4
      { sets: "3", reps: "10" },  // W5
      { sets: "2", reps: "12" },  // W6 deload
    ];
    return { ...TABLE[week - 1], phaseLabel, isDeload };
  }

  // ── 12-week programme (original) ────────────────────────────────────────────
  // Deload flags — weeks 4, 8, 12 are always deloads
  const deloadWeeks = new Set([4, 8, 12]);
  const isDeload = deloadWeeks.has(week);

  const phaseLabel =
    week <= 4 ? "Accumulation" :
    week <= 8 ? "Intensification" :
    week <= 12 ? "Realization" : "Realization";

  if (isCompound) {
    if (progressionType === "linear") {
      // Linear strength progression (powerlifting / strength plans)
      // Block 1 – ACCUMULATION: heavier reps 8-10, building base
      // Block 2 – INTENSIFICATION: strength focus 4-6 reps
      // Block 3 – REALIZATION: 1-5 reps, peaking
      const TABLE: { sets: string; reps: string }[] = [
        // Wk 1  introduce
        { sets: "4", reps: "10" },
        // Wk 2  build
        { sets: "4", reps: "9" },
        // Wk 3  peak stress
        { sets: "5", reps: "8" },
        // Wk 4  deload
        { sets: "3", reps: "10" },
        // Wk 5  introduce B2
        { sets: "4", reps: "6" },
        // Wk 6  build
        { sets: "5", reps: "5" },
        // Wk 7  peak stress
        { sets: "5", reps: "4" },
        // Wk 8  deload
        { sets: "3", reps: "8" },
        // Wk 9  introduce B3
        { sets: "4", reps: "4" },
        // Wk 10 build
        { sets: "5", reps: "3" },
        // Wk 11 peak stress
        { sets: "6", reps: "2" },
        // Wk 12 deload / test
        { sets: "3", reps: "5" },
      ];
      return { ...TABLE[week - 1], phaseLabel, isDeload };
    }

    // Percentage / hypertrophy progression
    // Block 1 – ACCUMULATION: high reps 10-15
    // Block 2 – INTENSIFICATION: moderate 6-10 reps
    // Block 3 – REALIZATION: lower 4-8 reps, peak intensity
    const TABLE: { sets: string; reps: string }[] = [
      // Wk 1  introduce
      { sets: "4", reps: "12" },
      // Wk 2  build
      { sets: "4", reps: "11" },
      // Wk 3  peak stress
      { sets: "5", reps: "10" },
      // Wk 4  deload
      { sets: "3", reps: "12" },
      // Wk 5  introduce B2
      { sets: "4", reps: "8" },
      // Wk 6  build
      { sets: "4", reps: "7" },
      // Wk 7  peak stress
      { sets: "5", reps: "6" },
      // Wk 8  deload
      { sets: "3", reps: "10" },
      // Wk 9  introduce B3
      { sets: "4", reps: "6" },
      // Wk 10 build
      { sets: "5", reps: "5" },
      // Wk 11 peak stress
      { sets: "5", reps: "4" },
      // Wk 12 deload / unload
      { sets: "3", reps: "8" },
    ];
    return { ...TABLE[week - 1], phaseLabel, isDeload };
  }

  // Accessories — higher reps throughout, taper down across blocks
  // Block 1: 12-15 reps (hypertrophy emphasis)
  // Block 2: 10-12 reps (moderate)
  // Block 3: 8-10 reps (lower volume, higher effort)
  // Deload weeks: 2 sets, higher reps (recovery)
  const TABLE: { sets: string; reps: string }[] = [
    // Wk 1
    { sets: "3", reps: "15" },
    // Wk 2
    { sets: "3", reps: "14" },
    // Wk 3
    { sets: "4", reps: "12" },
    // Wk 4  deload
    { sets: "2", reps: "15" },
    // Wk 5
    { sets: "3", reps: "12" },
    // Wk 6
    { sets: "3", reps: "11" },
    // Wk 7
    { sets: "4", reps: "10" },
    // Wk 8  deload
    { sets: "2", reps: "12" },
    // Wk 9
    { sets: "3", reps: "10" },
    // Wk 10
    { sets: "3", reps: "9" },
    // Wk 11
    { sets: "3", reps: "8" },
    // Wk 12 deload
    { sets: "2", reps: "10" },
  ];
  return { ...TABLE[week - 1], phaseLabel, isDeload };
}

/** First 2 slots per day are compounds, rest are accessories */
function isCompoundBySlotPosition(
  slotIndex: number,
  allSlots: ExerciseSlot[]
): boolean {
  const base = allSlots[slotIndex];
  let posInDay = 0;
  for (let i = 0; i < slotIndex; i++) {
    if (allSlots[i].day === base.day) posInDay++;
  }
  return posInDay < 2;
}

/**
 * Pick the exercise variation for a given slot, week, and slot index.
 *
 * CRITICAL: No two weeks (1-12) may produce the same full-day routine.
 *
 * With only 4 variations per slot, a single rotation formula repeats every
 * 4 weeks. To guarantee 12 unique day fingerprints we use two orthogonal
 * sequences (a Graeco-Latin square construction): even-indexed slots use
 * sequence A, odd-indexed slots use sequence B. Because (A[i], B[i]) is
 * unique for all 12 weeks, the full day tuple is always unique.
 *
 * Each slot also gets an additive offset (slotIndex) so different exercises
 * within the same day don't land on the same variation.
 */
// Orthogonal pair — (SEQ_A[w], SEQ_B[w]) is unique for all w ∈ 0..11
const SEQ_A = [0, 1, 2, 3, 3, 0, 1, 2, 1, 2, 3, 0]; // blocks shifted by 0, 3, 1
const SEQ_B = [0, 1, 2, 3, 2, 3, 0, 1, 3, 0, 1, 2]; // blocks shifted by 0, 2, 3

function pickVariation(
  s: ExerciseSlot,
  week: number,
  slotIndex: number,
  _isCompound: boolean
): string {
  if (s.variations.length <= 1) return s.variations[0];

  const pool = s.variations.length;
  const w = week - 1; // 0-indexed

  // Even slots use sequence A, odd slots use sequence B
  const baseIdx = (slotIndex % 2 === 0) ? SEQ_A[w] : SEQ_B[w];

  // Shift by slotIndex so different slots in the same day pick different variations
  const idx = (baseIdx + slotIndex) % pool;
  return s.variations[idx];
}

/**
 * Expand exercise slots into a full 12-week block periodised programme.
 *
 * Block 1 – ACCUMULATION  (Weeks 1–4):  high volume, moderate intensity, 8-15 reps
 * Block 2 – INTENSIFICATION (Weeks 5–8): moderate volume, higher intensity, 4-8 reps
 * Block 3 – REALIZATION   (Weeks 9–12): low volume, peak intensity, 1-5 reps
 *
 * Weeks 4, 8, and 12 are always deload weeks with reduced sets and lighter loads.
 */
function expandSlotsWithProgression(
  slots: ExerciseSlot[],
  totalWeeks: number,
  progressionType: "linear" | "percentage"
): Exercise[] {
  const all: Exercise[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const isCompound = isCompoundBySlotPosition(i, slots);
      const { sets, reps } = getBlockWeekParams(w, isCompound, progressionType, totalWeeks);
      const exerciseName = pickVariation(s, w, i, isCompound);

      // Slot-specific comments take priority, then pattern cue lookup
      const basePattern = s.movementPattern.replace(/-\d+$/, "");
      const cue = s.comments || PATTERN_CUES[s.movementPattern] || PATTERN_CUES[basePattern] || "";

      all.push({
        exercise: exerciseName,
        sets,
        reps,
        weight: "",
        comments: cue,
        week: `Week ${w}`,
        day: s.day,
        warmUpSets: s.warmUpSets,
        restTime: s.restTime,
        notes: "",
      });
    }
  }

  return all;
}

const LINEAR_STRENGTH: ProgressionRule = { type: "linear", increment: 2.5 };
const PERCENTAGE_HYPERTROPHY: ProgressionRule = { type: "percentage", percentIncrease: 2.5 };

// ── Catalog Plans ────────────────────────────────────────────────────────────

export const CATALOG_PLANS: CatalogPlan[] = [
  // ─── 1. Glute Buster ─────────────────────────────────────────────────────────
  {
    id: "glute-buster",
    name: "Glute Buster",
    goal: "Lower Body / Glutes",
    description: "A glute-focused programme with hip thrusts, RDLs, and targeted isolation work across four training days.",
    difficulty: "Intermediate",
    daysPerWeek: 4,
    totalWeeks: 12,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("hip-extension", ["Barbell Hip Thrust", "Smith Machine Hip Thrust", "Banded Barbell Hip Thrust", "Foot-Elevated Hip Thrust"], "4", "10-12", "Day 1", "2", "120"),
      slot("hip-hinge", ["Romanian Deadlift", "Stiff-Leg Deadlift", "Dumbbell RDL", "Trap Bar RDL"], "4", "8-10", "Day 1", "2", "120"),
      slot("unilateral-squat", ["Bulgarian Split Squat", "Reverse Lunge", "Step-Up", "Front-Foot Elevated Split Squat"], "3", "10-12", "Day 1", "1", "90"),
      slot("glute-isolation", ["Cable Kickback", "Donkey Kick (Machine)", "Single-Leg Cable Kickback", "Kneeling Cable Kickback"], "3", "12-15", "Day 1", "0", "60"),
      slot("glute-activation", ["Glute Bridge (Banded)", "Frog Pump", "Fire Hydrant (Banded)", "Banded Clamshell"], "3", "15-20", "Day 1", "0", "60"),
      // Day 2
      slot("deadlift-variation", ["Sumo Deadlift", "Sumo Block Pull", "Wide-Stance Leg Press", "Sumo RDL"], "4", "6-8", "Day 2", "2", "150"),
      slot("squat-variation", ["Goblet Squat", "Heel-Elevated Goblet Squat", "Dumbbell Squat", "Landmine Squat"], "3", "12-15", "Day 2", "1", "90"),
      slot("abduction", ["Hip Abduction Machine", "Seated Band Abduction", "Cable Hip Abduction", "Standing Band Abduction"], "3", "15-20", "Day 2", "0", "60"),
      slot("unilateral-hip-ext", ["Single-Leg Hip Thrust", "Single-Leg Glute Bridge", "B-Stance Hip Thrust", "Kickstand Hip Thrust"], "3", "10-12", "Day 2", "0", "60"),
      slot("abduction-finisher", ["Seated Band Abduction", "Clamshell (Banded)", "Side-Lying Hip Abduction", "Cable Standing Abduction"], "3", "20", "Day 2", "0", "45"),
      // Day 3
      slot("quad-compound", ["Front Squat", "Goblet Squat", "Safety Bar Squat", "Belt Squat"], "4", "8-10", "Day 3", "2", "120"),
      slot("lunge-pattern", ["Walking Lunge", "Reverse Lunge", "Curtsy Lunge", "Deficit Reverse Lunge"], "3", "12 each", "Day 3", "1", "90"),
      slot("posterior-chain", ["Cable Pull-Through", "Kettlebell Swing", "Band Pull-Through", "Dumbbell Pull-Through"], "3", "12-15", "Day 3", "0", "60"),
      slot("back-extension", ["Reverse Hyperextension", "Back Extension", "45-Degree Hyper", "Glute-Focused Back Extension"], "3", "12-15", "Day 3", "0", "60"),
      slot("glute-finisher", ["Frog Pump", "Glute Bridge Pulse", "Banded Glute Kickback", "Hip Thrust (Burnout)"], "3", "20", "Day 3", "0", "45"),
      // Day 4
      slot("single-leg-hinge", ["Single-Leg RDL", "Single-Leg Deadlift", "B-Stance RDL", "Kickstand Deadlift"], "4", "8-10", "Day 4", "1", "90"),
      slot("hamstring-curl", ["Seated Leg Curl", "Lying Leg Curl", "Nordic Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 4", "0", "60"),
      slot("unilateral-lunge", ["Curtsy Lunge", "Lateral Lunge", "Step-Up", "Skater Squat"], "3", "10 each", "Day 4", "0", "90"),
      slot("glute-iso", ["Cable Pull-Through", "Cable Kickback", "Single-Leg Glute Bridge", "Banded Hip Thrust"], "3", "12-15", "Day 4", "0", "60"),
      slot("mobility-finisher", ["90/90 Hip Switch", "Pigeon Stretch (Loaded)", "Cossack Squat", "Adductor Rockback"], "3", "10 each", "Day 4", "0", "45"),
    ], 12, "percentage"),
  },

  // ─── 2. Chest Pump ───────────────────────────────────────────────────────────
  {
    id: "chest-pump",
    name: "Chest Pump",
    goal: "Push / Chest",
    description: "High-volume chest programme mixing compound presses with isolation flyes across four training days.",
    difficulty: "Intermediate",
    daysPerWeek: 4,
    totalWeeks: 12,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("flat-press", ["Flat Barbell Bench Press", "Flat Dumbbell Bench Press", "Machine Chest Press", "Floor Press"], "4", "6-8", "Day 1", "2", "150"),
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Incline Smith Press", "Low-Incline Dumbbell Press"], "4", "8-10", "Day 1", "1", "120"),
      slot("cable-fly", ["Cable Crossover", "High-to-Low Cable Flye", "Mid-Cable Flye", "Standing Cable Flye"], "3", "12-15", "Day 1", "0", "60"),
      slot("fly", ["Dumbbell Flye", "Incline Dumbbell Flye", "Pec Deck Machine", "Machine Flye"], "3", "12-15", "Day 1", "0", "60"),
      slot("burnout", ["Push-Up (Burnout)", "Diamond Push-Up", "Decline Push-Up", "Wide Push-Up"], "2", "AMRAP", "Day 1", "0", "60"),
      // Day 2
      slot("incline-compound", ["Incline Barbell Press", "Incline Dumbbell Press", "Incline Smith Press", "Incline Machine Press"], "4", "6-8", "Day 2", "2", "150"),
      slot("flat-db", ["Flat Dumbbell Press", "Flat Barbell Bench Press", "Close-Grip Bench Press", "Floor Dumbbell Press"], "4", "8-10", "Day 2", "1", "120"),
      slot("machine-fly", ["Pec Deck Machine", "Machine Flye", "Plate-Loaded Chest Flye", "Seated Machine Flye"], "3", "12-15", "Day 2", "0", "60"),
      slot("cable-fly-2", ["Low-to-High Cable Flye", "Cable Crossover", "Mid-Cable Flye", "Single-Arm Cable Flye"], "3", "12-15", "Day 2", "0", "60"),
      slot("dip", ["Dip (Chest Emphasis)", "Weighted Dip", "Assisted Dip", "Ring Dip"], "3", "8-12", "Day 2", "1", "90"),
      // Day 3
      slot("squeeze-press", ["Dumbbell Squeeze Press", "Svend Press", "Hex Press", "Plate Squeeze Press"], "4", "10-12", "Day 3", "1", "90"),
      slot("machine-press", ["Machine Chest Press", "Smith Machine Bench", "Hammer Strength Press", "Plate-Loaded Press"], "3", "10-12", "Day 3", "1", "90"),
      slot("cable", ["High-to-Low Cable Flye", "Cable Crossover", "Low-to-High Cable Flye", "Cable Iron Cross"], "3", "12-15", "Day 3", "0", "60"),
      slot("isolation", ["Svend Press", "Plate Squeeze Press", "Pec Deck (Partial ROM)", "Dumbbell Pullover"], "3", "12-15", "Day 3", "0", "60"),
      slot("bodyweight", ["Decline Push-Up", "Push-Up (Burnout)", "Wide Push-Up", "Deficit Push-Up"], "2", "AMRAP", "Day 3", "0", "60"),
      // Day 4
      slot("upper-chest", ["Low-Incline Dumbbell Press", "Reverse-Grip Bench Press", "Landmine Press", "Incline Machine Press"], "4", "8-10", "Day 4", "1", "120"),
      slot("dip-compound", ["Weighted Dip", "Dip (Chest Emphasis)", "Ring Dip", "Assisted Dip"], "3", "8-10", "Day 4", "1", "90"),
      slot("fly-variation", ["Incline Dumbbell Flye", "Incline Cable Flye", "Pec Deck Machine", "Dumbbell Flye"], "3", "12-15", "Day 4", "0", "60"),
      slot("tricep-push", ["Close-Grip Bench Press", "Tricep Dip", "Diamond Push-Up", "JM Press"], "3", "10-12", "Day 4", "0", "90"),
      slot("pump-finisher", ["Machine Chest Press (Drop Set)", "Push-Up (Burnout)", "Cable Crossover", "Pec Deck (21s)"], "2", "AMRAP", "Day 4", "0", "45"),
    ], 12, "percentage"),
  },

  // ─── 3. Arm Destroyer ────────────────────────────────────────────────────────
  {
    id: "arm-destroyer",
    name: "Arm Destroyer",
    goal: "Arms",
    description: "Beginner-friendly arm programme alternating biceps and triceps work with supersets and heavy compound lifts across four days.",
    difficulty: "Beginner",
    daysPerWeek: 4,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("bicep-compound", ["Barbell Curl", "EZ-Bar Curl", "Thick-Bar Curl", "Cheat Curl"], "3", "10-12", "Day 1", "1", "90"),
      slot("bicep-iso", ["Hammer Curl", "Cross-Body Hammer Curl", "Rope Hammer Curl", "Dumbbell Hammer Curl"], "3", "10-12", "Day 1", "0", "60"),
      slot("tricep-push", ["Tricep Rope Pushdown", "Tricep V-Bar Pushdown", "Tricep Straight-Bar Pushdown", "Single-Arm Pushdown"], "3", "12-15", "Day 1", "1", "60"),
      slot("tricep-extension", ["Overhead Tricep Extension", "Dumbbell Overhead Extension", "Cable Overhead Extension", "EZ-Bar Overhead Extension"], "3", "10-12", "Day 1", "0", "60"),
      slot("forearm", ["Wrist Curl", "Reverse Wrist Curl", "Farmer Hold", "Plate Pinch"], "2", "15-20", "Day 1", "0", "45"),
      // Day 2
      slot("bicep-stretch", ["Incline Dumbbell Curl", "Bayesian Curl", "Cable Curl (Behind)", "Incline Hammer Curl"], "3", "10-12", "Day 2", "1", "90"),
      slot("bicep-peak", ["Concentration Curl", "Spider Curl", "Preacher Curl", "Cable Concentration Curl"], "3", "10-12", "Day 2", "0", "60"),
      slot("tricep-compound", ["Close-Grip Bench Press", "Close-Grip Floor Press", "JM Press", "Weighted Bench Dip"], "3", "8-10", "Day 2", "1", "90"),
      slot("tricep-iso", ["Skull Crusher", "Dumbbell Skull Crusher", "Cable Skull Crusher", "EZ-Bar Skull Crusher"], "3", "10-12", "Day 2", "0", "60"),
      slot("forearm-2", ["Reverse Curl", "Zottman Curl", "Hammer Curl (Slow Eccentric)", "Pronation/Supination"], "2", "12-15", "Day 2", "0", "60"),
      // Day 3
      slot("superset-bi", ["EZ-Bar Curl", "Barbell Curl", "Cable Curl", "Machine Curl"], "3", "10-12", "Day 3", "1", "60", "Superset with Dips"),
      slot("superset-tri", ["Dip (Tricep Emphasis)", "Bench Dip", "Close-Grip Push-Up", "Weighted Dip"], "3", "10-12", "Day 3", "1", "60", "Superset with EZ-Bar Curl"),
      slot("superset-bi-2", ["Cable Curl", "Machine Curl", "Band Curl", "High Cable Curl"], "3", "12-15", "Day 3", "0", "45", "Superset with Pushdown"),
      slot("superset-tri-2", ["Tricep Pushdown (V-Bar)", "Tricep Rope Pushdown", "Single-Arm Pushdown", "Reverse-Grip Pushdown"], "3", "12-15", "Day 3", "0", "45", "Superset with Cable Curl"),
      slot("forearm-3", ["Behind-the-Back Wrist Curl", "Plate Pinch", "Wrist Roller", "Grip Crush"], "2", "15-20", "Day 3", "0", "45"),
      // Day 4
      slot("chin-up", ["Chin-Up", "Weighted Chin-Up", "Neutral-Grip Chin-Up", "Band-Assisted Chin-Up"], "3", "6-8", "Day 4", "1", "120"),
      slot("close-grip", ["Close-Grip Bench Press", "Close-Grip Floor Press", "Close-Grip Smith Press", "JM Press"], "3", "6-8", "Day 4", "1", "120"),
      slot("drag-curl", ["Drag Curl", "Cable Drag Curl", "Barbell Curl (Wide Grip)", "Preacher Curl"], "3", "10-12", "Day 4", "0", "60"),
      slot("dip-heavy", ["Weighted Dip", "Dip (Tricep Emphasis)", "Ring Dip", "Bench Dip (Weighted)"], "3", "8-10", "Day 4", "0", "90"),
      slot("finisher", ["21s Curl", "Burnout Pushdown", "Band Curl (100 reps)", "Tricep Kickback (Burnout)"], "2", "21", "Day 4", "0", "45"),
    ], 12, "linear"),
  },

  // ─── 4. Full Body Burn ───────────────────────────────────────────────────────
  {
    id: "full-body-burn",
    name: "Full Body Burn",
    goal: "Full Body",
    description: "Four full-body sessions per week hitting all major muscle groups with compound lifts, accessories, and conditioning.",
    difficulty: "Beginner",
    daysPerWeek: 4,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("squat", ["Barbell Squat", "Goblet Squat", "Leg Press", "Smith Machine Squat"], "3", "8-10", "Day 1", "2", "120"),
      slot("horizontal-push", ["Flat Dumbbell Bench Press", "Barbell Bench Press", "Machine Chest Press", "Floor Press"], "3", "8-10", "Day 1", "1", "90"),
      slot("horizontal-pull", ["Bent-Over Barbell Row", "Dumbbell Row", "Seated Cable Row", "T-Bar Row"], "3", "8-10", "Day 1", "1", "90"),
      slot("vertical-push", ["Overhead Press", "Dumbbell Shoulder Press", "Arnold Press", "Landmine Press"], "3", "8-10", "Day 1", "1", "90"),
      slot("core", ["Plank", "Dead Bug", "Pallof Press", "Bird Dog"], "3", "30-45s", "Day 1", "0", "60"),
      // Day 2
      slot("hinge", ["Romanian Deadlift", "Good Morning", "Dumbbell RDL", "Trap Bar RDL"], "3", "8-10", "Day 2", "2", "120"),
      slot("incline-push", ["Incline Dumbbell Press", "Incline Barbell Press", "Landmine Press", "Incline Machine Press"], "3", "10-12", "Day 2", "1", "90"),
      slot("vertical-pull", ["Lat Pulldown", "Pull-Up (Assisted)", "Cable Pullover", "Close-Grip Pulldown"], "3", "10-12", "Day 2", "1", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12-15", "Day 2", "0", "60"),
      slot("core-2", ["Hanging Knee Raise", "Leg Raise", "Cable Crunch", "Ab Wheel Rollout"], "3", "12-15", "Day 2", "0", "60"),
      // Day 3
      slot("leg-press", ["Leg Press", "Hack Squat", "Smith Machine Squat", "Belt Squat"], "3", "10-12", "Day 3", "1", "90"),
      slot("row-variation", ["Dumbbell Row", "T-Bar Row", "Meadows Row", "Chest-Supported Row"], "3", "10-12", "Day 3", "1", "90"),
      slot("machine-push", ["Machine Chest Press", "Cable Crossover", "Pec Deck", "Hammer Strength Press"], "3", "10-12", "Day 3", "0", "60"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart", "Prone Y Raise"], "3", "15-20", "Day 3", "0", "60"),
      slot("core-3", ["Cable Crunch", "Weighted Sit-Up", "Russian Twist", "Bicycle Crunch"], "3", "15-20", "Day 3", "0", "60"),
      // Day 4
      slot("kettlebell-compound", ["Kettlebell Swing", "Kettlebell Goblet Squat", "Kettlebell Clean & Press", "Dumbbell Thruster"], "3", "12-15", "Day 4", "1", "60"),
      slot("push-up-variation", ["Push-Up", "Incline Push-Up", "Diamond Push-Up", "Deficit Push-Up"], "3", "AMRAP", "Day 4", "0", "60"),
      slot("inverted-row", ["Inverted Row", "TRX Row", "Ring Row", "Band-Assisted Pull-Up"], "3", "10-12", "Day 4", "0", "60"),
      slot("lunge-pattern", ["Walking Lunge", "Reverse Lunge", "Lateral Lunge", "Goblet Reverse Lunge"], "3", "10 each", "Day 4", "0", "60"),
      slot("core-4", ["Plank to Push-Up", "Mountain Climber", "Bear Crawl", "Pallof Press"], "3", "30s", "Day 4", "0", "45"),
    ], 12, "linear"),
  },

  // ─── 5. Squat PR Builder ─────────────────────────────────────────────────────
  {
    id: "squat-pr-builder",
    name: "Squat PR Builder",
    goal: "Strength / Squat",
    description: "Advanced squat-focused strength cycle with heavy singles, pause work, and targeted accessory lifts across four days.",
    difficulty: "Advanced",
    daysPerWeek: 4,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1 (Heavy)
      slot("main-squat", ["Back Squat", "Low-Bar Back Squat", "High-Bar Back Squat", "Heeled Back Squat"], "5", "3-5", "Day 1", "3", "180", "Heavy — RPE 8-9"),
      slot("paused-work", ["Pause Squat", "Pin Squat", "Anderson Squat", "Tempo Squat"], "3", "3", "Day 1", "1", "150", "2-sec pause at bottom"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Belt Squat", "Pendulum Squat"], "4", "8-10", "Day 1", "1", "120"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Front-Rack Lunge", "Deficit Reverse Lunge"], "3", "10 each", "Day 1", "0", "90"),
      slot("core", ["Ab Wheel Rollout", "Hanging Leg Raise", "Pallof Press", "Weighted Plank"], "3", "10-12", "Day 1", "0", "60"),
      // Day 2 (Supplemental)
      slot("front-squat", ["Front Squat", "Goblet Squat", "Safety Bar Squat", "Zercher Squat"], "4", "4-6", "Day 2", "2", "150"),
      slot("unilateral", ["Bulgarian Split Squat", "Step-Up", "Single-Leg Press", "Pistol Squat (Assisted)"], "3", "8-10", "Day 2", "1", "90"),
      slot("quad-iso", ["Leg Extension", "Sissy Squat", "Wall Sit (Weighted)", "Spanish Squat"], "3", "12-15", "Day 2", "0", "60"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 2", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Donkey Calf Raise", "Single-Leg Calf Raise"], "4", "12-15", "Day 2", "0", "60"),
      // Day 3 (Speed)
      slot("speed-squat", ["Back Squat (Speed)", "Banded Back Squat", "Box Squat (Speed)", "Chain Back Squat"], "6", "2", "Day 3", "2", "120", "60% 1RM — explosive"),
      slot("box-work", ["Box Squat", "Low Box Squat", "Pause Box Squat", "High Box Squat"], "3", "5", "Day 3", "1", "120"),
      slot("machine-squat", ["Hack Squat", "Leg Press", "Pendulum Squat", "Belt Squat"], "3", "10-12", "Day 3", "0", "90"),
      slot("posterior", ["Glute-Ham Raise", "Nordic Curl", "Reverse Hyper", "Good Morning"], "3", "8-10", "Day 3", "0", "90"),
      slot("core-2", ["Plank", "Suitcase Carry", "Farmer Walk", "Dead Bug (Weighted)"], "3", "45-60s", "Day 3", "0", "60"),
      // Day 4 (Max)
      slot("top-single", ["Back Squat (Top Single)", "Pause Squat (Heavy)", "Pin Squat (Heavy)", "Walkout + Heavy Single"], "1", "1", "Day 4", "4", "180", "Work to daily max"),
      slot("tempo", ["Tempo Squat", "1.5 Rep Squat", "Eccentric-Only Squat", "Pause Squat (3-sec)"], "3", "5", "Day 4", "1", "120", "3-1-0 tempo"),
      slot("step-up", ["Step-Up", "Reverse Lunge", "Walking Lunge", "Front-Foot Elevated Lunge"], "3", "10 each", "Day 4", "0", "90"),
      slot("quad-finisher", ["Sissy Squat", "Leg Extension", "Wall Sit", "Spanish Squat"], "3", "12-15", "Day 4", "0", "60"),
      slot("core-3", ["Hanging Leg Raise", "Ab Wheel Rollout", "Cable Crunch", "Suitcase Carry"], "3", "12-15", "Day 4", "0", "60"),
    ], 12, "linear"),
  },

  // ─── 6. Push Pull Legs ───────────────────────────────────────────────────────
  {
    id: "push-pull-legs",
    name: "Push Pull Legs",
    goal: "PPL Split",
    description: "Five-day push/pull/legs/upper/lower split with balanced volume across all movement patterns.",
    difficulty: "Intermediate",
    daysPerWeek: 5,
    totalWeeks: 12,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Push (Day 1)
      slot("flat-press", ["Flat Barbell Bench Press", "Flat Dumbbell Bench Press", "Close-Grip Bench Press", "Floor Press"], "4", "6-8", "Day 1", "2", "150"),
      slot("shoulder-press", ["Seated Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press", "Push Press"], "4", "8-10", "Day 1", "1", "90"),
      slot("incline", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Dumbbell Press", "Incline Smith Press"], "3", "10-12", "Day 1", "0", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "4", "12-15", "Day 1", "0", "60"),
      slot("tricep", ["Tricep Rope Pushdown", "Overhead Tricep Extension", "Tricep Dip", "V-Bar Pushdown"], "3", "12-15", "Day 1", "0", "60"),
      // Pull (Day 2)
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Meadows Row"], "4", "6-8", "Day 2", "2", "120"),
      slot("pull-up", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Close-Grip Pulldown"], "4", "6-8", "Day 2", "1", "120"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 2", "0", "90"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart", "Prone Y Raise"], "3", "15-20", "Day 2", "0", "60"),
      slot("bicep", ["Barbell Curl", "EZ-Bar Curl", "Dumbbell Curl", "Cable Curl"], "3", "10-12", "Day 2", "0", "60"),
      // Legs (Day 3)
      slot("squat", ["Barbell Squat", "Safety Bar Squat", "Belt Squat", "Hack Squat"], "4", "6-8", "Day 3", "3", "150"),
      slot("hip-hinge", ["Romanian Deadlift", "Stiff-Leg Deadlift", "Good Morning", "Trap Bar RDL"], "4", "8-10", "Day 3", "2", "120"),
      slot("quad-acc", ["Leg Press", "Hack Squat", "Pendulum Squat", "Front Squat"], "3", "10-12", "Day 3", "1", "90"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 3", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Leg Press Calf Raise", "Single-Leg Calf Raise"], "4", "12-15", "Day 3", "0", "60"),
      // Upper (Day 4)
      slot("ohp", ["Overhead Press", "Push Press", "Viking Press", "Z Press"], "4", "6-8", "Day 4", "2", "150"),
      slot("vertical-pull", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Chin-Up"], "4", "6-8", "Day 4", "1", "120"),
      slot("cable-fly", ["Cable Crossover", "Low-to-High Cable Flye", "Pec Deck", "Dumbbell Flye"], "3", "12-15", "Day 4", "0", "60"),
      slot("row-2", ["Dumbbell Row", "Chest-Supported Row", "Meadows Row", "Seated Cable Row"], "3", "10-12", "Day 4", "0", "90"),
      slot("arm-superset", ["EZ-Bar Curl + Skull Crusher", "Hammer Curl + Tricep Pushdown", "Cable Curl + Overhead Extension", "Preacher Curl + Dip"], "3", "10-12", "Day 4", "0", "60", "Superset arms"),
      // Lower (Day 5)
      slot("front-squat", ["Front Squat", "Goblet Squat", "Zercher Squat", "Landmine Squat"], "4", "8-10", "Day 5", "2", "120"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust", "Banded Hip Thrust"], "4", "10-12", "Day 5", "1", "90"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Lateral Lunge", "Deficit Reverse Lunge"], "3", "12 each", "Day 5", "0", "90"),
      slot("quad-iso", ["Leg Extension", "Sissy Squat", "Spanish Squat", "Wall Sit (Weighted)"], "3", "12-15", "Day 5", "0", "60"),
      slot("calf-2", ["Seated Calf Raise", "Standing Calf Raise", "Single-Leg Calf Raise", "Donkey Calf Raise"], "4", "15-20", "Day 5", "0", "60"),
    ], 12, "percentage"),
  },

  // ─── 7. 5x5 Strength ────────────────────────────────────────────────────────
  {
    id: "5x5-strength",
    name: "5x5 Strength",
    goal: "Strength",
    description: "Classic 5x5 linear progression programme built around squat, bench, row, overhead press, and deadlift across four training days.",
    difficulty: "Beginner",
    daysPerWeek: 4,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1 (A)
      slot("squat", ["Barbell Back Squat", "Pause Squat", "Tempo Squat (3-1-0)", "Close-Stance Squat"], "5", "5", "Day 1", "2", "180"),
      slot("bench", ["Barbell Bench Press", "Pause Bench Press", "Tempo Bench Press", "Feet-Up Bench Press"], "5", "5", "Day 1", "2", "150"),
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Dumbbell Row"], "5", "5", "Day 1", "1", "120"),
      // Day 2 (B)
      slot("squat-2", ["Barbell Back Squat", "Pause Squat", "Tempo Squat (3-1-0)", "Close-Stance Squat"], "5", "5", "Day 2", "2", "180"),
      slot("press", ["Overhead Press", "Strict Press (Seated)", "Push Press", "Z Press"], "5", "5", "Day 2", "2", "150"),
      slot("deadlift", ["Conventional Deadlift", "Pause Deadlift", "Deficit Deadlift", "Tempo Deadlift"], "1", "5", "Day 2", "3", "180"),
      // Day 3 (A alt)
      slot("squat-3", ["Barbell Back Squat", "Pause Squat", "Tempo Squat (3-1-0)", "Close-Stance Squat"], "5", "5", "Day 3", "2", "180"),
      slot("bench-2", ["Barbell Bench Press", "Pause Bench Press", "Tempo Bench Press", "Feet-Up Bench Press"], "5", "5", "Day 3", "2", "150"),
      slot("row-2", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Dumbbell Row"], "5", "5", "Day 3", "1", "120"),
      // Day 4 (Deadlift + Accessories)
      slot("deadlift-2", ["Conventional Deadlift", "Pause Deadlift", "Deficit Deadlift", "Tempo Deadlift"], "3", "5", "Day 4", "3", "180"),
      slot("front-squat", ["Front Squat", "Goblet Squat", "Safety Bar Squat", "Zercher Squat"], "3", "8-10", "Day 4", "1", "120"),
      slot("row-3", ["Dumbbell Row", "Chest-Supported Row", "Seated Cable Row", "T-Bar Row"], "3", "8-10", "Day 4", "0", "90"),
      slot("accessory-push", ["Dip", "Incline Dumbbell Press", "Close-Grip Bench Press", "Overhead Press (Light)"], "3", "8-10", "Day 4", "0", "90"),
      slot("core", ["Plank", "Hanging Leg Raise", "Ab Wheel Rollout", "Pallof Press"], "3", "12-15", "Day 4", "0", "60"),
    ], 12, "linear"),
  },

  // ─── 8. Core and Abs ─────────────────────────────────────────────────────────
  {
    id: "core-and-abs",
    name: "Core and Abs",
    goal: "Core",
    description: "Dedicated core programme targeting abs, obliques, and deep stabilisers with weighted, bodyweight, and anti-rotation work across four days.",
    difficulty: "Beginner",
    daysPerWeek: 4,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("weighted-flexion", ["Cable Crunch", "Weighted Sit-Up", "Machine Crunch", "Decline Weighted Crunch"], "3", "15-20", "Day 1", "0", "60"),
      slot("hanging", ["Hanging Leg Raise", "Hanging Knee Raise", "Toes-to-Bar", "Captain's Chair Leg Raise"], "3", "10-12", "Day 1", "0", "60"),
      slot("isometric", ["Plank", "RKC Plank", "Long-Lever Plank", "Weighted Plank"], "3", "45-60s", "Day 1", "0", "60"),
      slot("rotation", ["Russian Twist", "Woodchop (Cable)", "Landmine Rotation", "Medicine Ball Rotation"], "3", "20", "Day 1", "0", "45"),
      slot("anti-extension", ["Dead Bug", "Bird Dog", "Bear Crawl", "Plank Shoulder Tap"], "3", "12 each", "Day 1", "0", "45"),
      // Day 2
      slot("rollout", ["Ab Wheel Rollout", "Barbell Rollout", "Stability Ball Rollout", "TRX Fallout"], "3", "10-12", "Day 2", "0", "60"),
      slot("crunch-variation", ["Bicycle Crunch", "Reverse Crunch", "V-Up", "Toe Touch Crunch"], "3", "20", "Day 2", "0", "45"),
      slot("lateral-stability", ["Side Plank", "Copenhagen Plank", "Suitcase Carry", "Side Plank Dip"], "3", "30s each", "Day 2", "0", "45"),
      slot("anti-rotation", ["Pallof Press", "Banded Pallof Press", "Half-Kneeling Pallof Press", "Standing Pallof Hold"], "3", "12 each", "Day 2", "0", "60"),
      slot("reverse-crunch", ["Reverse Crunch", "Lying Leg Raise", "Decline Reverse Crunch", "Dragon Flag (Eccentric)"], "3", "15-20", "Day 2", "0", "45"),
      // Day 3
      slot("weighted", ["Weighted Sit-Up", "Cable Crunch", "Decline Weighted Crunch", "Plate Sit-Up"], "3", "12-15", "Day 3", "0", "60"),
      slot("knee-raise", ["Hanging Knee Raise", "Captain's Chair Knee Raise", "Decline Knee Raise", "Hanging Oblique Knee Raise"], "3", "12-15", "Day 3", "0", "60"),
      slot("woodchop", ["Woodchop (Cable)", "Landmine Rotation", "Half-Kneeling Woodchop", "Standing Woodchop"], "3", "12 each", "Day 3", "0", "60"),
      slot("dynamic", ["Mountain Climber", "Bear Crawl", "Plank to Push-Up", "Sprawl"], "3", "30s", "Day 3", "0", "45"),
      slot("isometric-2", ["Hollow Body Hold", "L-Sit", "Dead Bug (Weighted)", "Dish Hold"], "3", "30-45s", "Day 3", "0", "45"),
      // Day 4
      slot("weighted-compound", ["Weighted Hanging Leg Raise", "Cable Crunch (Heavy)", "Decline Weighted Sit-Up", "Machine Crunch (Heavy)"], "3", "10-12", "Day 4", "0", "60"),
      slot("anti-rotation-2", ["Pallof Press (Kneeling)", "Band Anti-Rotation Hold", "Landmine Anti-Rotation", "Cable Anti-Rotation Press"], "3", "12 each", "Day 4", "0", "60"),
      slot("carry", ["Farmer Walk", "Suitcase Carry", "Overhead Carry", "Waiter Walk"], "3", "40m", "Day 4", "0", "60"),
      slot("lateral-flexion", ["Side Bend (Dumbbell)", "Cable Side Bend", "Side Plank Crunch", "Oblique Crunch"], "3", "12 each", "Day 4", "0", "45"),
      slot("stability-finisher", ["Stir the Pot", "Swiss Ball Plank", "Body Saw", "TRX Plank"], "3", "30s", "Day 4", "0", "45"),
    ], 12, "linear"),
  },

  // ─── 9. Shoulder Sculptor ────────────────────────────────────────────────────
  {
    id: "shoulder-sculptor",
    name: "Shoulder Sculptor",
    goal: "Shoulders",
    description: "Balanced shoulder programme hitting all three delt heads with presses, raises, rear delt, and rotator cuff work across four days.",
    difficulty: "Intermediate",
    daysPerWeek: 4,
    totalWeeks: 12,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("press-compound", ["Seated Barbell Overhead Press", "Standing Overhead Press", "Push Press", "Viking Press"], "4", "6-8", "Day 1", "2", "150"),
      slot("lateral-raise", ["Dumbbell Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "4", "12-15", "Day 1", "0", "60"),
      slot("rear-delt", ["Face Pull", "Band Pull-Apart", "Reverse Pec Deck", "Prone Y Raise"], "3", "15-20", "Day 1", "0", "60"),
      slot("front-raise", ["Front Raise (Plate)", "Dumbbell Front Raise", "Cable Front Raise", "Landmine Front Raise"], "3", "12-15", "Day 1", "0", "60"),
      slot("trap", ["Shrug", "Dumbbell Shrug", "Behind-the-Back Shrug", "Farmer Shrug"], "3", "12-15", "Day 1", "0", "60"),
      // Day 2
      slot("db-press", ["Dumbbell Shoulder Press", "Arnold Press", "Seated Dumbbell Press (Neutral Grip)", "Half-Kneeling Dumbbell Press"], "4", "8-10", "Day 2", "2", "120"),
      slot("cable-lateral", ["Cable Lateral Raise", "Lean-Away Lateral Raise", "Cable Y Raise", "Single-Arm Cable Lateral"], "4", "12-15", "Day 2", "0", "60"),
      slot("rear-delt-2", ["Reverse Pec Deck", "Bent-Over Reverse Flye", "Prone Y Raise", "Cable Reverse Flye"], "3", "12-15", "Day 2", "0", "60"),
      slot("upright-row", ["Upright Row (Cable)", "Dumbbell Upright Row", "Cable High Pull", "Barbell Upright Row"], "3", "10-12", "Day 2", "1", "90"),
      slot("band-work", ["Band Pull-Apart", "Band Face Pull", "Band Dislocate", "Band W Raise"], "3", "20", "Day 2", "0", "45"),
      // Day 3
      slot("compound-press", ["Arnold Press", "Landmine Press", "Z Press", "Viking Press"], "4", "8-10", "Day 3", "1", "90"),
      slot("lu-complex", ["Lu Raise", "Dumbbell Y-T-W", "Prone I-Y-T Raise", "Cable Y Raise"], "3", "10-12", "Day 3", "0", "60"),
      slot("reverse-flye", ["Bent-Over Reverse Flye", "Reverse Pec Deck", "Cable Reverse Flye", "Prone Reverse Flye"], "3", "12-15", "Day 3", "0", "60"),
      slot("unilateral-press", ["Landmine Press", "Single-Arm Dumbbell Press", "Half-Kneeling Landmine Press", "Single-Arm Cable Press"], "3", "10 each", "Day 3", "1", "90"),
      slot("rehab-stability", ["Prone Y Raise", "External Rotation (Cable)", "Face Pull (Light)", "Banded External Rotation"], "3", "12-15", "Day 3", "0", "45"),
      // Day 4
      slot("rear-delt-focus", ["Face Pull (Heavy)", "Reverse Pec Deck (Heavy)", "Bent-Over Reverse Flye (Heavy)", "Cable Rear Delt Flye"], "4", "10-12", "Day 4", "0", "60"),
      slot("external-rotation", ["Cable External Rotation", "Dumbbell External Rotation", "Band External Rotation", "Side-Lying External Rotation"], "3", "15 each", "Day 4", "0", "45"),
      slot("lateral-variation", ["Lean-Away Lateral Raise", "Cable Lateral Raise", "Lu Raise", "Machine Lateral Raise"], "3", "12-15", "Day 4", "0", "60"),
      slot("rear-delt-iso", ["Prone Y Raise", "Band Pull-Apart", "Cable Face Pull", "Reverse Cable Crossover"], "3", "15-20", "Day 4", "0", "45"),
      slot("rotator-finisher", ["Internal/External Rotation (Band)", "Cuban Press", "Prone T Raise", "Shoulder CARS"], "3", "12 each", "Day 4", "0", "45"),
    ], 12, "percentage"),
  },

  // ─── 10. Deadlift Dominator ──────────────────────────────────────────────────
  {
    id: "deadlift-dominator",
    name: "Deadlift Dominator",
    goal: "Posterior Chain",
    description: "Advanced deadlift-focused programme with conventional, sumo, and deficit variations plus posterior chain accessories.",
    difficulty: "Advanced",
    daysPerWeek: 4,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1 (Heavy)
      slot("main-deadlift", ["Conventional Deadlift", "Double-Overhand Deadlift", "Touch-and-Go Deadlift", "Stiff-Bar Deadlift"], "5", "3-5", "Day 1", "3", "180", "Heavy — RPE 8-9"),
      slot("deficit-work", ["Deficit Deadlift", "Paused Deadlift", "Snatch-Grip Deadlift", "Halting Deadlift"], "3", "5", "Day 1", "1", "150", "2-inch deficit"),
      slot("row", ["Barbell Row", "Pendlay Row", "Meadows Row", "T-Bar Row"], "4", "6-8", "Day 1", "1", "120"),
      slot("posterior-chain", ["Glute-Ham Raise", "Nordic Curl", "Back Extension", "Reverse Hyperextension"], "3", "8-10", "Day 1", "0", "90"),
      slot("grip-carry", ["Farmer's Walk", "Suitcase Carry", "Dead Hang", "Plate Pinch Walk"], "3", "40m", "Day 1", "0", "90"),
      // Day 2 (Variation)
      slot("sumo", ["Sumo Deadlift", "Wide-Stance RDL", "Sumo Block Pull", "Sumo Deficit Deadlift"], "4", "4-6", "Day 2", "2", "150"),
      slot("block-pull", ["Block Pull", "Rack Pull", "Pin Pull", "High Block Pull"], "3", "3-5", "Day 2", "1", "150"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust", "Banded Hip Thrust"], "4", "8-10", "Day 2", "1", "90"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 2", "0", "90"),
      slot("core", ["Hanging Leg Raise", "Ab Wheel Rollout", "Cable Crunch", "Pallof Press"], "3", "12-15", "Day 2", "0", "60"),
      // Day 3 (Technique)
      slot("paused-dl", ["Paused Deadlift", "Tempo Deadlift", "Deficit Deadlift", "Slow Eccentric Deadlift"], "4", "3", "Day 3", "2", "150", "2-sec pause at knee"),
      slot("good-morning", ["Good Morning", "Seated Good Morning", "SSB Good Morning", "Banded Good Morning"], "3", "8-10", "Day 3", "1", "90"),
      slot("heavy-row", ["Pendlay Row", "Barbell Row", "T-Bar Row", "Seal Row"], "4", "5", "Day 3", "1", "120"),
      slot("back-extension", ["Back Extension", "45-Degree Hyper", "Reverse Hyperextension", "Weighted Back Extension"], "3", "12-15", "Day 3", "0", "60"),
      slot("core-2", ["Plank (Weighted)", "Dead Bug", "Pallof Press", "Suitcase Carry"], "3", "45-60s", "Day 3", "0", "60"),
      // Day 4 (Speed)
      slot("speed-dl", ["Deadlift (Speed)", "Banded Deadlift", "Chain Deadlift", "Block Pull (Speed)"], "6", "2", "Day 4", "2", "120", "60% 1RM — explosive"),
      slot("snatch-grip", ["Snatch-Grip Deadlift", "Snatch-Grip RDL", "Clean Pull", "Clean Deadlift"], "3", "6-8", "Day 4", "1", "120"),
      slot("reverse-hyper", ["Reverse Hyperextension", "GHR", "Back Extension", "Nordic Curl"], "3", "12-15", "Day 4", "0", "60"),
      slot("row-variation", ["Dumbbell Row", "Chest-Supported Row", "Kroc Row", "Meadows Row"], "3", "10-12", "Day 4", "0", "90"),
      slot("core-3", ["Ab Wheel Rollout", "Hanging Leg Raise", "Suitcase Carry", "Farmer Walk"], "3", "10-12", "Day 4", "0", "60"),
    ], 12, "linear"),
  },

  // ─── 11. Upper Lower Split ───────────────────────────────────────────────────
  {
    id: "upper-lower-split",
    name: "Upper Lower Split",
    goal: "Hypertrophy",
    description: "Four-day upper/lower hypertrophy split with moderate-to-high volume targeting all major muscle groups.",
    difficulty: "Intermediate",
    daysPerWeek: 4,
    totalWeeks: 12,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Upper A (Day 1)
      slot("flat-press", ["Flat Barbell Bench Press", "Dumbbell Bench Press", "Close-Grip Bench Press", "Floor Press"], "4", "6-8", "Day 1", "2", "150"),
      slot("row", ["Barbell Row", "T-Bar Row", "Pendlay Row", "Seal Row"], "4", "6-8", "Day 1", "2", "120"),
      slot("shoulder-press", ["Seated Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press", "Push Press"], "3", "8-10", "Day 1", "1", "90"),
      slot("pulldown", ["Lat Pulldown", "Pull-Up", "Close-Grip Pulldown", "Neutral-Grip Pulldown"], "3", "10-12", "Day 1", "0", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12-15", "Day 1", "0", "60"),
      slot("bicep", ["Barbell Curl", "EZ-Bar Curl", "Dumbbell Curl", "Cable Curl"], "3", "10-12", "Day 1", "0", "60"),
      slot("tricep", ["Tricep Pushdown", "Rope Pushdown", "V-Bar Pushdown", "Single-Arm Pushdown"], "3", "12-15", "Day 1", "0", "60"),
      // Lower A (Day 2)
      slot("squat", ["Barbell Squat", "Safety Bar Squat", "Belt Squat", "Hack Squat"], "4", "6-8", "Day 2", "3", "150"),
      slot("hinge", ["Romanian Deadlift", "Good Morning", "Stiff-Leg Deadlift", "Trap Bar RDL"], "4", "8-10", "Day 2", "2", "120"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Pendulum Squat", "Belt Squat"], "3", "10-12", "Day 2", "1", "90"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 2", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Donkey Calf Raise", "Single-Leg Calf Raise"], "4", "12-15", "Day 2", "0", "60"),
      slot("core", ["Cable Crunch", "Hanging Leg Raise", "Ab Wheel Rollout", "Pallof Press"], "3", "15-20", "Day 2", "0", "60"),
      // Upper B (Day 3)
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Smith Press", "Incline Machine Press"], "4", "8-10", "Day 3", "1", "120"),
      slot("vertical-pull", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Chin-Up"], "4", "6-8", "Day 3", "1", "120"),
      slot("fly", ["Cable Crossover", "Pec Deck", "Dumbbell Flye", "Machine Flye"], "3", "12-15", "Day 3", "0", "60"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 3", "0", "90"),
      slot("shoulder-acc", ["Arnold Press", "Lu Raise", "Landmine Press", "Z Press"], "3", "10-12", "Day 3", "0", "90"),
      slot("bicep-2", ["Hammer Curl", "Incline Curl", "Concentration Curl", "Spider Curl"], "3", "10-12", "Day 3", "0", "60"),
      slot("tricep-2", ["Overhead Tricep Extension", "Skull Crusher", "Tricep Kickback", "Cable Overhead Extension"], "3", "12-15", "Day 3", "0", "60"),
      // Lower B (Day 4)
      slot("front-squat", ["Front Squat", "Goblet Squat", "Zercher Squat", "Landmine Squat"], "4", "8-10", "Day 4", "2", "120"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust", "Banded Hip Thrust"], "4", "10-12", "Day 4", "1", "90"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Lateral Lunge", "Deficit Reverse Lunge"], "3", "12 each", "Day 4", "0", "90"),
      slot("quad-iso", ["Leg Extension", "Sissy Squat", "Wall Sit (Weighted)", "Spanish Squat"], "3", "12-15", "Day 4", "0", "60"),
      slot("calf-2", ["Seated Calf Raise", "Standing Calf Raise", "Single-Leg Calf Raise", "Donkey Calf Raise"], "4", "15-20", "Day 4", "0", "60"),
      slot("core-2", ["Hanging Leg Raise", "Cable Crunch", "Pallof Press", "Suitcase Carry"], "3", "12-15", "Day 4", "0", "60"),
    ], 12, "percentage"),
  },

  // ─── 12. Cardio Shred ────────────────────────────────────────────────────────
  {
    id: "cardio-shred",
    name: "Cardio Shred",
    goal: "Conditioning",
    description: "Four-day conditioning programme combining HIIT circuits, rowing intervals, and bodyweight metabolic finishers.",
    difficulty: "Beginner",
    daysPerWeek: 4,
    totalWeeks: 12,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1 (HIIT Circuit)
      slot("warm-up", ["Jump Rope", "Jumping Jacks", "High Knees", "Butt Kicks"], "3", "2 min", "Day 1", "0", "30"),
      slot("explosive", ["Burpee", "Burpee Box Jump", "Squat Jump to Burpee", "Devil Press"], "4", "10", "Day 1", "0", "45"),
      slot("kettlebell", ["Kettlebell Swing", "Kettlebell Snatch", "Kettlebell Clean", "Kettlebell High Pull"], "4", "15", "Day 1", "0", "45"),
      slot("dynamic", ["Mountain Climber", "Spider Climber", "Plank Jack", "Skater Hop"], "3", "30s", "Day 1", "0", "30"),
      slot("plyo", ["Box Jump", "Broad Jump", "Depth Jump", "Tuck Jump"], "3", "10", "Day 1", "0", "45"),
      // Day 2 (Cardio Machines)
      slot("rowing", ["Rowing Machine", "Ski Erg", "Assault Bike (Distance)", "Concept2 BikeErg"], "5", "500m", "Day 2", "0", "60", "Target pace under 2:00/500m"),
      slot("bike", ["Assault Bike", "Echo Bike", "Spin Bike Sprint", "Wattbike Sprint"], "4", "30s sprint", "Day 2", "0", "60"),
      slot("upper-conditioning", ["Battle Rope", "Rope Climb", "Ball Slam", "Medicine Ball Throw"], "3", "30s", "Day 2", "0", "45"),
      slot("sled", ["Sled Push", "Sled Drag", "Prowler Sprint", "Tire Flip"], "3", "40m", "Day 2", "0", "60"),
      slot("bodyweight-burnout", ["Plank to Push-Up", "Burpee", "Mountain Climber", "Sprawl"], "3", "10", "Day 2", "0", "30"),
      // Day 3 (Sprint + Strength)
      slot("sprint", ["Treadmill Sprint", "Bike Sprint", "Hill Sprint", "Stair Sprint"], "6", "30s", "Day 3", "0", "60"),
      slot("lower-strength", ["Goblet Squat", "Dumbbell Squat", "Kettlebell Front Squat", "Landmine Squat"], "3", "15", "Day 3", "0", "45"),
      slot("full-body", ["Dumbbell Thruster", "Kettlebell Thruster", "Barbell Thruster", "Devil Press"], "3", "12", "Day 3", "0", "45"),
      slot("lunge", ["Jumping Lunge", "Walking Lunge", "Lateral Lunge", "Reverse Lunge"], "3", "10 each", "Day 3", "0", "30"),
      slot("crawl", ["Bear Crawl", "Crab Walk", "Inchworm", "Army Crawl"], "3", "20m", "Day 3", "0", "45"),
      // Day 4 (Metabolic Finisher)
      slot("steady-state", ["Stair Climber", "Incline Walk", "Step Mill", "Elliptical (High Resistance)"], "1", "10 min", "Day 4", "0", "60"),
      slot("wall-ball", ["Wall Ball", "Medicine Ball Slam", "Med Ball Throw", "Rotational Med Ball Slam"], "4", "15", "Day 4", "0", "45"),
      slot("kb-complex", ["Kettlebell Clean & Press", "KB Snatch", "KB Thruster", "KB Long Cycle"], "3", "8 each", "Day 4", "0", "60"),
      slot("agility", ["Lateral Shuffle", "Agility Ladder", "Cone Drill", "Shuttle Run"], "3", "30s", "Day 4", "0", "30"),
      slot("conditioning", ["Sprawl", "Burpee", "Man Maker", "Devil Press"], "3", "10", "Day 4", "0", "45"),
    ], 12, "percentage"),
  },

  // ─── 13. Quick Start (3 weeks) ──────────────────────────────────────────────
  {
    id: "quick-start",
    name: "Quick Start",
    goal: "Full Body",
    description: "A beginner-friendly 3-week introduction with full-body sessions three days per week — perfect for building the habit.",
    difficulty: "Beginner",
    daysPerWeek: 3,
    totalWeeks: 3,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1 — Push & Squat
      slot("squat", ["Goblet Squat", "Barbell Back Squat", "Leg Press", "Smith Machine Squat"], "3", "8-10", "Day 1", "2", "120"),
      slot("flat-press", ["Flat Dumbbell Bench Press", "Barbell Bench Press", "Machine Chest Press", "Floor Press"], "3", "8-10", "Day 1", "1", "90"),
      slot("shoulder-press", ["Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press", "Landmine Press"], "3", "10-12", "Day 1", "0", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12-15", "Day 1", "0", "60"),
      slot("core", ["Plank", "Dead Bug", "Bird Dog", "Pallof Press"], "3", "30-45s", "Day 1", "0", "45"),
      // Day 2 — Pull & Hinge
      slot("hinge", ["Romanian Deadlift", "Dumbbell RDL", "Good Morning", "Trap Bar RDL"], "3", "8-10", "Day 2", "2", "120"),
      slot("row", ["Dumbbell Row", "Seated Cable Row", "T-Bar Row", "Chest-Supported Row"], "3", "8-10", "Day 2", "1", "90"),
      slot("vertical-pull", ["Lat Pulldown", "Pull-Up (Assisted)", "Close-Grip Pulldown", "Cable Pullover"], "3", "10-12", "Day 2", "0", "90"),
      slot("bicep", ["Dumbbell Curl", "EZ-Bar Curl", "Cable Curl", "Hammer Curl"], "3", "12-15", "Day 2", "0", "60"),
      slot("core-2", ["Cable Crunch", "Hanging Knee Raise", "Ab Wheel Rollout", "Leg Raise"], "3", "12-15", "Day 2", "0", "45"),
      // Day 3 — Full Body
      slot("leg-press", ["Leg Press", "Hack Squat", "Belt Squat", "Smith Machine Squat"], "3", "10-12", "Day 3", "1", "90"),
      slot("incline-push", ["Incline Dumbbell Press", "Incline Barbell Press", "Landmine Press", "Incline Machine Press"], "3", "10-12", "Day 3", "1", "90"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 3", "0", "90"),
      slot("lunge-pattern", ["Reverse Lunge", "Walking Lunge", "Goblet Reverse Lunge", "Lateral Lunge"], "3", "10 each", "Day 3", "0", "60"),
      slot("core-3", ["Russian Twist", "Mountain Climber", "Plank Shoulder Tap", "Bicycle Crunch"], "3", "20", "Day 3", "0", "45"),
    ], 3, "linear"),
  },

  // ─── 14. Strength Blitz (3 weeks) ───────────────────────────────────────────
  {
    id: "strength-blitz",
    name: "Strength Blitz",
    goal: "Strength",
    description: "An advanced 3-week peaking cycle with heavy compound lifts across four days — ideal as a taper or mini-block.",
    difficulty: "Advanced",
    daysPerWeek: 4,
    totalWeeks: 3,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1 — Squat Focus
      slot("main-squat", ["Back Squat", "Low-Bar Back Squat", "High-Bar Back Squat", "Heeled Back Squat"], "4", "3-5", "Day 1", "3", "180"),
      slot("paused-work", ["Pause Squat", "Pin Squat", "Tempo Squat", "Anderson Squat"], "3", "3", "Day 1", "1", "150"),
      slot("quad-acc", ["Leg Press", "Hack Squat", "Belt Squat", "Front Squat"], "3", "8-10", "Day 1", "1", "90"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 1", "0", "60"),
      slot("core", ["Ab Wheel Rollout", "Hanging Leg Raise", "Pallof Press", "Weighted Plank"], "3", "10-12", "Day 1", "0", "60"),
      // Day 2 — Bench Focus
      slot("bench", ["Barbell Bench Press", "Pause Bench Press", "Close-Grip Bench Press", "Floor Press"], "4", "3-5", "Day 2", "3", "180"),
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Dumbbell Press", "Incline Smith Press"], "3", "6-8", "Day 2", "1", "120"),
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Seal Row"], "4", "6-8", "Day 2", "1", "120"),
      slot("tricep", ["Tricep Rope Pushdown", "Overhead Tricep Extension", "V-Bar Pushdown", "Skull Crusher"], "3", "10-12", "Day 2", "0", "60"),
      slot("rear-delt", ["Face Pull", "Band Pull-Apart", "Reverse Pec Deck", "Prone Y Raise"], "3", "15-20", "Day 2", "0", "60"),
      // Day 3 — Deadlift Focus
      slot("main-deadlift", ["Conventional Deadlift", "Sumo Deadlift", "Trap Bar Deadlift", "Stiff-Bar Deadlift"], "4", "3-5", "Day 3", "3", "180"),
      slot("deficit-work", ["Deficit Deadlift", "Paused Deadlift", "Block Pull", "Rack Pull"], "3", "5", "Day 3", "1", "150"),
      slot("heavy-row", ["Pendlay Row", "Barbell Row", "T-Bar Row", "Meadows Row"], "3", "5", "Day 3", "1", "120"),
      slot("posterior-chain", ["Glute-Ham Raise", "Nordic Curl", "Reverse Hyperextension", "Back Extension"], "3", "8-10", "Day 3", "0", "90"),
      slot("core-2", ["Suitcase Carry", "Farmer Walk", "Plank (Weighted)", "Dead Bug"], "3", "40m", "Day 3", "0", "60"),
      // Day 4 — OHP + Volume
      slot("press", ["Overhead Press", "Push Press", "Z Press", "Viking Press"], "4", "3-5", "Day 4", "2", "150"),
      slot("pull-up", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Chin-Up"], "4", "6-8", "Day 4", "1", "120"),
      slot("dip-compound", ["Weighted Dip", "Dip (Chest Emphasis)", "Ring Dip", "Close-Grip Bench Press"], "3", "6-8", "Day 4", "1", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12-15", "Day 4", "0", "60"),
      slot("bicep", ["Barbell Curl", "EZ-Bar Curl", "Hammer Curl", "Cable Curl"], "3", "10-12", "Day 4", "0", "60"),
    ], 3, "linear"),
  },

  // ─── 15. Hypertrophy Surge (6 weeks) ────────────────────────────────────────
  {
    id: "hypertrophy-surge",
    name: "Hypertrophy Surge",
    goal: "Hypertrophy",
    description: "A 6-week muscle-building programme with upper/lower splits, progressive overload, and a deload in week 6.",
    difficulty: "Intermediate",
    daysPerWeek: 4,
    totalWeeks: 6,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Upper A (Day 1)
      slot("flat-press", ["Flat Barbell Bench Press", "Flat Dumbbell Bench Press", "Close-Grip Bench Press", "Floor Press"], "4", "6-8", "Day 1", "2", "150"),
      slot("row", ["Barbell Row", "T-Bar Row", "Pendlay Row", "Seal Row"], "4", "6-8", "Day 1", "2", "120"),
      slot("shoulder-press", ["Seated Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press", "Push Press"], "3", "8-10", "Day 1", "1", "90"),
      slot("pulldown", ["Lat Pulldown", "Pull-Up", "Close-Grip Pulldown", "Neutral-Grip Pulldown"], "3", "10-12", "Day 1", "0", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12-15", "Day 1", "0", "60"),
      slot("bicep", ["Barbell Curl", "EZ-Bar Curl", "Dumbbell Curl", "Cable Curl"], "3", "10-12", "Day 1", "0", "60"),
      slot("tricep", ["Tricep Pushdown", "Rope Pushdown", "V-Bar Pushdown", "Single-Arm Pushdown"], "3", "12-15", "Day 1", "0", "60"),
      // Lower A (Day 2)
      slot("squat", ["Barbell Squat", "Safety Bar Squat", "Belt Squat", "Hack Squat"], "4", "6-8", "Day 2", "3", "150"),
      slot("hinge", ["Romanian Deadlift", "Good Morning", "Stiff-Leg Deadlift", "Trap Bar RDL"], "4", "8-10", "Day 2", "2", "120"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Pendulum Squat", "Belt Squat"], "3", "10-12", "Day 2", "1", "90"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 2", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Donkey Calf Raise", "Single-Leg Calf Raise"], "4", "12-15", "Day 2", "0", "60"),
      slot("core", ["Cable Crunch", "Hanging Leg Raise", "Ab Wheel Rollout", "Pallof Press"], "3", "15-20", "Day 2", "0", "60"),
      // Upper B (Day 3)
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Smith Press", "Incline Machine Press"], "4", "8-10", "Day 3", "1", "120"),
      slot("vertical-pull", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Chin-Up"], "4", "6-8", "Day 3", "1", "120"),
      slot("fly", ["Cable Crossover", "Pec Deck", "Dumbbell Flye", "Machine Flye"], "3", "12-15", "Day 3", "0", "60"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 3", "0", "90"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart", "Prone Y Raise"], "3", "15-20", "Day 3", "0", "60"),
      slot("bicep-2", ["Hammer Curl", "Incline Curl", "Concentration Curl", "Spider Curl"], "3", "10-12", "Day 3", "0", "60"),
      slot("tricep-2", ["Overhead Tricep Extension", "Skull Crusher", "Tricep Kickback", "Cable Overhead Extension"], "3", "12-15", "Day 3", "0", "60"),
      // Lower B (Day 4)
      slot("front-squat", ["Front Squat", "Goblet Squat", "Zercher Squat", "Landmine Squat"], "4", "8-10", "Day 4", "2", "120"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust", "Banded Hip Thrust"], "4", "10-12", "Day 4", "1", "90"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Lateral Lunge", "Deficit Reverse Lunge"], "3", "12 each", "Day 4", "0", "90"),
      slot("quad-iso", ["Leg Extension", "Sissy Squat", "Wall Sit (Weighted)", "Spanish Squat"], "3", "12-15", "Day 4", "0", "60"),
      slot("calf-2", ["Seated Calf Raise", "Standing Calf Raise", "Single-Leg Calf Raise", "Donkey Calf Raise"], "4", "15-20", "Day 4", "0", "60"),
      slot("core-2", ["Hanging Leg Raise", "Cable Crunch", "Pallof Press", "Suitcase Carry"], "3", "12-15", "Day 4", "0", "60"),
    ], 6, "percentage"),
  },

  // ─── 16. Cut and Condition (6 weeks) ────────────────────────────────────────
  {
    id: "cut-and-condition",
    name: "Cut and Condition",
    goal: "Fat Loss / Conditioning",
    description: "A 6-week fat-loss programme combining resistance training with metabolic circuits to preserve muscle while cutting.",
    difficulty: "Intermediate",
    daysPerWeek: 4,
    totalWeeks: 6,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1 — Upper Strength
      slot("flat-press", ["Flat Barbell Bench Press", "Flat Dumbbell Bench Press", "Machine Chest Press", "Floor Press"], "4", "6-8", "Day 1", "2", "120"),
      slot("row", ["Barbell Row", "T-Bar Row", "Pendlay Row", "Dumbbell Row"], "4", "6-8", "Day 1", "1", "120"),
      slot("shoulder-press", ["Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press", "Landmine Press"], "3", "8-10", "Day 1", "1", "90"),
      slot("pulldown", ["Lat Pulldown", "Pull-Up", "Close-Grip Pulldown", "Neutral-Grip Pulldown"], "3", "10-12", "Day 1", "0", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12-15", "Day 1", "0", "60"),
      // Day 2 — Lower Strength
      slot("squat", ["Barbell Squat", "Safety Bar Squat", "Hack Squat", "Belt Squat"], "4", "6-8", "Day 2", "3", "150"),
      slot("hinge", ["Romanian Deadlift", "Good Morning", "Stiff-Leg Deadlift", "Trap Bar RDL"], "4", "8-10", "Day 2", "2", "120"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Pendulum Squat", "Belt Squat"], "3", "10-12", "Day 2", "1", "90"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 2", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Donkey Calf Raise", "Single-Leg Calf Raise"], "3", "12-15", "Day 2", "0", "60"),
      // Day 3 — Upper Metabolic
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Incline Machine Press", "Landmine Press"], "3", "10-12", "Day 3", "1", "60"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 3", "0", "60"),
      slot("fly", ["Cable Crossover", "Pec Deck", "Dumbbell Flye", "Machine Flye"], "3", "12-15", "Day 3", "0", "45"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart", "Prone Y Raise"], "3", "15-20", "Day 3", "0", "45"),
      slot("conditioning", ["Burpee", "Battle Rope", "Kettlebell Swing", "Man Maker"], "3", "30s", "Day 3", "0", "45"),
      // Day 4 — Lower Metabolic
      slot("front-squat", ["Front Squat", "Goblet Squat", "Landmine Squat", "Zercher Squat"], "3", "10-12", "Day 4", "1", "60"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust", "Banded Hip Thrust"], "3", "10-12", "Day 4", "1", "60"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Lateral Lunge", "Jumping Lunge"], "3", "10 each", "Day 4", "0", "45"),
      slot("kettlebell", ["Kettlebell Swing", "Kettlebell Snatch", "Kettlebell Clean", "Kettlebell High Pull"], "3", "15", "Day 4", "0", "45"),
      slot("core", ["Mountain Climber", "Plank to Push-Up", "Bear Crawl", "Sprawl"], "3", "30s", "Day 4", "0", "30"),
    ], 6, "percentage"),
  },

  // ─── 17. Powerbuilder (6 weeks) ─────────────────────────────────────────────
  {
    id: "powerbuilder-6wk",
    name: "Powerbuilder",
    goal: "Strength / Hypertrophy",
    description: "A 6-week hybrid programme blending heavy compounds with hypertrophy accessories — build strength and size simultaneously.",
    difficulty: "Intermediate",
    daysPerWeek: 4,
    totalWeeks: 6,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1 — Squat + Accessories
      slot("squat", ["Barbell Back Squat", "Pause Squat", "Tempo Squat (3-1-0)", "Close-Stance Squat"], "4", "5", "Day 1", "3", "180"),
      slot("bench", ["Barbell Bench Press", "Pause Bench Press", "Close-Grip Bench Press", "Floor Press"], "4", "5", "Day 1", "2", "150"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Belt Squat", "Pendulum Squat"], "3", "10-12", "Day 1", "1", "90"),
      slot("fly", ["Cable Crossover", "Dumbbell Flye", "Pec Deck", "Machine Flye"], "3", "12-15", "Day 1", "0", "60"),
      slot("core", ["Hanging Leg Raise", "Ab Wheel Rollout", "Cable Crunch", "Pallof Press"], "3", "12-15", "Day 1", "0", "60"),
      // Day 2 — Deadlift + Accessories
      slot("deadlift", ["Conventional Deadlift", "Sumo Deadlift", "Trap Bar Deadlift", "Pause Deadlift"], "4", "5", "Day 2", "3", "180"),
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Seal Row"], "4", "6-8", "Day 2", "1", "120"),
      slot("pulldown", ["Lat Pulldown", "Pull-Up", "Neutral-Grip Pulldown", "Close-Grip Pulldown"], "3", "10-12", "Day 2", "0", "90"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 2", "0", "60"),
      slot("bicep", ["Barbell Curl", "EZ-Bar Curl", "Hammer Curl", "Cable Curl"], "3", "10-12", "Day 2", "0", "60"),
      // Day 3 — OHP + Upper Volume
      slot("press", ["Overhead Press", "Push Press", "Z Press", "Viking Press"], "4", "5", "Day 3", "2", "150"),
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Incline Smith Press", "Low-Incline Dumbbell Press"], "3", "8-10", "Day 3", "1", "90"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 3", "0", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12-15", "Day 3", "0", "60"),
      slot("tricep", ["Tricep Pushdown", "Skull Crusher", "Overhead Extension", "V-Bar Pushdown"], "3", "12-15", "Day 3", "0", "60"),
      // Day 4 — Front Squat + Lower Volume
      slot("front-squat", ["Front Squat", "Safety Bar Squat", "Goblet Squat", "Zercher Squat"], "4", "6-8", "Day 4", "2", "150"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust", "Banded Hip Thrust"], "4", "8-10", "Day 4", "1", "90"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Deficit Reverse Lunge", "Front-Rack Lunge"], "3", "10 each", "Day 4", "0", "90"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Donkey Calf Raise", "Single-Leg Calf Raise"], "4", "12-15", "Day 4", "0", "60"),
      slot("core-2", ["Plank (Weighted)", "Farmer Walk", "Suitcase Carry", "Dead Bug (Weighted)"], "3", "45-60s", "Day 4", "0", "60"),
    ], 6, "linear"),
  },

  // ─── 18. 3-Day Strength (12 weeks) ──────────────────────────────────────────
  {
    id: "3d-strength",
    name: "3-Day Strength",
    goal: "Strength (Squat / Bench / Deadlift)",
    description: "A 12-week linear strength programme built around the big three — one heavy day each for squat, bench, and deadlift.",
    difficulty: "Intermediate",
    daysPerWeek: 3,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1 — Squat Day
      slot("squat", ["Barbell Back Squat", "Pause Squat", "Safety Bar Squat", "Tempo Squat (3-1-0)"], "4", "5", "Day 1", "3", "180"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Belt Squat", "Pendulum Squat"], "3", "8-10", "Day 1", "1", "90"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 1", "0", "60"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Bulgarian Split Squat", "Deficit Reverse Lunge"], "3", "10 each", "Day 1", "0", "90"),
      slot("core", ["Hanging Leg Raise", "Ab Wheel Rollout", "Plank (Weighted)", "Pallof Press"], "3", "12-15", "Day 1", "0", "60"),
      // Day 2 — Bench Day
      slot("bench", ["Barbell Bench Press", "Pause Bench Press", "Close-Grip Bench Press", "Floor Press"], "4", "5", "Day 2", "3", "180"),
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Dumbbell Press", "Incline Smith Press"], "3", "8-10", "Day 2", "1", "90"),
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Seal Row"], "4", "6-8", "Day 2", "1", "120"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12-15", "Day 2", "0", "60"),
      slot("tricep", ["Tricep Pushdown", "Skull Crusher", "Overhead Extension", "V-Bar Pushdown"], "3", "12-15", "Day 2", "0", "60"),
      // Day 3 — Deadlift Day
      slot("deadlift", ["Conventional Deadlift", "Sumo Deadlift", "Trap Bar Deadlift", "Pause Deadlift"], "4", "5", "Day 3", "3", "180"),
      slot("hip-hinge", ["Romanian Deadlift", "Stiff-Leg Deadlift", "Good Morning", "Dumbbell RDL"], "3", "8-10", "Day 3", "1", "120"),
      slot("pull-up", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Chin-Up"], "4", "6-8", "Day 3", "0", "120"),
      slot("bicep", ["Barbell Curl", "EZ-Bar Curl", "Hammer Curl", "Cable Curl"], "3", "10-12", "Day 3", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Donkey Calf Raise", "Single-Leg Calf Raise"], "4", "12-15", "Day 3", "0", "60"),
    ], 12, "linear"),
  },

  // ─── 19. 3-Day Hypertrophy (6 weeks) ────────────────────────────────────────
  {
    id: "3d-hypertrophy",
    name: "3-Day Hypertrophy",
    goal: "Full Body Hypertrophy",
    description: "A 6-week full-body hypertrophy programme — push-focused, pull-focused, and legs-focused sessions for maximum growth on three days.",
    difficulty: "Intermediate",
    daysPerWeek: 3,
    totalWeeks: 6,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1 — Full Body A (Push emphasis)
      slot("flat-press", ["Flat Barbell Bench Press", "Flat Dumbbell Bench Press", "Close-Grip Bench Press", "Floor Press"], "4", "8-10", "Day 1", "2", "120"),
      slot("shoulder-press", ["Seated Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press", "Push Press"], "3", "10-12", "Day 1", "1", "90"),
      slot("squat", ["Barbell Back Squat", "Goblet Squat", "Leg Press", "Belt Squat"], "3", "10-12", "Day 1", "2", "120"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12-15", "Day 1", "0", "60"),
      slot("tricep", ["Tricep Rope Pushdown", "Overhead Tricep Extension", "Skull Crusher", "V-Bar Pushdown"], "3", "12-15", "Day 1", "0", "60"),
      // Day 2 — Full Body B (Pull emphasis)
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Meadows Row"], "4", "8-10", "Day 2", "2", "120"),
      slot("pull-up", ["Lat Pulldown", "Weighted Pull-Up", "Neutral-Grip Pull-Up", "Close-Grip Pulldown"], "3", "8-10", "Day 2", "1", "90"),
      slot("hip-hinge", ["Romanian Deadlift", "Stiff-Leg Deadlift", "Dumbbell RDL", "Good Morning"], "3", "10-12", "Day 2", "2", "120"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart", "Prone Y Raise"], "3", "15-20", "Day 2", "0", "60"),
      slot("bicep", ["Barbell Curl", "EZ-Bar Curl", "Dumbbell Curl", "Cable Curl"], "3", "10-12", "Day 2", "0", "60"),
      // Day 3 — Full Body C (Legs emphasis)
      slot("squat-variation", ["Front Squat", "Hack Squat", "Safety Bar Squat", "Pendulum Squat"], "4", "8-10", "Day 3", "2", "120"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust", "Banded Hip Thrust"], "4", "10-12", "Day 3", "1", "90"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Bulgarian Split Squat", "Lateral Lunge"], "3", "10 each", "Day 3", "0", "90"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 3", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Leg Press Calf Raise", "Single-Leg Calf Raise"], "4", "12-15", "Day 3", "0", "60"),
    ], 6, "percentage"),
  },

  // ─── 20. 3-Day Athletic (6 weeks) ───────────────────────────────────────────
  {
    id: "3d-athletic",
    name: "3-Day Athletic",
    goal: "Athletic Foundations",
    description: "A beginner-friendly 6-week programme blending strength, pulling power, and conditioning across three balanced sessions.",
    difficulty: "Beginner",
    daysPerWeek: 3,
    totalWeeks: 6,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1 — Strength Foundations
      slot("squat", ["Goblet Squat", "Barbell Back Squat", "Leg Press", "Smith Machine Squat"], "3", "8-10", "Day 1", "2", "120"),
      slot("flat-press", ["Flat Dumbbell Bench Press", "Barbell Bench Press", "Machine Chest Press", "Floor Press"], "3", "8-10", "Day 1", "1", "90"),
      slot("shoulder-press", ["Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press", "Landmine Press"], "3", "10-12", "Day 1", "1", "90"),
      slot("lunge-pattern", ["Reverse Lunge", "Walking Lunge", "Goblet Reverse Lunge", "Step-Up"], "3", "10 each", "Day 1", "0", "60"),
      slot("core", ["Plank", "Dead Bug", "Bird Dog", "Pallof Press"], "3", "30-45s", "Day 1", "0", "45"),
      // Day 2 — Pull & Hinge
      slot("hinge", ["Romanian Deadlift", "Dumbbell RDL", "Trap Bar Deadlift", "Good Morning"], "3", "8-10", "Day 2", "2", "120"),
      slot("row", ["Dumbbell Row", "Seated Cable Row", "T-Bar Row", "Chest-Supported Row"], "3", "8-10", "Day 2", "1", "90"),
      slot("vertical-pull", ["Lat Pulldown", "Pull-Up (Assisted)", "Close-Grip Pulldown", "Cable Pullover"], "3", "10-12", "Day 2", "0", "90"),
      slot("bicep", ["Dumbbell Curl", "EZ-Bar Curl", "Cable Curl", "Hammer Curl"], "3", "12-15", "Day 2", "0", "60"),
      slot("core-2", ["Cable Crunch", "Hanging Knee Raise", "Ab Wheel Rollout", "Leg Raise"], "3", "12-15", "Day 2", "0", "45"),
      // Day 3 — Conditioning & Movement
      slot("kettlebell", ["Kettlebell Swing", "Kettlebell Goblet Squat", "Kettlebell Clean", "Kettlebell Snatch"], "3", "12-15", "Day 3", "1", "60"),
      slot("plyo", ["Box Jump", "Jump Squat", "Broad Jump", "Skater Jump"], "3", "8-10", "Day 3", "0", "60"),
      slot("lunge", ["Lateral Lunge", "Reverse Lunge", "Curtsy Lunge", "Walking Lunge"], "3", "10 each", "Day 3", "0", "60"),
      slot("core-3", ["Russian Twist", "Mountain Climber", "Plank Shoulder Tap", "Bicycle Crunch"], "3", "20", "Day 3", "0", "45"),
      slot("carry", ["Farmer Walk", "Suitcase Carry", "Overhead Carry", "Trap Bar Carry"], "3", "40m", "Day 3", "0", "60"),
    ], 6, "linear"),
  },

  // ─── 21. 5-Day Bro Split (12 weeks) ─────────────────────────────────────────
  {
    id: "5d-bro-split",
    name: "5-Day Bro Split",
    goal: "Hypertrophy (Chest / Back / Shoulders / Legs / Arms)",
    description: "A classic 12-week bodybuilding bro split — one muscle group per day with high volume for maximum pump and growth.",
    difficulty: "Intermediate",
    daysPerWeek: 5,
    totalWeeks: 12,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1 — Chest
      slot("flat-press", ["Flat Barbell Bench Press", "Flat Dumbbell Bench Press", "Close-Grip Bench Press", "Floor Press"], "4", "8-10", "Day 1", "2", "120"),
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Dumbbell Press", "Incline Smith Press"], "4", "8-10", "Day 1", "1", "90"),
      slot("cable-fly", ["Cable Crossover", "Low-to-High Cable Flye", "Pec Deck", "Dumbbell Flye"], "3", "12-15", "Day 1", "0", "60"),
      slot("dip-compound", ["Weighted Dip", "Chest Dip", "Machine Dip", "Ring Dip"], "3", "10-12", "Day 1", "0", "90"),
      slot("machine-press", ["Machine Chest Press", "Smith Machine Bench Press", "Hammer Strength Press", "Seated Press Machine"], "3", "12-15", "Day 1", "0", "60"),
      // Day 2 — Back
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Seal Row"], "4", "6-8", "Day 2", "2", "120"),
      slot("pull-up", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Close-Grip Pulldown"], "4", "6-8", "Day 2", "1", "120"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 2", "0", "90"),
      slot("pulldown", ["Lat Pulldown", "Straight-Arm Pulldown", "Close-Grip Pulldown", "Cable Pullover"], "3", "10-12", "Day 2", "0", "60"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart", "Prone Y Raise"], "3", "15-20", "Day 2", "0", "60"),
      // Day 3 — Shoulders
      slot("shoulder-press", ["Seated Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press", "Push Press"], "4", "8-10", "Day 3", "2", "120"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "4", "12-15", "Day 3", "0", "60"),
      slot("rear-delt-focus", ["Face Pull", "Reverse Pec Deck", "Rear Delt Cable Flye", "Prone Y Raise"], "3", "12-15", "Day 3", "0", "60"),
      slot("upright-row", ["Upright Row", "Cable Upright Row", "Dumbbell Upright Row", "Barbell Upright Row"], "3", "10-12", "Day 3", "0", "60"),
      slot("front-raise", ["Front Raise", "Cable Front Raise", "Plate Front Raise", "Alternating Dumbbell Front Raise"], "3", "12-15", "Day 3", "0", "60"),
      // Day 4 — Legs
      slot("squat", ["Barbell Back Squat", "Safety Bar Squat", "Hack Squat", "Belt Squat"], "4", "6-8", "Day 4", "3", "150"),
      slot("hip-hinge", ["Romanian Deadlift", "Stiff-Leg Deadlift", "Good Morning", "Dumbbell RDL"], "4", "8-10", "Day 4", "2", "120"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Pendulum Squat", "Belt Squat"], "3", "10-12", "Day 4", "1", "90"),
      slot("hamstring-curl", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 4", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Leg Press Calf Raise", "Single-Leg Calf Raise"], "4", "12-15", "Day 4", "0", "60"),
      // Day 5 — Arms
      slot("bicep-compound", ["Barbell Curl", "EZ-Bar Curl", "Chin-Up", "Preacher Curl"], "4", "8-10", "Day 5", "1", "90"),
      slot("tricep-compound", ["Close-Grip Bench Press", "Weighted Dip", "Skull Crusher", "JM Press"], "4", "8-10", "Day 5", "1", "90"),
      slot("bicep-iso", ["Incline Dumbbell Curl", "Concentration Curl", "Spider Curl", "Cable Curl"], "3", "12-15", "Day 5", "0", "60"),
      slot("tricep-iso", ["Tricep Rope Pushdown", "Overhead Tricep Extension", "Kickback", "V-Bar Pushdown"], "3", "12-15", "Day 5", "0", "60"),
      slot("forearm", ["Wrist Curl", "Reverse Wrist Curl", "Farmer Walk", "Plate Pinch"], "3", "15-20", "Day 5", "0", "45"),
    ], 12, "percentage"),
  },

  // ─── 22. 5-Day Strength (12 weeks) ──────────────────────────────────────────
  {
    id: "5d-strength",
    name: "5-Day Strength",
    goal: "Strength (Squat / Bench / Deadlift / Upper / Lower)",
    description: "An advanced 12-week linear strength programme — three heavy competition-lift days plus upper and lower accessory days.",
    difficulty: "Advanced",
    daysPerWeek: 5,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1 — Squat
      slot("squat", ["Barbell Back Squat", "Pause Squat", "Tempo Squat (3-1-0)", "Close-Stance Squat"], "5", "3-5", "Day 1", "3", "180"),
      slot("front-squat", ["Front Squat", "Safety Bar Squat", "Goblet Squat", "Zercher Squat"], "3", "6-8", "Day 1", "1", "120"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Bulgarian Split Squat", "Front-Rack Lunge"], "3", "10 each", "Day 1", "0", "90"),
      slot("quad-iso", ["Leg Extension", "Sissy Squat", "Spanish Squat", "Wall Sit (Weighted)"], "3", "12-15", "Day 1", "0", "60"),
      slot("core", ["Hanging Leg Raise", "Ab Wheel Rollout", "Pallof Press", "Plank (Weighted)"], "3", "12-15", "Day 1", "0", "60"),
      // Day 2 — Bench
      slot("bench", ["Barbell Bench Press", "Pause Bench Press", "Close-Grip Bench Press", "Floor Press"], "5", "3-5", "Day 2", "3", "180"),
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Dumbbell Press", "Incline Smith Press"], "3", "6-8", "Day 2", "1", "90"),
      slot("fly", ["Cable Crossover", "Dumbbell Flye", "Pec Deck", "Machine Flye"], "3", "12-15", "Day 2", "0", "60"),
      slot("tricep", ["Tricep Pushdown", "Skull Crusher", "Overhead Extension", "V-Bar Pushdown"], "3", "10-12", "Day 2", "0", "60"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart", "Prone Y Raise"], "3", "15-20", "Day 2", "0", "60"),
      // Day 3 — Deadlift
      slot("deadlift", ["Conventional Deadlift", "Sumo Deadlift", "Trap Bar Deadlift", "Pause Deadlift"], "5", "3-5", "Day 3", "3", "180"),
      slot("hip-hinge", ["Romanian Deadlift", "Stiff-Leg Deadlift", "Good Morning", "Deficit Deadlift"], "3", "6-8", "Day 3", "1", "120"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 3", "0", "60"),
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Seal Row"], "4", "6-8", "Day 3", "1", "120"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Donkey Calf Raise", "Single-Leg Calf Raise"], "4", "12-15", "Day 3", "0", "60"),
      // Day 4 — Upper Accessories
      slot("ohp", ["Overhead Press", "Push Press", "Z Press", "Viking Press"], "4", "6-8", "Day 4", "2", "150"),
      slot("pull-up", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Chin-Up"], "4", "6-8", "Day 4", "1", "120"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 4", "0", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12-15", "Day 4", "0", "60"),
      slot("arm-superset", ["EZ-Bar Curl + Skull Crusher", "Hammer Curl + Tricep Pushdown", "Cable Curl + Overhead Extension", "Preacher Curl + Dip"], "3", "10-12", "Day 4", "0", "60", "Superset arms"),
      // Day 5 — Lower Accessories
      slot("front-squat", ["Front Squat", "Safety Bar Squat", "Goblet Squat", "Zercher Squat"], "4", "6-8", "Day 5", "2", "120"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust", "Banded Hip Thrust"], "4", "8-10", "Day 5", "1", "90"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Pendulum Squat", "Belt Squat"], "3", "10-12", "Day 5", "1", "90"),
      slot("back-extension", ["Reverse Hyperextension", "Back Extension", "45-Degree Hyper", "Glute-Focused Back Extension"], "3", "12-15", "Day 5", "0", "60"),
      slot("core-2", ["Cable Crunch", "Suitcase Carry", "Farmer Walk", "Dead Bug (Weighted)"], "3", "12-15", "Day 5", "0", "60"),
    ], 12, "linear"),
  },

  // ─── 23. 5-Day Body Recomp (6 weeks) ────────────────────────────────────────
  {
    id: "5d-body-recomp",
    name: "5-Day Body Recomp",
    goal: "Push / Pull / Legs / Upper / Lower Recomp",
    description: "A 6-week push/pull/legs plus upper/lower split designed for body recomposition — build muscle and burn fat simultaneously.",
    difficulty: "Intermediate",
    daysPerWeek: 5,
    totalWeeks: 6,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1 — Push
      slot("flat-press", ["Flat Barbell Bench Press", "Flat Dumbbell Bench Press", "Close-Grip Bench Press", "Floor Press"], "4", "8-10", "Day 1", "2", "120"),
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Dumbbell Press", "Incline Smith Press"], "3", "10-12", "Day 1", "1", "90"),
      slot("shoulder-press", ["Seated Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press", "Push Press"], "3", "10-12", "Day 1", "1", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12-15", "Day 1", "0", "60"),
      slot("tricep", ["Tricep Rope Pushdown", "Overhead Tricep Extension", "Skull Crusher", "V-Bar Pushdown"], "3", "12-15", "Day 1", "0", "60"),
      // Day 2 — Pull
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Meadows Row"], "4", "6-8", "Day 2", "2", "120"),
      slot("pull-up", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Close-Grip Pulldown"], "4", "6-8", "Day 2", "1", "120"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 2", "0", "90"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart", "Prone Y Raise"], "3", "15-20", "Day 2", "0", "60"),
      slot("bicep", ["Barbell Curl", "EZ-Bar Curl", "Dumbbell Curl", "Cable Curl"], "3", "10-12", "Day 2", "0", "60"),
      // Day 3 — Legs
      slot("squat", ["Barbell Back Squat", "Safety Bar Squat", "Hack Squat", "Belt Squat"], "4", "6-8", "Day 3", "3", "150"),
      slot("hip-hinge", ["Romanian Deadlift", "Stiff-Leg Deadlift", "Good Morning", "Dumbbell RDL"], "4", "8-10", "Day 3", "2", "120"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Pendulum Squat", "Belt Squat"], "3", "10-12", "Day 3", "1", "90"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 3", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Leg Press Calf Raise", "Single-Leg Calf Raise"], "4", "12-15", "Day 3", "0", "60"),
      // Day 4 — Upper
      slot("ohp", ["Overhead Press", "Push Press", "Z Press", "Viking Press"], "4", "6-8", "Day 4", "2", "120"),
      slot("pull-up", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Chin-Up"], "3", "8-10", "Day 4", "1", "90"),
      slot("cable-fly", ["Cable Crossover", "Low-to-High Cable Flye", "Pec Deck", "Dumbbell Flye"], "3", "12-15", "Day 4", "0", "60"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 4", "0", "90"),
      slot("arm-superset", ["EZ-Bar Curl + Skull Crusher", "Hammer Curl + Tricep Pushdown", "Cable Curl + Overhead Extension", "Preacher Curl + Dip"], "3", "10-12", "Day 4", "0", "60", "Superset arms"),
      // Day 5 — Lower
      slot("front-squat", ["Front Squat", "Goblet Squat", "Zercher Squat", "Landmine Squat"], "4", "8-10", "Day 5", "2", "120"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust", "Banded Hip Thrust"], "4", "10-12", "Day 5", "1", "90"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Lateral Lunge", "Deficit Reverse Lunge"], "3", "10 each", "Day 5", "0", "90"),
      slot("quad-iso", ["Leg Extension", "Sissy Squat", "Spanish Squat", "Wall Sit (Weighted)"], "3", "12-15", "Day 5", "0", "60"),
      slot("core", ["Hanging Leg Raise", "Ab Wheel Rollout", "Cable Crunch", "Pallof Press"], "3", "12-15", "Day 5", "0", "60"),
    ], 6, "percentage"),
  },

  // ─── 21. 5-Day Peak Week ────────────────────────────────────────────────────
  {
    id: "5d-peak-week",
    name: "5-Day Peak Week",
    goal: "Strength Peaking",
    description: "An advanced 3-week peaking cycle across five days — heavy competition lifts with targeted accessories for a final push.",
    difficulty: "Advanced",
    daysPerWeek: 5,
    totalWeeks: 3,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1 — Squat
      slot("squat", ["Barbell Back Squat", "Safety Bar Squat", "Paused Back Squat", "Belt Squat"], "5", "3", "Day 1", "3", "180"),
      slot("paused-work", ["Paused Back Squat", "Pin Squat", "Tempo Back Squat", "Anderson Squat"], "4", "3", "Day 1", "1", "150"),
      slot("quad-compound", ["Front Squat", "Hack Squat", "Leg Press", "Belt Squat"], "3", "6", "Day 1", "1", "120"),
      slot("hamstring-curl", ["Leg Curl", "Nordic Curl", "Seated Leg Curl", "Swiss Ball Leg Curl"], "3", "10", "Day 1", "0", "60"),
      slot("core", ["Ab Wheel Rollout", "Hanging Leg Raise", "Pallof Press", "Plank (Weighted)"], "3", "10", "Day 1", "0", "60"),
      // Day 2 — Bench
      slot("bench", ["Flat Barbell Bench Press", "Close-Grip Bench Press", "Paused Bench Press", "Floor Press"], "5", "3", "Day 2", "3", "180"),
      slot("paused-work", ["Paused Bench Press", "Spoto Press", "Pin Press", "Board Press"], "4", "3", "Day 2", "1", "150"),
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Dumbbell Press", "Incline Smith Press"], "3", "8", "Day 2", "1", "90"),
      slot("tricep", ["Skull Crusher", "Close-Grip Floor Press", "JM Press", "Tricep Rope Pushdown"], "3", "10", "Day 2", "0", "60"),
      slot("rear-delt", ["Face Pull", "Band Pull-Apart", "Reverse Pec Deck", "Prone Y Raise"], "3", "15", "Day 2", "0", "60"),
      // Day 3 — Deadlift
      slot("deadlift", ["Conventional Deadlift", "Sumo Deadlift", "Paused Deadlift", "Trap Bar Deadlift"], "5", "3", "Day 3", "3", "180"),
      slot("deficit-work", ["Deficit Deadlift", "Paused Deadlift", "Block Pull", "Snatch-Grip Deadlift"], "4", "3", "Day 3", "1", "150"),
      slot("hip-hinge", ["Romanian Deadlift", "Stiff-Leg Deadlift", "Good Morning", "Dumbbell RDL"], "3", "6", "Day 3", "1", "120"),
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Meadows Row"], "3", "8", "Day 3", "0", "90"),
      slot("back-extension", ["Back Extension", "Reverse Hyperextension", "45-Degree Hyper", "Glute-Focused Back Extension"], "3", "12", "Day 3", "0", "60"),
      // Day 4 — Upper Accessories
      slot("ohp", ["Overhead Press", "Push Press", "Z Press", "Viking Press"], "4", "5", "Day 4", "2", "120"),
      slot("pull-up", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Chin-Up"], "4", "6", "Day 4", "1", "90"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10", "Day 4", "0", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "3", "12", "Day 4", "0", "60"),
      slot("bicep", ["Barbell Curl", "EZ-Bar Curl", "Hammer Curl", "Dumbbell Curl"], "3", "10", "Day 4", "0", "60"),
      // Day 5 — Lower Accessories
      slot("front-squat", ["Front Squat", "Goblet Squat", "Zercher Squat", "Landmine Squat"], "4", "5", "Day 5", "2", "120"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust", "Banded Hip Thrust"], "4", "8", "Day 5", "1", "90"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Bulgarian Split Squat", "Deficit Reverse Lunge"], "3", "8 each", "Day 5", "0", "90"),
      slot("hamstring-curl", ["Seated Leg Curl", "Lying Leg Curl", "Nordic Curl", "Swiss Ball Leg Curl"], "3", "10", "Day 5", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Leg Press Calf Raise", "Single-Leg Calf Raise"], "3", "12", "Day 5", "0", "60"),
    ], 3, "linear"),
  },

  // ─── 22. 5-Day Hypertrophy ──────────────────────────────────────────────────
  {
    id: "5d-hypertrophy",
    name: "5-Day Hypertrophy",
    goal: "Hypertrophy",
    description: "A 6-week bodybuilding split hitting each muscle group with dedicated volume — classic high-rep hypertrophy across five training days.",
    difficulty: "Intermediate",
    daysPerWeek: 5,
    totalWeeks: 6,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1 — Chest & Triceps
      slot("flat-press", ["Flat Barbell Bench Press", "Flat Dumbbell Bench Press", "Machine Chest Press", "Floor Press"], "4", "8-10", "Day 1", "2", "120"),
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Dumbbell Press", "Incline Smith Press"], "4", "10-12", "Day 1", "1", "90"),
      slot("cable-fly", ["Cable Crossover", "Low-to-High Cable Flye", "Pec Deck", "Dumbbell Flye"], "3", "12-15", "Day 1", "0", "60"),
      slot("tricep-push", ["Tricep Rope Pushdown", "V-Bar Pushdown", "Single-Arm Pushdown", "Reverse-Grip Pushdown"], "3", "12-15", "Day 1", "0", "60"),
      slot("tricep-extension", ["Overhead Tricep Extension", "Skull Crusher", "Cable Overhead Extension", "Dumbbell Overhead Extension"], "3", "12-15", "Day 1", "0", "60"),
      // Day 2 — Back & Biceps
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Meadows Row"], "4", "8-10", "Day 2", "2", "120"),
      slot("pull-up", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Close-Grip Pulldown"], "4", "8-10", "Day 2", "1", "90"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row", "Single-Arm Cable Row"], "3", "10-12", "Day 2", "0", "90"),
      slot("bicep-compound", ["Barbell Curl", "EZ-Bar Curl", "Dumbbell Curl", "Cable Curl"], "3", "10-12", "Day 2", "0", "60"),
      slot("bicep-iso", ["Hammer Curl", "Preacher Curl", "Incline Dumbbell Curl", "Concentration Curl"], "3", "12-15", "Day 2", "0", "60"),
      // Day 3 — Shoulders
      slot("shoulder-press", ["Seated Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press", "Barbell Overhead Press"], "4", "8-10", "Day 3", "2", "120"),
      slot("lateral-raise", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], "4", "12-15", "Day 3", "0", "60"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart", "Prone Y Raise"], "4", "15-20", "Day 3", "0", "60"),
      slot("front-raise", ["Front Raise", "Cable Front Raise", "Plate Front Raise", "Alternating Dumbbell Front Raise"], "3", "12-15", "Day 3", "0", "60"),
      slot("trap", ["Dumbbell Shrug", "Barbell Shrug", "Cable Shrug", "Trap Bar Shrug"], "3", "12-15", "Day 3", "0", "60"),
      // Day 4 — Legs
      slot("squat", ["Barbell Back Squat", "Safety Bar Squat", "Hack Squat", "Belt Squat"], "4", "8-10", "Day 4", "3", "150"),
      slot("hip-hinge", ["Romanian Deadlift", "Stiff-Leg Deadlift", "Good Morning", "Dumbbell RDL"], "4", "10-12", "Day 4", "2", "120"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Pendulum Squat", "Belt Squat"], "3", "10-12", "Day 4", "1", "90"),
      slot("hamstring-curl", ["Leg Curl", "Seated Leg Curl", "Nordic Curl", "Swiss Ball Leg Curl"], "3", "10-12", "Day 4", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Leg Press Calf Raise", "Single-Leg Calf Raise"], "4", "15-20", "Day 4", "0", "60"),
      // Day 5 — Full Upper
      slot("ohp", ["Overhead Press", "Push Press", "Z Press", "Viking Press"], "4", "8-10", "Day 5", "2", "120"),
      slot("pull-up", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up", "Chin-Up"], "4", "8-10", "Day 5", "1", "90"),
      slot("cable-fly", ["Cable Crossover", "High-to-Low Cable Flye", "Pec Deck", "Machine Flye"], "3", "12-15", "Day 5", "0", "60"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart", "Prone Y Raise"], "3", "15-20", "Day 5", "0", "60"),
      slot("arm-superset", ["EZ-Bar Curl + Skull Crusher", "Hammer Curl + Tricep Pushdown", "Cable Curl + Overhead Extension", "Preacher Curl + Dip"], "3", "10-12", "Day 5", "0", "60", "Superset arms"),
    ], 6, "percentage"),
  },
];
