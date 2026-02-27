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
      slot("main-squat", ["Back Squat"], "5", "3-5", "Day 1", "3", "180", "Heavy — RPE 8-9"),
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
      slot("speed-squat", ["Back Squat (Speed)"], "6", "2", "Day 3", "2", "120", "60% 1RM — explosive"),
      slot("box-work", ["Box Squat", "Low Box Squat", "Pause Box Squat", "High Box Squat"], "3", "5", "Day 3", "1", "120"),
      slot("machine-squat", ["Hack Squat", "Leg Press", "Pendulum Squat", "Belt Squat"], "3", "10-12", "Day 3", "0", "90"),
      slot("posterior", ["Glute-Ham Raise", "Nordic Curl", "Reverse Hyper", "Good Morning"], "3", "8-10", "Day 3", "0", "90"),
      slot("core-2", ["Plank", "Suitcase Carry", "Farmer Walk", "Dead Bug (Weighted)"], "3", "45-60s", "Day 3", "0", "60"),
      // Day 4 (Max)
      slot("top-single", ["Back Squat (Top Single)"], "1", "1", "Day 4", "4", "180", "Work to daily max"),
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
      slot("squat", ["Barbell Squat"], "5", "5", "Day 1", "2", "180"),
      slot("bench", ["Barbell Bench Press"], "5", "5", "Day 1", "2", "150"),
      slot("row", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Dumbbell Row"], "5", "5", "Day 1", "1", "120"),
      // Day 2 (B)
      slot("squat-2", ["Barbell Squat"], "5", "5", "Day 2", "2", "180"),
      slot("press", ["Overhead Press"], "5", "5", "Day 2", "2", "150"),
      slot("deadlift", ["Deadlift"], "1", "5", "Day 2", "3", "180"),
      // Day 3 (A alt)
      slot("squat-3", ["Barbell Squat"], "5", "5", "Day 3", "2", "180"),
      slot("bench-2", ["Barbell Bench Press"], "5", "5", "Day 3", "2", "150"),
      slot("row-2", ["Barbell Row", "Pendlay Row", "T-Bar Row", "Dumbbell Row"], "5", "5", "Day 3", "1", "120"),
      // Day 4 (Deadlift + Accessories)
      slot("deadlift-2", ["Deadlift"], "3", "5", "Day 4", "3", "180"),
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
      slot("main-deadlift", ["Conventional Deadlift"], "5", "3-5", "Day 1", "3", "180", "Heavy — RPE 8-9"),
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
      slot("speed-dl", ["Deadlift (Speed)"], "6", "2", "Day 4", "2", "120", "60% 1RM — explosive"),
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
];
