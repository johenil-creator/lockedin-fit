import type { CatalogPlan, Exercise, ExerciseSlot, ProgressionRule } from "./types";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

/** Determine which phase a given week falls into */
function getPhase(week: number): { index: number; label: string } {
  if (week <= 4) return { index: 0, label: "Base Volume Phase" };
  if (week <= 8) return { index: 1, label: "Progressive Overload" };
  if (week <= 11) return { index: 2, label: "Intensity Phase" };
  return { index: 3, label: "Deload Week" };
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

/** Return sets/reps for the given phase, role, progression type, and week within phase.
 *  `weekInPhase` is 0-3 and ensures no two weeks within a phase share the same sets×reps. */
function getPhaseParams(
  phaseIndex: number,
  isCompound: boolean,
  progressionType: "linear" | "percentage",
  weekInPhase: number
): { sets: string; reps: string } {
  // weekInPhase is clamped 0-3
  const w = Math.min(Math.max(weekInPhase, 0), 3);

  if (isCompound) {
    if (progressionType === "linear") {
      // Phase 0 – Base Volume:        wk1 4×10, wk2 4×9, wk3 5×8, wk4 3×10 (mini-deload)
      // Phase 1 – Progressive Overload: wk1 4×8,  wk2 4×7, wk3 5×6, wk4 3×8
      // Phase 2 – Intensity:           wk1 5×5,  wk2 5×4, wk3 6×3, wk4 3×5
      // Phase 3 – Deload:              wk1 3×5 (only 1 week for phase 3)
      const map: { sets: string; reps: string }[][] = [
        [{ sets: "4", reps: "10" }, { sets: "4", reps: "9" }, { sets: "5", reps: "8" }, { sets: "3", reps: "10" }],
        [{ sets: "4", reps: "8" },  { sets: "4", reps: "7" }, { sets: "5", reps: "6" }, { sets: "3", reps: "8" }],
        [{ sets: "5", reps: "5" },  { sets: "5", reps: "4" }, { sets: "6", reps: "3" }, { sets: "3", reps: "5" }],
        [{ sets: "3", reps: "5" },  { sets: "3", reps: "5" }, { sets: "3", reps: "5" }, { sets: "3", reps: "5" }],
      ];
      return map[phaseIndex][w];
    }
    // Percentage / hypertrophy — each week within a phase is unique,
    // and boundary weeks across phases are also distinct.
    // Phase 0 – Base Volume:         wk1 4×12, wk2 4×11, wk3 5×10, wk4 3×13 (mini-deload)
    // Phase 1 – Progressive Overload: wk1 4×10, wk2 4×9,  wk3 5×7,  wk4 3×10
    // Phase 2 – Intensity:           wk1 4×8,  wk2 5×7,  wk3 6×6,  wk4 (unused—only 3 weeks)
    // Phase 3 – Deload:              wk1 3×8 (single week)
    const map: { sets: string; reps: string }[][] = [
      [{ sets: "4", reps: "12" }, { sets: "4", reps: "11" }, { sets: "5", reps: "10" }, { sets: "3", reps: "13" }],
      [{ sets: "4", reps: "10" }, { sets: "4", reps: "9" },  { sets: "5", reps: "7" },  { sets: "3", reps: "10" }],
      [{ sets: "4", reps: "8" },  { sets: "5", reps: "7" },  { sets: "6", reps: "6" },  { sets: "3", reps: "8" }],
      [{ sets: "3", reps: "8" },  { sets: "3", reps: "8" },  { sets: "3", reps: "8" },  { sets: "3", reps: "8" }],
    ];
    return map[phaseIndex][w];
  }

  // Accessories — vary reps week-to-week within each phase; no duplicates across boundaries
  // Phase 0: 3×15, 3×14, 4×12, 3×16 (mini-deload with higher reps, lower intensity)
  // Phase 1: 3×13, 3×11, 4×10, 3×12
  // Phase 2: 3×10, 3×9,  3×8,  (unused—only 3 weeks)
  // Phase 3: 2×12 (single deload week)
  const accessoryMap: { sets: string; reps: string }[][] = [
    [{ sets: "3", reps: "15" }, { sets: "3", reps: "14" }, { sets: "4", reps: "12" }, { sets: "3", reps: "16" }],
    [{ sets: "3", reps: "13" }, { sets: "3", reps: "11" }, { sets: "4", reps: "10" }, { sets: "3", reps: "12" }],
    [{ sets: "3", reps: "10" }, { sets: "3", reps: "9" },  { sets: "3", reps: "8" },  { sets: "3", reps: "10" }],
    [{ sets: "2", reps: "12" }, { sets: "2", reps: "12" }, { sets: "2", reps: "12" }, { sets: "2", reps: "12" }],
  ];
  return accessoryMap[phaseIndex][w];
}

/**
 * Pick the exercise name for a given slot and week, using the rotation algorithm:
 *
 *   - Deload (phase 3 / Week 12): always primary (index 0)
 *   - Intensity (phase 2 / Weeks 9-11): rotate among first 2 variations
 *   - Otherwise: rotate through all variations
 */
function pickVariation(s: ExerciseSlot, week: number, phaseIndex: number): string {
  if (s.variations.length <= 1) return s.variations[0];

  if (phaseIndex === 3) return s.variations[0];

  const poolSize =
    phaseIndex === 2
      ? Math.min(2, s.variations.length)
      : s.variations.length;

  return s.variations[(week - 1) % poolSize];
}

/**
 * Expand exercise slots into a full periodised programme with weekly variety.
 */
function expandSlotsWithProgression(
  slots: ExerciseSlot[],
  totalWeeks: number,
  progressionType: "linear" | "percentage"
): Exercise[] {
  const all: Exercise[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const phase = getPhase(w);

    // Compute week-within-phase (0-indexed): weeks 1-4→0-3, 5-8→0-3, 9-11→0-2, 12→0
    const phaseStartWeek = phase.index === 0 ? 1 : phase.index === 1 ? 5 : phase.index === 2 ? 9 : 12;
    const weekInPhase = w - phaseStartWeek;

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const isCompound = isCompoundBySlotPosition(i, slots);
      const { sets, reps } = getPhaseParams(phase.index, isCompound, progressionType, weekInPhase);
      const exerciseName = pickVariation(s, w, phase.index);

      all.push({
        exercise: exerciseName,
        sets,
        reps,
        weight: "",
        comments: s.comments ?? "",
        week: `Week ${w}`,
        day: s.day,
        warmUpSets: s.warmUpSets,
        restTime: s.restTime,
        notes: phase.label,
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
    description: "A glute-focused programme with hip thrusts, RDLs, and targeted isolation work across three training days.",
    difficulty: "Intermediate",
    daysPerWeek: 3,
    totalWeeks: 12,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("hip-extension", ["Barbell Hip Thrust", "Smith Machine Hip Thrust", "Banded Barbell Hip Thrust"], "4", "10-12", "Day 1", "2", "120"),
      slot("hip-hinge", ["Romanian Deadlift", "Stiff-Leg Deadlift", "Dumbbell RDL"], "4", "8-10", "Day 1", "2", "120"),
      slot("unilateral-squat", ["Bulgarian Split Squat", "Reverse Lunge", "Step-Up"], "3", "10-12", "Day 1", "1", "90"),
      slot("glute-isolation", ["Cable Kickback", "Donkey Kick (Machine)", "Single-Leg Cable Kickback"], "3", "12-15", "Day 1", "0", "60"),
      slot("glute-activation", ["Glute Bridge (Banded)", "Frog Pump", "Fire Hydrant (Banded)"], "3", "15-20", "Day 1", "0", "60"),
      // Day 2
      slot("deadlift-variation", ["Sumo Deadlift", "Sumo Block Pull", "Wide-Stance Leg Press"], "4", "6-8", "Day 2", "2", "150"),
      slot("squat-variation", ["Goblet Squat", "Heel-Elevated Goblet Squat", "Dumbbell Squat"], "3", "12-15", "Day 2", "1", "90"),
      slot("abduction", ["Hip Abduction Machine", "Seated Band Abduction", "Cable Hip Abduction"], "3", "15-20", "Day 2", "0", "60"),
      slot("unilateral-hip-ext", ["Single-Leg Hip Thrust", "Single-Leg Glute Bridge", "B-Stance Hip Thrust"], "3", "10-12", "Day 2", "0", "60"),
      slot("abduction-finisher", ["Seated Band Abduction", "Clamshell (Banded)", "Side-Lying Hip Abduction"], "3", "20", "Day 2", "0", "45"),
      // Day 3
      slot("quad-compound", ["Front Squat", "Goblet Squat", "Safety Bar Squat"], "4", "8-10", "Day 3", "2", "120"),
      slot("lunge-pattern", ["Walking Lunge", "Reverse Lunge", "Curtsy Lunge"], "3", "12 each", "Day 3", "1", "90"),
      slot("posterior-chain", ["Cable Pull-Through", "Kettlebell Swing", "Band Pull-Through"], "3", "12-15", "Day 3", "0", "60"),
      slot("back-extension", ["Reverse Hyperextension", "Back Extension", "45-Degree Hyper"], "3", "12-15", "Day 3", "0", "60"),
      slot("glute-finisher", ["Frog Pump", "Glute Bridge Pulse", "Banded Glute Kickback"], "3", "20", "Day 3", "0", "45"),
    ], 12, "percentage"),
  },

  // ─── 2. Chest Pump ───────────────────────────────────────────────────────────
  {
    id: "chest-pump",
    name: "Chest Pump",
    goal: "Push / Chest",
    description: "High-volume chest programme mixing compound presses with isolation flyes to maximise pec development.",
    difficulty: "Intermediate",
    daysPerWeek: 3,
    totalWeeks: 12,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("flat-press", ["Flat Barbell Bench Press", "Flat Dumbbell Bench Press", "Machine Chest Press"], "4", "6-8", "Day 1", "2", "150"),
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Incline Smith Press"], "4", "8-10", "Day 1", "1", "120"),
      slot("cable-fly", ["Cable Crossover", "High-to-Low Cable Flye", "Mid-Cable Flye"], "3", "12-15", "Day 1", "0", "60"),
      slot("fly", ["Dumbbell Flye", "Incline Dumbbell Flye", "Pec Deck Machine"], "3", "12-15", "Day 1", "0", "60"),
      slot("burnout", ["Push-Up (Burnout)", "Diamond Push-Up", "Decline Push-Up"], "2", "AMRAP", "Day 1", "0", "60"),
      // Day 2
      slot("incline-compound", ["Incline Barbell Press", "Incline Dumbbell Press", "Incline Smith Press"], "4", "6-8", "Day 2", "2", "150"),
      slot("flat-db", ["Flat Dumbbell Press", "Flat Barbell Bench Press", "Close-Grip Bench Press"], "4", "8-10", "Day 2", "1", "120"),
      slot("machine-fly", ["Pec Deck Machine", "Machine Flye", "Plate-Loaded Chest Flye"], "3", "12-15", "Day 2", "0", "60"),
      slot("cable-fly-2", ["Low-to-High Cable Flye", "Cable Crossover", "Mid-Cable Flye"], "3", "12-15", "Day 2", "0", "60"),
      slot("dip", ["Dip (Chest Emphasis)", "Weighted Dip", "Assisted Dip"], "3", "8-12", "Day 2", "1", "90"),
      // Day 3
      slot("squeeze-press", ["Dumbbell Squeeze Press", "Svend Press", "Hex Press"], "4", "10-12", "Day 3", "1", "90"),
      slot("machine-press", ["Machine Chest Press", "Smith Machine Bench", "Hammer Strength Press"], "3", "10-12", "Day 3", "1", "90"),
      slot("cable", ["High-to-Low Cable Flye", "Cable Crossover", "Low-to-High Cable Flye"], "3", "12-15", "Day 3", "0", "60"),
      slot("isolation", ["Svend Press", "Plate Squeeze Press", "Pec Deck (Partial ROM)"], "3", "12-15", "Day 3", "0", "60"),
      slot("bodyweight", ["Decline Push-Up", "Push-Up (Burnout)", "Wide Push-Up"], "2", "AMRAP", "Day 3", "0", "60"),
    ], 12, "percentage"),
  },

  // ─── 3. Arm Destroyer ────────────────────────────────────────────────────────
  {
    id: "arm-destroyer",
    name: "Arm Destroyer",
    goal: "Arms",
    description: "Beginner-friendly arm programme alternating biceps and triceps work with supersets on the final day.",
    difficulty: "Beginner",
    daysPerWeek: 3,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("bicep-compound", ["Barbell Curl", "EZ-Bar Curl", "Thick-Bar Curl"], "3", "10-12", "Day 1", "1", "90"),
      slot("bicep-iso", ["Hammer Curl", "Cross-Body Hammer Curl", "Rope Hammer Curl"], "3", "10-12", "Day 1", "0", "60"),
      slot("tricep-push", ["Tricep Rope Pushdown", "Tricep V-Bar Pushdown", "Tricep Straight-Bar Pushdown"], "3", "12-15", "Day 1", "1", "60"),
      slot("tricep-extension", ["Overhead Tricep Extension", "Dumbbell Overhead Extension", "Cable Overhead Extension"], "3", "10-12", "Day 1", "0", "60"),
      slot("forearm", ["Wrist Curl", "Reverse Wrist Curl", "Farmer Hold"], "2", "15-20", "Day 1", "0", "45"),
      // Day 2
      slot("bicep-stretch", ["Incline Dumbbell Curl", "Bayesian Curl", "Cable Curl (Behind)"], "3", "10-12", "Day 2", "1", "90"),
      slot("bicep-peak", ["Concentration Curl", "Spider Curl", "Preacher Curl"], "3", "10-12", "Day 2", "0", "60"),
      slot("tricep-compound", ["Close-Grip Bench Press", "Close-Grip Floor Press", "JM Press"], "3", "8-10", "Day 2", "1", "90"),
      slot("tricep-iso", ["Skull Crusher", "Dumbbell Skull Crusher", "Cable Skull Crusher"], "3", "10-12", "Day 2", "0", "60"),
      slot("forearm-2", ["Reverse Curl", "Zottman Curl", "Hammer Curl (Slow Eccentric)"], "2", "12-15", "Day 2", "0", "60"),
      // Day 3
      slot("superset-bi", ["EZ-Bar Curl", "Barbell Curl", "Cable Curl"], "3", "10-12", "Day 3", "1", "60", "Superset with Dips"),
      slot("superset-tri", ["Dip (Tricep Emphasis)", "Bench Dip", "Close-Grip Push-Up"], "3", "10-12", "Day 3", "1", "60", "Superset with EZ-Bar Curl"),
      slot("superset-bi-2", ["Cable Curl", "Machine Curl", "Band Curl"], "3", "12-15", "Day 3", "0", "45", "Superset with Pushdown"),
      slot("superset-tri-2", ["Tricep Pushdown (V-Bar)", "Tricep Rope Pushdown", "Single-Arm Pushdown"], "3", "12-15", "Day 3", "0", "45", "Superset with Cable Curl"),
      slot("forearm-3", ["Behind-the-Back Wrist Curl", "Plate Pinch", "Wrist Roller"], "2", "15-20", "Day 3", "0", "45"),
    ], 12, "linear"),
  },

  // ─── 4. Full Body Burn ───────────────────────────────────────────────────────
  {
    id: "full-body-burn",
    name: "Full Body Burn",
    goal: "Full Body",
    description: "Three full-body sessions per week hitting all major muscle groups with compound lifts and light accessories.",
    difficulty: "Beginner",
    daysPerWeek: 3,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("squat", ["Barbell Squat", "Goblet Squat", "Leg Press"], "3", "8-10", "Day 1", "2", "120"),
      slot("horizontal-push", ["Flat Dumbbell Bench Press", "Barbell Bench Press", "Machine Chest Press"], "3", "8-10", "Day 1", "1", "90"),
      slot("horizontal-pull", ["Bent-Over Barbell Row", "Dumbbell Row", "Seated Cable Row"], "3", "8-10", "Day 1", "1", "90"),
      slot("vertical-push", ["Overhead Press", "Dumbbell Shoulder Press", "Arnold Press"], "3", "8-10", "Day 1", "1", "90"),
      slot("core", ["Plank", "Dead Bug", "Pallof Press"], "3", "30-45s", "Day 1", "0", "60"),
      // Day 2
      slot("hinge", ["Romanian Deadlift", "Good Morning", "Dumbbell RDL"], "3", "8-10", "Day 2", "2", "120"),
      slot("incline-push", ["Incline Dumbbell Press", "Incline Barbell Press", "Landmine Press"], "3", "10-12", "Day 2", "1", "90"),
      slot("vertical-pull", ["Lat Pulldown", "Pull-Up (Assisted)", "Cable Pullover"], "3", "10-12", "Day 2", "1", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise"], "3", "12-15", "Day 2", "0", "60"),
      slot("core-2", ["Hanging Knee Raise", "Leg Raise", "Cable Crunch"], "3", "12-15", "Day 2", "0", "60"),
      // Day 3
      slot("leg-press", ["Leg Press", "Hack Squat", "Smith Machine Squat"], "3", "10-12", "Day 3", "1", "90"),
      slot("row-variation", ["Dumbbell Row", "T-Bar Row", "Meadows Row"], "3", "10-12", "Day 3", "1", "90"),
      slot("machine-push", ["Machine Chest Press", "Cable Crossover", "Pec Deck"], "3", "10-12", "Day 3", "0", "60"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart"], "3", "15-20", "Day 3", "0", "60"),
      slot("core-3", ["Cable Crunch", "Weighted Sit-Up", "Russian Twist"], "3", "15-20", "Day 3", "0", "60"),
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
      slot("main-squat", ["Back Squat"], "5", "3-5", "Day 1", "3", "180", "Heavy — RPE 8-9"),
      slot("paused-work", ["Pause Squat", "Pin Squat", "Anderson Squat"], "3", "3", "Day 1", "1", "150", "2-sec pause at bottom"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Belt Squat"], "4", "8-10", "Day 1", "1", "120"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Front-Rack Lunge"], "3", "10 each", "Day 1", "0", "90"),
      slot("core", ["Ab Wheel Rollout", "Hanging Leg Raise", "Pallof Press"], "3", "10-12", "Day 1", "0", "60"),
      // Day 2 (Supplemental)
      slot("front-squat", ["Front Squat", "Goblet Squat", "Safety Bar Squat"], "4", "4-6", "Day 2", "2", "150"),
      slot("unilateral", ["Bulgarian Split Squat", "Step-Up", "Single-Leg Press"], "3", "8-10", "Day 2", "1", "90"),
      slot("quad-iso", ["Leg Extension", "Sissy Squat", "Wall Sit (Weighted)"], "3", "12-15", "Day 2", "0", "60"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl"], "3", "10-12", "Day 2", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Donkey Calf Raise"], "4", "12-15", "Day 2", "0", "60"),
      // Day 3 (Speed)
      slot("speed-squat", ["Back Squat (Speed)"], "6", "2", "Day 3", "2", "120", "60% 1RM — explosive"),
      slot("box-work", ["Box Squat", "Low Box Squat", "Pause Box Squat"], "3", "5", "Day 3", "1", "120"),
      slot("machine-squat", ["Hack Squat", "Leg Press", "Pendulum Squat"], "3", "10-12", "Day 3", "0", "90"),
      slot("posterior", ["Glute-Ham Raise", "Nordic Curl", "Reverse Hyper"], "3", "8-10", "Day 3", "0", "90"),
      slot("core-2", ["Plank", "Suitcase Carry", "Farmer Walk"], "3", "45-60s", "Day 3", "0", "60"),
      // Day 4 (Max)
      slot("top-single", ["Back Squat (Top Single)"], "1", "1", "Day 4", "4", "180", "Work to daily max"),
      slot("tempo", ["Tempo Squat", "1.5 Rep Squat", "Eccentric-Only Squat"], "3", "5", "Day 4", "1", "120", "3-1-0 tempo"),
      slot("step-up", ["Step-Up", "Reverse Lunge", "Walking Lunge"], "3", "10 each", "Day 4", "0", "90"),
      slot("quad-finisher", ["Sissy Squat", "Leg Extension", "Wall Sit"], "3", "12-15", "Day 4", "0", "60"),
      slot("core-3", ["Hanging Leg Raise", "Ab Wheel Rollout", "Cable Crunch"], "3", "12-15", "Day 4", "0", "60"),
    ], 12, "linear"),
  },

  // ─── 6. Push Pull Legs ───────────────────────────────────────────────────────
  {
    id: "push-pull-legs",
    name: "Push Pull Legs",
    goal: "PPL Split",
    description: "Classic six-day push/pull/legs split with balanced volume across all movement patterns.",
    difficulty: "Intermediate",
    daysPerWeek: 6,
    totalWeeks: 12,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Push A (Day 1)
      slot("flat-press", ["Flat Barbell Bench Press", "Flat Dumbbell Bench Press", "Close-Grip Bench Press"], "4", "6-8", "Day 1", "2", "150"),
      slot("shoulder-press", ["Seated Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press"], "4", "8-10", "Day 1", "1", "90"),
      slot("incline", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Dumbbell Press"], "3", "10-12", "Day 1", "0", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise"], "4", "12-15", "Day 1", "0", "60"),
      slot("tricep", ["Tricep Rope Pushdown", "Overhead Tricep Extension", "Tricep Dip"], "3", "12-15", "Day 1", "0", "60"),
      // Pull A (Day 2)
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row"], "4", "6-8", "Day 2", "2", "120"),
      slot("pull-up", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up"], "4", "6-8", "Day 2", "1", "120"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row"], "3", "10-12", "Day 2", "0", "90"),
      slot("rear-delt", ["Face Pull", "Reverse Pec Deck", "Band Pull-Apart"], "3", "15-20", "Day 2", "0", "60"),
      slot("bicep", ["Barbell Curl", "EZ-Bar Curl", "Dumbbell Curl"], "3", "10-12", "Day 2", "0", "60"),
      // Legs A (Day 3)
      slot("squat", ["Barbell Squat", "Safety Bar Squat", "Belt Squat"], "4", "6-8", "Day 3", "3", "150"),
      slot("hip-hinge", ["Romanian Deadlift", "Stiff-Leg Deadlift", "Good Morning"], "4", "8-10", "Day 3", "2", "120"),
      slot("quad-acc", ["Leg Press", "Hack Squat", "Pendulum Squat"], "3", "10-12", "Day 3", "1", "90"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl"], "3", "10-12", "Day 3", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Leg Press Calf Raise"], "4", "12-15", "Day 3", "0", "60"),
      // Push B (Day 4)
      slot("ohp", ["Overhead Press", "Push Press", "Viking Press"], "4", "6-8", "Day 4", "2", "150"),
      slot("incline-compound", ["Incline Barbell Press", "Incline Dumbbell Press", "Incline Smith Press"], "4", "8-10", "Day 4", "1", "120"),
      slot("cable-fly", ["Cable Crossover", "Low-to-High Cable Flye", "Pec Deck"], "3", "12-15", "Day 4", "0", "60"),
      slot("shoulder-acc", ["Arnold Press", "Lu Raise", "Dumbbell Front Raise"], "3", "10-12", "Day 4", "0", "90"),
      slot("tricep-2", ["Overhead Tricep Extension", "Skull Crusher", "Tricep Kickback"], "3", "12-15", "Day 4", "0", "60"),
      // Pull B (Day 5)
      slot("deadlift", ["Deadlift", "Sumo Deadlift", "Trap Bar Deadlift"], "4", "5", "Day 5", "3", "180"),
      slot("pulldown", ["Lat Pulldown", "Close-Grip Pulldown", "Straight-Arm Pulldown"], "4", "8-10", "Day 5", "1", "90"),
      slot("row-2", ["Dumbbell Row", "Chest-Supported Row", "Meadows Row"], "3", "10-12", "Day 5", "0", "90"),
      slot("rear-delt-2", ["Reverse Pec Deck", "Face Pull", "Prone Y Raise"], "3", "12-15", "Day 5", "0", "60"),
      slot("bicep-2", ["Hammer Curl", "Incline Curl", "Concentration Curl"], "3", "10-12", "Day 5", "0", "60"),
      // Legs B (Day 6)
      slot("front-squat", ["Front Squat", "Goblet Squat", "Zercher Squat"], "4", "8-10", "Day 6", "2", "120"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust"], "4", "10-12", "Day 6", "1", "90"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Lateral Lunge"], "3", "12 each", "Day 6", "0", "90"),
      slot("quad-iso", ["Leg Extension", "Sissy Squat", "Spanish Squat"], "3", "12-15", "Day 6", "0", "60"),
      slot("calf-2", ["Seated Calf Raise", "Standing Calf Raise", "Single-Leg Calf Raise"], "4", "15-20", "Day 6", "0", "60"),
    ], 12, "percentage"),
  },

  // ─── 7. 5x5 Strength ────────────────────────────────────────────────────────
  {
    id: "5x5-strength",
    name: "5x5 Strength",
    goal: "Strength",
    description: "Classic 5x5 linear progression programme built around squat, bench, row, overhead press, and deadlift.",
    difficulty: "Beginner",
    daysPerWeek: 3,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1 (A)
      slot("squat", ["Barbell Squat"], "5", "5", "Day 1", "2", "180"),
      slot("bench", ["Barbell Bench Press"], "5", "5", "Day 1", "2", "150"),
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row"], "5", "5", "Day 1", "1", "120"),
      // Day 2 (B)
      slot("squat-2", ["Barbell Squat"], "5", "5", "Day 2", "2", "180"),
      slot("press", ["Overhead Press"], "5", "5", "Day 2", "2", "150"),
      slot("deadlift", ["Deadlift"], "1", "5", "Day 2", "3", "180"),
      // Day 3 (A alt)
      slot("squat-3", ["Barbell Squat"], "5", "5", "Day 3", "2", "180"),
      slot("bench-2", ["Barbell Bench Press"], "5", "5", "Day 3", "2", "150"),
      slot("row-2", ["Barbell Row", "Pendlay Row", "T-Bar Row"], "5", "5", "Day 3", "1", "120"),
    ], 12, "linear"),
  },

  // ─── 8. Core and Abs ─────────────────────────────────────────────────────────
  {
    id: "core-and-abs",
    name: "Core and Abs",
    goal: "Core",
    description: "Dedicated core programme targeting abs, obliques, and deep stabilisers with a mix of weighted and bodyweight exercises.",
    difficulty: "Beginner",
    daysPerWeek: 3,
    totalWeeks: 12,
    weeklyProgression: LINEAR_STRENGTH,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("weighted-flexion", ["Cable Crunch", "Weighted Sit-Up", "Machine Crunch"], "3", "15-20", "Day 1", "0", "60"),
      slot("hanging", ["Hanging Leg Raise", "Hanging Knee Raise", "Toes-to-Bar"], "3", "10-12", "Day 1", "0", "60"),
      slot("isometric", ["Plank", "RKC Plank", "Long-Lever Plank"], "3", "45-60s", "Day 1", "0", "60"),
      slot("rotation", ["Russian Twist", "Woodchop (Cable)", "Landmine Rotation"], "3", "20", "Day 1", "0", "45"),
      slot("anti-extension", ["Dead Bug", "Bird Dog", "Bear Crawl"], "3", "12 each", "Day 1", "0", "45"),
      // Day 2
      slot("rollout", ["Ab Wheel Rollout", "Barbell Rollout", "Stability Ball Rollout"], "3", "10-12", "Day 2", "0", "60"),
      slot("crunch-variation", ["Bicycle Crunch", "Reverse Crunch", "V-Up"], "3", "20", "Day 2", "0", "45"),
      slot("lateral-stability", ["Side Plank", "Copenhagen Plank", "Suitcase Carry"], "3", "30s each", "Day 2", "0", "45"),
      slot("anti-rotation", ["Pallof Press", "Banded Pallof Press", "Half-Kneeling Pallof Press"], "3", "12 each", "Day 2", "0", "60"),
      slot("reverse-crunch", ["Reverse Crunch", "Lying Leg Raise", "Decline Reverse Crunch"], "3", "15-20", "Day 2", "0", "45"),
      // Day 3
      slot("weighted", ["Weighted Sit-Up", "Cable Crunch", "Decline Weighted Crunch"], "3", "12-15", "Day 3", "0", "60"),
      slot("knee-raise", ["Hanging Knee Raise", "Captain's Chair Knee Raise", "Decline Knee Raise"], "3", "12-15", "Day 3", "0", "60"),
      slot("woodchop", ["Woodchop (Cable)", "Landmine Rotation", "Half-Kneeling Woodchop"], "3", "12 each", "Day 3", "0", "60"),
      slot("dynamic", ["Mountain Climber", "Bear Crawl", "Plank to Push-Up"], "3", "30s", "Day 3", "0", "45"),
      slot("isometric-2", ["Hollow Body Hold", "L-Sit", "Dead Bug (Weighted)"], "3", "30-45s", "Day 3", "0", "45"),
    ], 12, "linear"),
  },

  // ─── 9. Shoulder Sculptor ────────────────────────────────────────────────────
  {
    id: "shoulder-sculptor",
    name: "Shoulder Sculptor",
    goal: "Shoulders",
    description: "Balanced shoulder programme hitting all three delt heads with presses, raises, and rear delt work.",
    difficulty: "Intermediate",
    daysPerWeek: 3,
    totalWeeks: 12,
    weeklyProgression: PERCENTAGE_HYPERTROPHY,
    exercises: expandSlotsWithProgression([
      // Day 1
      slot("press-compound", ["Seated Barbell Overhead Press", "Standing Overhead Press", "Push Press"], "4", "6-8", "Day 1", "2", "150"),
      slot("lateral-raise", ["Dumbbell Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise"], "4", "12-15", "Day 1", "0", "60"),
      slot("rear-delt", ["Face Pull", "Band Pull-Apart", "Reverse Pec Deck"], "3", "15-20", "Day 1", "0", "60"),
      slot("front-raise", ["Front Raise (Plate)", "Dumbbell Front Raise", "Cable Front Raise"], "3", "12-15", "Day 1", "0", "60"),
      slot("trap", ["Shrug", "Dumbbell Shrug", "Behind-the-Back Shrug"], "3", "12-15", "Day 1", "0", "60"),
      // Day 2
      slot("db-press", ["Dumbbell Shoulder Press", "Arnold Press", "Seated Dumbbell Press (Neutral Grip)"], "4", "8-10", "Day 2", "2", "120"),
      slot("cable-lateral", ["Cable Lateral Raise", "Lean-Away Lateral Raise", "Cable Y Raise"], "4", "12-15", "Day 2", "0", "60"),
      slot("rear-delt-2", ["Reverse Pec Deck", "Bent-Over Reverse Flye", "Prone Y Raise"], "3", "12-15", "Day 2", "0", "60"),
      slot("upright-row", ["Upright Row (Cable)", "Dumbbell Upright Row", "Cable High Pull"], "3", "10-12", "Day 2", "1", "90"),
      slot("band-work", ["Band Pull-Apart", "Band Face Pull", "Band Dislocate"], "3", "20", "Day 2", "0", "45"),
      // Day 3
      slot("compound-press", ["Arnold Press", "Landmine Press", "Z Press"], "4", "8-10", "Day 3", "1", "90"),
      slot("lu-complex", ["Lu Raise", "Dumbbell Y-T-W", "Prone I-Y-T Raise"], "3", "10-12", "Day 3", "0", "60"),
      slot("reverse-flye", ["Bent-Over Reverse Flye", "Reverse Pec Deck", "Cable Reverse Flye"], "3", "12-15", "Day 3", "0", "60"),
      slot("unilateral-press", ["Landmine Press", "Single-Arm Dumbbell Press", "Half-Kneeling Landmine Press"], "3", "10 each", "Day 3", "1", "90"),
      slot("rehab-stability", ["Prone Y Raise", "External Rotation (Cable)", "Face Pull (Light)"], "3", "12-15", "Day 3", "0", "45"),
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
      slot("main-deadlift", ["Conventional Deadlift"], "5", "3-5", "Day 1", "3", "180", "Heavy — RPE 8-9"),
      slot("deficit-work", ["Deficit Deadlift", "Paused Deadlift", "Snatch-Grip Deadlift"], "3", "5", "Day 1", "1", "150", "2-inch deficit"),
      slot("row", ["Barbell Row", "Pendlay Row", "Meadows Row"], "4", "6-8", "Day 1", "1", "120"),
      slot("posterior-chain", ["Glute-Ham Raise", "Nordic Curl", "Back Extension"], "3", "8-10", "Day 1", "0", "90"),
      slot("grip-carry", ["Farmer's Walk", "Suitcase Carry", "Dead Hang"], "3", "40m", "Day 1", "0", "90"),
      // Day 2 (Variation)
      slot("sumo", ["Sumo Deadlift", "Wide-Stance RDL", "Sumo Block Pull"], "4", "4-6", "Day 2", "2", "150"),
      slot("block-pull", ["Block Pull", "Rack Pull", "Pin Pull"], "3", "3-5", "Day 2", "1", "150"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust"], "4", "8-10", "Day 2", "1", "90"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row"], "3", "10-12", "Day 2", "0", "90"),
      slot("core", ["Hanging Leg Raise", "Ab Wheel Rollout", "Cable Crunch"], "3", "12-15", "Day 2", "0", "60"),
      // Day 3 (Technique)
      slot("paused-dl", ["Paused Deadlift", "Tempo Deadlift", "Deficit Deadlift"], "4", "3", "Day 3", "2", "150", "2-sec pause at knee"),
      slot("good-morning", ["Good Morning", "Seated Good Morning", "SSB Good Morning"], "3", "8-10", "Day 3", "1", "90"),
      slot("heavy-row", ["Pendlay Row", "Barbell Row", "T-Bar Row"], "4", "5", "Day 3", "1", "120"),
      slot("back-extension", ["Back Extension", "45-Degree Hyper", "Reverse Hyperextension"], "3", "12-15", "Day 3", "0", "60"),
      slot("core-2", ["Plank (Weighted)", "Dead Bug", "Pallof Press"], "3", "45-60s", "Day 3", "0", "60"),
      // Day 4 (Speed)
      slot("speed-dl", ["Deadlift (Speed)"], "6", "2", "Day 4", "2", "120", "60% 1RM — explosive"),
      slot("snatch-grip", ["Snatch-Grip Deadlift", "Snatch-Grip RDL", "Clean Pull"], "3", "6-8", "Day 4", "1", "120"),
      slot("reverse-hyper", ["Reverse Hyperextension", "GHR", "Back Extension"], "3", "12-15", "Day 4", "0", "60"),
      slot("row-variation", ["Dumbbell Row", "Chest-Supported Row", "Kroc Row"], "3", "10-12", "Day 4", "0", "90"),
      slot("core-3", ["Ab Wheel Rollout", "Hanging Leg Raise", "Suitcase Carry"], "3", "10-12", "Day 4", "0", "60"),
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
      slot("flat-press", ["Flat Barbell Bench Press", "Dumbbell Bench Press", "Close-Grip Bench Press"], "4", "6-8", "Day 1", "2", "150"),
      slot("row", ["Barbell Row", "T-Bar Row", "Pendlay Row"], "4", "6-8", "Day 1", "2", "120"),
      slot("shoulder-press", ["Seated Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press"], "3", "8-10", "Day 1", "1", "90"),
      slot("pulldown", ["Lat Pulldown", "Pull-Up", "Close-Grip Pulldown"], "3", "10-12", "Day 1", "0", "90"),
      slot("lateral", ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise"], "3", "12-15", "Day 1", "0", "60"),
      slot("bicep", ["Barbell Curl", "EZ-Bar Curl", "Dumbbell Curl"], "3", "10-12", "Day 1", "0", "60"),
      slot("tricep", ["Tricep Pushdown", "Rope Pushdown", "V-Bar Pushdown"], "3", "12-15", "Day 1", "0", "60"),
      // Lower A (Day 2)
      slot("squat", ["Barbell Squat", "Safety Bar Squat", "Belt Squat"], "4", "6-8", "Day 2", "3", "150"),
      slot("hinge", ["Romanian Deadlift", "Good Morning", "Stiff-Leg Deadlift"], "4", "8-10", "Day 2", "2", "120"),
      slot("leg-press", ["Leg Press", "Hack Squat", "Pendulum Squat"], "3", "10-12", "Day 2", "1", "90"),
      slot("hamstring", ["Leg Curl", "Nordic Curl", "Seated Leg Curl"], "3", "10-12", "Day 2", "0", "60"),
      slot("calf", ["Calf Raise", "Seated Calf Raise", "Donkey Calf Raise"], "4", "12-15", "Day 2", "0", "60"),
      slot("core", ["Cable Crunch", "Hanging Leg Raise", "Ab Wheel Rollout"], "3", "15-20", "Day 2", "0", "60"),
      // Upper B (Day 3)
      slot("incline-press", ["Incline Dumbbell Press", "Incline Barbell Press", "Low-Incline Smith Press"], "4", "8-10", "Day 3", "1", "120"),
      slot("vertical-pull", ["Weighted Pull-Up", "Lat Pulldown", "Neutral-Grip Pull-Up"], "4", "6-8", "Day 3", "1", "120"),
      slot("fly", ["Cable Crossover", "Pec Deck", "Dumbbell Flye"], "3", "12-15", "Day 3", "0", "60"),
      slot("cable-row", ["Seated Cable Row", "Chest-Supported Row", "Machine Row"], "3", "10-12", "Day 3", "0", "90"),
      slot("shoulder-acc", ["Arnold Press", "Lu Raise", "Landmine Press"], "3", "10-12", "Day 3", "0", "90"),
      slot("bicep-2", ["Hammer Curl", "Incline Curl", "Concentration Curl"], "3", "10-12", "Day 3", "0", "60"),
      slot("tricep-2", ["Overhead Tricep Extension", "Skull Crusher", "Tricep Kickback"], "3", "12-15", "Day 3", "0", "60"),
      // Lower B (Day 4)
      slot("front-squat", ["Front Squat", "Goblet Squat", "Zercher Squat"], "4", "8-10", "Day 4", "2", "120"),
      slot("hip-thrust", ["Hip Thrust", "Barbell Glute Bridge", "Smith Machine Hip Thrust"], "4", "10-12", "Day 4", "1", "90"),
      slot("lunge", ["Walking Lunge", "Reverse Lunge", "Lateral Lunge"], "3", "12 each", "Day 4", "0", "90"),
      slot("quad-iso", ["Leg Extension", "Sissy Squat", "Wall Sit (Weighted)"], "3", "12-15", "Day 4", "0", "60"),
      slot("calf-2", ["Seated Calf Raise", "Standing Calf Raise", "Single-Leg Calf Raise"], "4", "15-20", "Day 4", "0", "60"),
      slot("core-2", ["Hanging Leg Raise", "Cable Crunch", "Pallof Press"], "3", "12-15", "Day 4", "0", "60"),
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
      slot("warm-up", ["Jump Rope", "Jumping Jacks", "High Knees"], "3", "2 min", "Day 1", "0", "30"),
      slot("explosive", ["Burpee", "Burpee Box Jump", "Squat Jump to Burpee"], "4", "10", "Day 1", "0", "45"),
      slot("kettlebell", ["Kettlebell Swing", "Kettlebell Snatch", "Kettlebell Clean"], "4", "15", "Day 1", "0", "45"),
      slot("dynamic", ["Mountain Climber", "Spider Climber", "Plank Jack"], "3", "30s", "Day 1", "0", "30"),
      slot("plyo", ["Box Jump", "Broad Jump", "Depth Jump"], "3", "10", "Day 1", "0", "45"),
      // Day 2 (Cardio Machines)
      slot("rowing", ["Rowing Machine", "Ski Erg", "Assault Bike (Distance)"], "5", "500m", "Day 2", "0", "60", "Target pace under 2:00/500m"),
      slot("bike", ["Assault Bike", "Echo Bike", "Spin Bike Sprint"], "4", "30s sprint", "Day 2", "0", "60"),
      slot("upper-conditioning", ["Battle Rope", "Rope Climb", "Ball Slam"], "3", "30s", "Day 2", "0", "45"),
      slot("sled", ["Sled Push", "Sled Drag", "Prowler Sprint"], "3", "40m", "Day 2", "0", "60"),
      slot("bodyweight-burnout", ["Plank to Push-Up", "Burpee", "Mountain Climber"], "3", "10", "Day 2", "0", "30"),
      // Day 3 (Sprint + Strength)
      slot("sprint", ["Treadmill Sprint", "Bike Sprint", "Hill Sprint"], "6", "30s", "Day 3", "0", "60"),
      slot("lower-strength", ["Goblet Squat", "Dumbbell Squat", "Kettlebell Front Squat"], "3", "15", "Day 3", "0", "45"),
      slot("full-body", ["Dumbbell Thruster", "Kettlebell Thruster", "Barbell Thruster"], "3", "12", "Day 3", "0", "45"),
      slot("lunge", ["Jumping Lunge", "Walking Lunge", "Lateral Lunge"], "3", "10 each", "Day 3", "0", "30"),
      slot("crawl", ["Bear Crawl", "Crab Walk", "Inchworm"], "3", "20m", "Day 3", "0", "45"),
      // Day 4 (Metabolic Finisher)
      slot("steady-state", ["Stair Climber", "Incline Walk", "Step Mill"], "1", "10 min", "Day 4", "0", "60"),
      slot("wall-ball", ["Wall Ball", "Medicine Ball Slam", "Med Ball Throw"], "4", "15", "Day 4", "0", "45"),
      slot("kb-complex", ["Kettlebell Clean & Press", "KB Snatch", "KB Thruster"], "3", "8 each", "Day 4", "0", "60"),
      slot("agility", ["Lateral Shuffle", "Agility Ladder", "Cone Drill"], "3", "30s", "Day 4", "0", "30"),
      slot("conditioning", ["Sprawl", "Burpee", "Man Maker"], "3", "10", "Day 4", "0", "45"),
    ], 12, "percentage"),
  },
];
