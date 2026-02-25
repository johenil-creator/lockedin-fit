import type { CatalogPlan, Exercise, ProgressionRule } from "./types";

function ex(
  exercise: string,
  sets: string,
  reps: string,
  day: string,
  warmUpSets = "0",
  restTime = "90",
  comments = "",
  week = "Week 1"
): Exercise {
  return {
    exercise,
    sets,
    reps,
    weight: "",
    comments,
    week,
    day,
    warmUpSets,
    restTime,
  };
}

/** Determine which phase a given week falls into */
function getPhase(week: number): { index: number; label: string } {
  if (week <= 4) return { index: 0, label: "Base Volume Phase" };
  if (week <= 8) return { index: 1, label: "Progressive Overload" };
  if (week <= 11) return { index: 2, label: "Intensity Phase" };
  return { index: 3, label: "Deload Week" };
}

/** First 2 exercises per day are compounds, rest are accessories */
function isCompoundByPosition(
  exerciseIndex: number,
  allWeek1: Exercise[]
): boolean {
  const base = allWeek1[exerciseIndex];
  // Count how many exercises before this one share the same day
  let posInDay = 0;
  for (let i = 0; i < exerciseIndex; i++) {
    if (allWeek1[i].day === base.day) posInDay++;
  }
  return posInDay < 2;
}

/** Return sets/reps for the given phase, role, and progression type */
function getPhaseParams(
  phaseIndex: number,
  isCompound: boolean,
  progressionType: "linear" | "percentage"
): { sets: string; reps: string } {
  if (isCompound) {
    if (progressionType === "linear") {
      // Strength: 4×10 → 4×8 → 5×5 → 3×5
      const map = [
        { sets: "4", reps: "10" },
        { sets: "4", reps: "8" },
        { sets: "5", reps: "5" },
        { sets: "3", reps: "5" },
      ];
      return map[phaseIndex];
    }
    // Hypertrophy: 4×12 → 4×10 → 5×8 → 3×8
    const map = [
      { sets: "4", reps: "12" },
      { sets: "4", reps: "10" },
      { sets: "5", reps: "8" },
      { sets: "3", reps: "8" },
    ];
    return map[phaseIndex];
  }

  // Accessory — same for both types: 3×15 → 3×12 → 3×10 → 2×12
  const accessoryMap = [
    { sets: "3", reps: "15" },
    { sets: "3", reps: "12" },
    { sets: "3", reps: "10" },
    { sets: "2", reps: "12" },
  ];
  return accessoryMap[phaseIndex];
}

/**
 * Expand week-1 exercises into a full periodised programme.
 *
 * Phases:
 *   Weeks 1–4  → Base Volume
 *   Weeks 5–8  → Progressive Overload
 *   Weeks 9–11 → Intensity
 *   Week 12    → Deload / Peak
 */
function expandWithProgression(
  week1Exercises: Exercise[],
  totalWeeks: number,
  progressionType: "linear" | "percentage"
): Exercise[] {
  const all: Exercise[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const phase = getPhase(w);

    for (let i = 0; i < week1Exercises.length; i++) {
      const base = week1Exercises[i];
      const isCompound = isCompoundByPosition(i, week1Exercises);
      const { sets, reps } = getPhaseParams(
        phase.index,
        isCompound,
        progressionType
      );

      all.push({
        ...base,
        week: `Week ${w}`,
        sets,
        reps,
        weight: "",
        notes: phase.label,
      });
    }
  }

  return all;
}

const LINEAR_STRENGTH: ProgressionRule = { type: "linear", increment: 2.5 };
const PERCENTAGE_HYPERTROPHY: ProgressionRule = { type: "percentage", percentIncrease: 2.5 };

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
    exercises: expandWithProgression([
      ex("Barbell Hip Thrust", "4", "10-12", "Day 1", "2", "120"),
      ex("Romanian Deadlift", "4", "8-10", "Day 1", "2", "120"),
      ex("Bulgarian Split Squat", "3", "10-12", "Day 1", "1", "90"),
      ex("Cable Kickback", "3", "12-15", "Day 1", "0", "60"),
      ex("Glute Bridge (Banded)", "3", "15-20", "Day 1", "0", "60"),

      ex("Sumo Deadlift", "4", "6-8", "Day 2", "2", "150"),
      ex("Goblet Squat", "3", "12-15", "Day 2", "1", "90"),
      ex("Hip Abduction Machine", "3", "15-20", "Day 2", "0", "60"),
      ex("Single-Leg Hip Thrust", "3", "10-12", "Day 2", "0", "60"),
      ex("Seated Band Abduction", "3", "20", "Day 2", "0", "45"),

      ex("Front Squat", "4", "8-10", "Day 3", "2", "120"),
      ex("Walking Lunge", "3", "12 each", "Day 3", "1", "90"),
      ex("Cable Pull-Through", "3", "12-15", "Day 3", "0", "60"),
      ex("Reverse Hyperextension", "3", "12-15", "Day 3", "0", "60"),
      ex("Frog Pump", "3", "20", "Day 3", "0", "45"),
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
    exercises: expandWithProgression([
      ex("Flat Barbell Bench Press", "4", "6-8", "Day 1", "2", "150"),
      ex("Incline Dumbbell Press", "4", "8-10", "Day 1", "1", "120"),
      ex("Cable Crossover", "3", "12-15", "Day 1", "0", "60"),
      ex("Dumbbell Flye", "3", "12-15", "Day 1", "0", "60"),
      ex("Push-Up (Burnout)", "2", "AMRAP", "Day 1", "0", "60"),

      ex("Incline Barbell Press", "4", "6-8", "Day 2", "2", "150"),
      ex("Flat Dumbbell Press", "4", "8-10", "Day 2", "1", "120"),
      ex("Pec Deck Machine", "3", "12-15", "Day 2", "0", "60"),
      ex("Low-to-High Cable Flye", "3", "12-15", "Day 2", "0", "60"),
      ex("Dip (Chest Emphasis)", "3", "8-12", "Day 2", "1", "90"),

      ex("Dumbbell Squeeze Press", "4", "10-12", "Day 3", "1", "90"),
      ex("Machine Chest Press", "3", "10-12", "Day 3", "1", "90"),
      ex("High-to-Low Cable Flye", "3", "12-15", "Day 3", "0", "60"),
      ex("Svend Press", "3", "12-15", "Day 3", "0", "60"),
      ex("Decline Push-Up", "2", "AMRAP", "Day 3", "0", "60"),
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
    exercises: expandWithProgression([
      ex("Barbell Curl", "3", "10-12", "Day 1", "1", "90"),
      ex("Hammer Curl", "3", "10-12", "Day 1", "0", "60"),
      ex("Tricep Rope Pushdown", "3", "12-15", "Day 1", "1", "60"),
      ex("Overhead Tricep Extension", "3", "10-12", "Day 1", "0", "60"),
      ex("Wrist Curl", "2", "15-20", "Day 1", "0", "45"),

      ex("Incline Dumbbell Curl", "3", "10-12", "Day 2", "1", "90"),
      ex("Concentration Curl", "3", "10-12", "Day 2", "0", "60"),
      ex("Close-Grip Bench Press", "3", "8-10", "Day 2", "1", "90"),
      ex("Skull Crusher", "3", "10-12", "Day 2", "0", "60"),
      ex("Reverse Curl", "2", "12-15", "Day 2", "0", "60"),

      ex("EZ-Bar Curl", "3", "10-12", "Day 3", "1", "60", "Superset with Dips"),
      ex("Dip (Tricep Emphasis)", "3", "10-12", "Day 3", "1", "60", "Superset with EZ-Bar Curl"),
      ex("Cable Curl", "3", "12-15", "Day 3", "0", "45", "Superset with Pushdown"),
      ex("Tricep Pushdown (V-Bar)", "3", "12-15", "Day 3", "0", "45", "Superset with Cable Curl"),
      ex("Behind-the-Back Wrist Curl", "2", "15-20", "Day 3", "0", "45"),
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
    exercises: expandWithProgression([
      ex("Barbell Squat", "3", "8-10", "Day 1", "2", "120"),
      ex("Flat Dumbbell Bench Press", "3", "8-10", "Day 1", "1", "90"),
      ex("Bent-Over Barbell Row", "3", "8-10", "Day 1", "1", "90"),
      ex("Overhead Press", "3", "8-10", "Day 1", "1", "90"),
      ex("Plank", "3", "30-45s", "Day 1", "0", "60"),

      ex("Romanian Deadlift", "3", "8-10", "Day 2", "2", "120"),
      ex("Incline Dumbbell Press", "3", "10-12", "Day 2", "1", "90"),
      ex("Lat Pulldown", "3", "10-12", "Day 2", "1", "90"),
      ex("Lateral Raise", "3", "12-15", "Day 2", "0", "60"),
      ex("Hanging Knee Raise", "3", "12-15", "Day 2", "0", "60"),

      ex("Leg Press", "3", "10-12", "Day 3", "1", "90"),
      ex("Dumbbell Row", "3", "10-12", "Day 3", "1", "90"),
      ex("Machine Chest Press", "3", "10-12", "Day 3", "0", "60"),
      ex("Face Pull", "3", "15-20", "Day 3", "0", "60"),
      ex("Cable Crunch", "3", "15-20", "Day 3", "0", "60"),
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
    exercises: expandWithProgression([
      ex("Back Squat", "5", "3-5", "Day 1", "3", "180", "Heavy — RPE 8-9"),
      ex("Pause Squat", "3", "3", "Day 1", "1", "150", "2-sec pause at bottom"),
      ex("Leg Press", "4", "8-10", "Day 1", "1", "120"),
      ex("Walking Lunge", "3", "10 each", "Day 1", "0", "90"),
      ex("Ab Wheel Rollout", "3", "10-12", "Day 1", "0", "60"),

      ex("Front Squat", "4", "4-6", "Day 2", "2", "150"),
      ex("Bulgarian Split Squat", "3", "8-10", "Day 2", "1", "90"),
      ex("Leg Extension", "3", "12-15", "Day 2", "0", "60"),
      ex("Leg Curl", "3", "10-12", "Day 2", "0", "60"),
      ex("Calf Raise", "4", "12-15", "Day 2", "0", "60"),

      ex("Back Squat (Speed)", "6", "2", "Day 3", "2", "120", "60% 1RM — explosive"),
      ex("Box Squat", "3", "5", "Day 3", "1", "120"),
      ex("Hack Squat", "3", "10-12", "Day 3", "0", "90"),
      ex("Glute-Ham Raise", "3", "8-10", "Day 3", "0", "90"),
      ex("Plank", "3", "45-60s", "Day 3", "0", "60"),

      ex("Back Squat (Top Single)", "1", "1", "Day 4", "4", "180", "Work to daily max"),
      ex("Tempo Squat", "3", "5", "Day 4", "1", "120", "3-1-0 tempo"),
      ex("Step-Up", "3", "10 each", "Day 4", "0", "90"),
      ex("Sissy Squat", "3", "12-15", "Day 4", "0", "60"),
      ex("Hanging Leg Raise", "3", "12-15", "Day 4", "0", "60"),
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
    exercises: expandWithProgression([
      // Push A
      ex("Flat Barbell Bench Press", "4", "6-8", "Day 1", "2", "150"),
      ex("Seated Dumbbell Shoulder Press", "4", "8-10", "Day 1", "1", "90"),
      ex("Incline Dumbbell Press", "3", "10-12", "Day 1", "0", "90"),
      ex("Lateral Raise", "4", "12-15", "Day 1", "0", "60"),
      ex("Tricep Rope Pushdown", "3", "12-15", "Day 1", "0", "60"),

      // Pull A
      ex("Barbell Row", "4", "6-8", "Day 2", "2", "120"),
      ex("Weighted Pull-Up", "4", "6-8", "Day 2", "1", "120"),
      ex("Seated Cable Row", "3", "10-12", "Day 2", "0", "90"),
      ex("Face Pull", "3", "15-20", "Day 2", "0", "60"),
      ex("Barbell Curl", "3", "10-12", "Day 2", "0", "60"),

      // Legs A
      ex("Barbell Squat", "4", "6-8", "Day 3", "3", "150"),
      ex("Romanian Deadlift", "4", "8-10", "Day 3", "2", "120"),
      ex("Leg Press", "3", "10-12", "Day 3", "1", "90"),
      ex("Leg Curl", "3", "10-12", "Day 3", "0", "60"),
      ex("Calf Raise", "4", "12-15", "Day 3", "0", "60"),

      // Push B
      ex("Overhead Press", "4", "6-8", "Day 4", "2", "150"),
      ex("Incline Barbell Press", "4", "8-10", "Day 4", "1", "120"),
      ex("Cable Crossover", "3", "12-15", "Day 4", "0", "60"),
      ex("Arnold Press", "3", "10-12", "Day 4", "0", "90"),
      ex("Overhead Tricep Extension", "3", "12-15", "Day 4", "0", "60"),

      // Pull B
      ex("Deadlift", "4", "5", "Day 5", "3", "180"),
      ex("Lat Pulldown", "4", "8-10", "Day 5", "1", "90"),
      ex("Dumbbell Row", "3", "10-12", "Day 5", "0", "90"),
      ex("Reverse Pec Deck", "3", "12-15", "Day 5", "0", "60"),
      ex("Hammer Curl", "3", "10-12", "Day 5", "0", "60"),

      // Legs B
      ex("Front Squat", "4", "8-10", "Day 6", "2", "120"),
      ex("Hip Thrust", "4", "10-12", "Day 6", "1", "90"),
      ex("Walking Lunge", "3", "12 each", "Day 6", "0", "90"),
      ex("Leg Extension", "3", "12-15", "Day 6", "0", "60"),
      ex("Seated Calf Raise", "4", "15-20", "Day 6", "0", "60"),
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
    exercises: expandWithProgression([
      ex("Barbell Squat", "5", "5", "Day 1", "2", "180"),
      ex("Barbell Bench Press", "5", "5", "Day 1", "2", "150"),
      ex("Barbell Row", "5", "5", "Day 1", "1", "120"),

      ex("Barbell Squat", "5", "5", "Day 2", "2", "180"),
      ex("Overhead Press", "5", "5", "Day 2", "2", "150"),
      ex("Deadlift", "1", "5", "Day 2", "3", "180"),

      ex("Barbell Squat", "5", "5", "Day 3", "2", "180"),
      ex("Barbell Bench Press", "5", "5", "Day 3", "2", "150"),
      ex("Barbell Row", "5", "5", "Day 3", "1", "120"),
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
    exercises: expandWithProgression([
      ex("Cable Crunch", "3", "15-20", "Day 1", "0", "60"),
      ex("Hanging Leg Raise", "3", "10-12", "Day 1", "0", "60"),
      ex("Plank", "3", "45-60s", "Day 1", "0", "60"),
      ex("Russian Twist", "3", "20", "Day 1", "0", "45"),
      ex("Dead Bug", "3", "12 each", "Day 1", "0", "45"),

      ex("Ab Wheel Rollout", "3", "10-12", "Day 2", "0", "60"),
      ex("Bicycle Crunch", "3", "20", "Day 2", "0", "45"),
      ex("Side Plank", "3", "30s each", "Day 2", "0", "45"),
      ex("Pallof Press", "3", "12 each", "Day 2", "0", "60"),
      ex("Reverse Crunch", "3", "15-20", "Day 2", "0", "45"),

      ex("Weighted Sit-Up", "3", "12-15", "Day 3", "0", "60"),
      ex("Hanging Knee Raise", "3", "12-15", "Day 3", "0", "60"),
      ex("Woodchop (Cable)", "3", "12 each", "Day 3", "0", "60"),
      ex("Mountain Climber", "3", "30s", "Day 3", "0", "45"),
      ex("Hollow Body Hold", "3", "30-45s", "Day 3", "0", "45"),
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
    exercises: expandWithProgression([
      ex("Seated Barbell Overhead Press", "4", "6-8", "Day 1", "2", "150"),
      ex("Dumbbell Lateral Raise", "4", "12-15", "Day 1", "0", "60"),
      ex("Face Pull", "3", "15-20", "Day 1", "0", "60"),
      ex("Front Raise (Plate)", "3", "12-15", "Day 1", "0", "60"),
      ex("Shrug", "3", "12-15", "Day 1", "0", "60"),

      ex("Dumbbell Shoulder Press", "4", "8-10", "Day 2", "2", "120"),
      ex("Cable Lateral Raise", "4", "12-15", "Day 2", "0", "60"),
      ex("Reverse Pec Deck", "3", "12-15", "Day 2", "0", "60"),
      ex("Upright Row (Cable)", "3", "10-12", "Day 2", "1", "90"),
      ex("Band Pull-Apart", "3", "20", "Day 2", "0", "45"),

      ex("Arnold Press", "4", "8-10", "Day 3", "1", "90"),
      ex("Lu Raise", "3", "10-12", "Day 3", "0", "60"),
      ex("Bent-Over Reverse Flye", "3", "12-15", "Day 3", "0", "60"),
      ex("Landmine Press", "3", "10 each", "Day 3", "1", "90"),
      ex("Prone Y Raise", "3", "12-15", "Day 3", "0", "45"),
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
    exercises: expandWithProgression([
      ex("Conventional Deadlift", "5", "3-5", "Day 1", "3", "180", "Heavy — RPE 8-9"),
      ex("Deficit Deadlift", "3", "5", "Day 1", "1", "150", "2-inch deficit"),
      ex("Barbell Row", "4", "6-8", "Day 1", "1", "120"),
      ex("Glute-Ham Raise", "3", "8-10", "Day 1", "0", "90"),
      ex("Farmer's Walk", "3", "40m", "Day 1", "0", "90"),

      ex("Sumo Deadlift", "4", "4-6", "Day 2", "2", "150"),
      ex("Block Pull", "3", "3-5", "Day 2", "1", "150"),
      ex("Hip Thrust", "4", "8-10", "Day 2", "1", "90"),
      ex("Seated Cable Row", "3", "10-12", "Day 2", "0", "90"),
      ex("Hanging Leg Raise", "3", "12-15", "Day 2", "0", "60"),

      ex("Paused Deadlift", "4", "3", "Day 3", "2", "150", "2-sec pause at knee"),
      ex("Good Morning", "3", "8-10", "Day 3", "1", "90"),
      ex("Pendlay Row", "4", "5", "Day 3", "1", "120"),
      ex("Back Extension", "3", "12-15", "Day 3", "0", "60"),
      ex("Plank (Weighted)", "3", "45-60s", "Day 3", "0", "60"),

      ex("Deadlift (Speed)", "6", "2", "Day 4", "2", "120", "60% 1RM — explosive"),
      ex("Snatch-Grip Deadlift", "3", "6-8", "Day 4", "1", "120"),
      ex("Reverse Hyperextension", "3", "12-15", "Day 4", "0", "60"),
      ex("Dumbbell Row", "3", "10-12", "Day 4", "0", "90"),
      ex("Ab Wheel Rollout", "3", "10-12", "Day 4", "0", "60"),
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
    exercises: expandWithProgression([
      // Upper A
      ex("Flat Barbell Bench Press", "4", "6-8", "Day 1", "2", "150"),
      ex("Barbell Row", "4", "6-8", "Day 1", "2", "120"),
      ex("Seated Dumbbell Shoulder Press", "3", "8-10", "Day 1", "1", "90"),
      ex("Lat Pulldown", "3", "10-12", "Day 1", "0", "90"),
      ex("Lateral Raise", "3", "12-15", "Day 1", "0", "60"),
      ex("Barbell Curl", "3", "10-12", "Day 1", "0", "60"),
      ex("Tricep Pushdown", "3", "12-15", "Day 1", "0", "60"),

      // Lower A
      ex("Barbell Squat", "4", "6-8", "Day 2", "3", "150"),
      ex("Romanian Deadlift", "4", "8-10", "Day 2", "2", "120"),
      ex("Leg Press", "3", "10-12", "Day 2", "1", "90"),
      ex("Leg Curl", "3", "10-12", "Day 2", "0", "60"),
      ex("Calf Raise", "4", "12-15", "Day 2", "0", "60"),
      ex("Cable Crunch", "3", "15-20", "Day 2", "0", "60"),

      // Upper B
      ex("Incline Dumbbell Press", "4", "8-10", "Day 3", "1", "120"),
      ex("Weighted Pull-Up", "4", "6-8", "Day 3", "1", "120"),
      ex("Cable Crossover", "3", "12-15", "Day 3", "0", "60"),
      ex("Seated Cable Row", "3", "10-12", "Day 3", "0", "90"),
      ex("Arnold Press", "3", "10-12", "Day 3", "0", "90"),
      ex("Hammer Curl", "3", "10-12", "Day 3", "0", "60"),
      ex("Overhead Tricep Extension", "3", "12-15", "Day 3", "0", "60"),

      // Lower B
      ex("Front Squat", "4", "8-10", "Day 4", "2", "120"),
      ex("Hip Thrust", "4", "10-12", "Day 4", "1", "90"),
      ex("Walking Lunge", "3", "12 each", "Day 4", "0", "90"),
      ex("Leg Extension", "3", "12-15", "Day 4", "0", "60"),
      ex("Seated Calf Raise", "4", "15-20", "Day 4", "0", "60"),
      ex("Hanging Leg Raise", "3", "12-15", "Day 4", "0", "60"),
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
    exercises: expandWithProgression([
      ex("Jump Rope", "3", "2 min", "Day 1", "0", "30"),
      ex("Burpee", "4", "10", "Day 1", "0", "45"),
      ex("Kettlebell Swing", "4", "15", "Day 1", "0", "45"),
      ex("Mountain Climber", "3", "30s", "Day 1", "0", "30"),
      ex("Box Jump", "3", "10", "Day 1", "0", "45"),

      ex("Rowing Machine", "5", "500m", "Day 2", "0", "60", "Target pace under 2:00/500m"),
      ex("Assault Bike", "4", "30s sprint", "Day 2", "0", "60"),
      ex("Battle Rope", "3", "30s", "Day 2", "0", "45"),
      ex("Sled Push", "3", "40m", "Day 2", "0", "60"),
      ex("Plank to Push-Up", "3", "10", "Day 2", "0", "30"),

      ex("Treadmill Sprint", "6", "30s", "Day 3", "0", "60"),
      ex("Goblet Squat", "3", "15", "Day 3", "0", "45"),
      ex("Dumbbell Thruster", "3", "12", "Day 3", "0", "45"),
      ex("Jumping Lunge", "3", "10 each", "Day 3", "0", "30"),
      ex("Bear Crawl", "3", "20m", "Day 3", "0", "45"),

      ex("Stair Climber", "1", "10 min", "Day 4", "0", "60"),
      ex("Wall Ball", "4", "15", "Day 4", "0", "45"),
      ex("Kettlebell Clean & Press", "3", "8 each", "Day 4", "0", "60"),
      ex("Lateral Shuffle", "3", "30s", "Day 4", "0", "30"),
      ex("Sprawl", "3", "10", "Day 4", "0", "45"),
    ], 12, "percentage"),
  },
];
