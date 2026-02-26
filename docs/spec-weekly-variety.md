# Weekly Workout Variety System -- Product Spec

**Status**: Ready for implementation
**Task**: #2 (Implement weekly workout variety in catalog plans)
**Author**: pm-lead

---

## Problem

Every week in a 12-week plan currently shows the exact same exercises. `expandWithProgression()` clones the Week 1 template 12 times and only varies sets/reps per periodization phase. Users see "Barbell Hip Thrust" on Day 1 for all 12 weeks, which feels repetitive and is not how real training programs work.

## Goal

Each week should have different recommended exercises while still respecting:
- The plan's muscle group / movement pattern focus
- The periodization phase (Base Volume -> Progressive Overload -> Intensity -> Deload)
- Compound vs. accessory positioning (first 2 per day = compounds, rest = accessories)

## Design

### Core Concept: Exercise Slots with Variation Pools

Instead of hardcoding a single exercise per slot, each position in a day becomes a **slot** defined by a movement pattern. Each slot has a pool of interchangeable exercises that rotate week-to-week.

### New Data Structures

```typescript
// New type: an exercise slot with alternatives
type ExerciseSlot = {
  /** The movement pattern this slot targets (for documentation/grouping) */
  movementPattern: string;  // e.g. "hip-hinge", "horizontal-push", "quad-dominant"

  /** Pool of exercise names that can fill this slot. Index 0 is the "primary" exercise. */
  variations: string[];  // e.g. ["Barbell Hip Thrust", "Smith Machine Hip Thrust", "Banded Hip Thrust"]

  /** Base parameters (from the Week 1 template) */
  sets: string;
  reps: string;
  day: string;
  warmUpSets?: string;
  restTime?: string;
  comments?: string;
};

// Updated catalog plan shape
type CatalogPlanV2 = {
  id: string;
  name: string;
  goal: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  daysPerWeek: number;
  slots: ExerciseSlot[];      // <-- NEW: replaces the flat exercises array at authoring time
  exercises: Exercise[];       // <-- GENERATED: expanded from slots (backward compat)
  totalWeeks?: number;
  weeklyProgression?: ProgressionRule;
};
```

### Rotation Algorithm

The `expandWithProgression()` function should be updated to:

1. Accept `ExerciseSlot[]` instead of (or in addition to) `Exercise[]`
2. For each week, pick the exercise from the pool using a deterministic rotation:
   ```
   variationIndex = (weekNumber - 1) % slot.variations.length
   exerciseName = slot.variations[variationIndex]
   ```
3. **Deload weeks (Week 12)**: Always use the primary exercise (index 0) -- this is the movement the user is most familiar with, which is safer for deload.
4. **Intensity phase (Weeks 9-11)**: Prefer the first 2 variations (the "heavier" / more standard movements). Use:
   ```
   variationIndex = (weekNumber - 1) % Math.min(2, slot.variations.length)
   ```

This means:
- A slot with 3 variations cycles: A, B, C, A, B, C, A, B, A, B, A, A (deload)
- A slot with 2 variations alternates: A, B, A, B, A, B, A, B, A, B, A, A (deload)
- A slot with 1 variation stays the same (backward compatible with current behavior)

### Variation Pool Guidelines (for catalog authoring)

**Compounds (positions 0-1 per day):**
- 2-3 variations per slot
- All variations should allow similar loading (don't mix barbell squat with bodyweight squat)
- Variations should hit the same primary muscle group

**Accessories (positions 2+ per day):**
- 2-4 variations per slot
- More flexibility allowed (cable vs. dumbbell vs. machine for same isolation)
- Can include bodyweight alternatives

### Example: Glute Buster Day 1 Slots

| Position | Movement Pattern | Variations |
|----------|-----------------|------------|
| Compound 1 | hip-extension | Barbell Hip Thrust, Smith Machine Hip Thrust, Banded Barbell Hip Thrust |
| Compound 2 | hip-hinge | Romanian Deadlift, Stiff-Leg Deadlift, Dumbbell RDL |
| Accessory 1 | unilateral-squat | Bulgarian Split Squat, Reverse Lunge, Step-Up |
| Accessory 2 | glute-isolation | Cable Kickback, Donkey Kick (Machine), Single-Leg Cable Kickback |
| Accessory 3 | glute-activation | Glute Bridge (Banded), Frog Pump, Fire Hydrant (Banded) |

So Week 1 Day 1: Hip Thrust, RDL, Bulgarian Split Squat, Cable Kickback, Glute Bridge
Week 2 Day 1: Smith Machine Hip Thrust, Stiff-Leg DL, Reverse Lunge, Donkey Kick, Frog Pump
Week 3 Day 1: Banded Barbell Hip Thrust, Dumbbell RDL, Step-Up, Single-Leg Cable Kickback, Fire Hydrant
Week 4 Day 1: (cycle restarts) Hip Thrust, RDL, Bulgarian Split Squat...

## Implementation Plan

### Step 1: Add types (lib/types.ts)

Add `ExerciseSlot` type. Do NOT remove or modify existing types -- backward compatibility is critical.

### Step 2: Update catalog authoring (lib/catalog.ts)

- Create a new helper `slot()` (similar to existing `ex()`) that produces `ExerciseSlot` objects
- Rewrite each of the 12 plans to use `slots` arrays with variation pools
- Keep the `ex()` helper for potential fallback

### Step 3: Update expandWithProgression (lib/catalog.ts)

- Rename current function to `expandWithProgressionLegacy` (for imported plans that don't have slots)
- New `expandWithProgression` accepts `ExerciseSlot[]` and produces `Exercise[]`
- Applies the rotation algorithm described above
- Output is the same `Exercise[]` type, so downstream code (plan.tsx, useWorkouts.ts, session) requires ZERO changes

### Step 4: Wire it up in CATALOG_PLANS

Each plan object calls the new `expandWithProgression(slots, 12, progressionType)` to populate its `exercises` field, exactly as today.

## What Does NOT Change

- `Exercise` type -- stays the same
- `CatalogPlan` type -- the `exercises: Exercise[]` field is still the output consumed by all screens
- `plan.tsx`, `catalog.tsx`, `useWorkouts.ts`, `session/[id].tsx` -- zero changes needed
- Imported plans (CSV/Excel/Google Sheets) -- unaffected, they don't use the catalog system
- The periodization phase logic (sets/reps per phase) -- stays exactly the same

## Acceptance Criteria

1. Opening any catalog plan and switching between Week 1, Week 2, and Week 3 shows different exercise names for most slots
2. The muscle group focus per day is preserved (Glute day stays glute-focused)
3. Deload week (Week 12) uses the primary/familiar exercise for each slot
4. All existing tests pass (if any)
5. No changes required to any screen component or hook -- the variety is entirely contained in the catalog/expansion layer

## Variation Pools Per Plan

The implementing engineer should author 2-4 variations per slot for each of the 12 plans. Below are the required pools for all plans. Each pool entry lists [Primary, Alt1, Alt2, ...].

### 1. Glute Buster (3 days, 5 exercises/day)

**Day 1:**
- Hip Thrust slot: [Barbell Hip Thrust, Smith Machine Hip Thrust, Banded Barbell Hip Thrust]
- Hip Hinge slot: [Romanian Deadlift, Stiff-Leg Deadlift, Dumbbell RDL]
- Unilateral Squat slot: [Bulgarian Split Squat, Reverse Lunge, Step-Up]
- Glute Isolation slot: [Cable Kickback, Donkey Kick (Machine), Single-Leg Cable Kickback]
- Glute Activation slot: [Glute Bridge (Banded), Frog Pump, Fire Hydrant (Banded)]

**Day 2:**
- Deadlift Variation slot: [Sumo Deadlift, Sumo Block Pull, Wide-Stance Leg Press]
- Squat Variation slot: [Goblet Squat, Heel-Elevated Goblet Squat, Dumbbell Squat]
- Abduction slot: [Hip Abduction Machine, Seated Band Abduction, Cable Hip Abduction]
- Unilateral Hip Ext slot: [Single-Leg Hip Thrust, Single-Leg Glute Bridge, B-Stance Hip Thrust]
- Abduction Finisher slot: [Seated Band Abduction, Clamshell (Banded), Side-Lying Hip Abduction]

**Day 3:**
- Quad Compound slot: [Front Squat, Goblet Squat, Safety Bar Squat]
- Lunge Pattern slot: [Walking Lunge, Reverse Lunge, Curtsy Lunge]
- Posterior Chain slot: [Cable Pull-Through, Kettlebell Swing, Band Pull-Through]
- Back Extension slot: [Reverse Hyperextension, Back Extension, 45-Degree Hyper]
- Glute Finisher slot: [Frog Pump, Glute Bridge Pulse, Banded Glute Kickback]

### 2. Chest Pump (3 days, 5 exercises/day)

**Day 1:**
- Flat Press slot: [Flat Barbell Bench Press, Flat Dumbbell Bench Press, Machine Chest Press]
- Incline Press slot: [Incline Dumbbell Press, Incline Barbell Press, Incline Smith Press]
- Cable Fly slot: [Cable Crossover, High-to-Low Cable Flye, Mid-Cable Flye]
- Fly slot: [Dumbbell Flye, Incline Dumbbell Flye, Pec Deck Machine]
- Burnout slot: [Push-Up (Burnout), Diamond Push-Up, Decline Push-Up]

**Day 2:**
- Incline Compound slot: [Incline Barbell Press, Incline Dumbbell Press, Incline Smith Press]
- Flat DB slot: [Flat Dumbbell Press, Flat Barbell Bench Press, Close-Grip Bench Press]
- Machine Fly slot: [Pec Deck Machine, Machine Flye, Plate-Loaded Chest Flye]
- Cable Fly 2 slot: [Low-to-High Cable Flye, Cable Crossover, Mid-Cable Flye]
- Dip slot: [Dip (Chest Emphasis), Weighted Dip, Assisted Dip]

**Day 3:**
- Squeeze Press slot: [Dumbbell Squeeze Press, Svend Press, Hex Press]
- Machine Press slot: [Machine Chest Press, Smith Machine Bench, Hammer Strength Press]
- Cable slot: [High-to-Low Cable Flye, Cable Crossover, Low-to-High Cable Flye]
- Isolation slot: [Svend Press, Plate Squeeze Press, Pec Deck (Partial ROM)]
- Bodyweight slot: [Decline Push-Up, Push-Up (Burnout), Wide Push-Up]

### 3. Arm Destroyer (3 days, 5 exercises/day)

**Day 1:**
- Bicep Compound slot: [Barbell Curl, EZ-Bar Curl, Thick-Bar Curl]
- Bicep Iso slot: [Hammer Curl, Cross-Body Hammer Curl, Rope Hammer Curl]
- Tricep Push slot: [Tricep Rope Pushdown, Tricep V-Bar Pushdown, Tricep Straight-Bar Pushdown]
- Tricep Extension slot: [Overhead Tricep Extension, Dumbbell Overhead Extension, Cable Overhead Extension]
- Forearm slot: [Wrist Curl, Reverse Wrist Curl, Farmer Hold]

**Day 2:**
- Bicep Stretch slot: [Incline Dumbbell Curl, Bayesian Curl, Cable Curl (Behind)]
- Bicep Peak slot: [Concentration Curl, Spider Curl, Preacher Curl]
- Tricep Compound slot: [Close-Grip Bench Press, Close-Grip Floor Press, JM Press]
- Tricep Iso slot: [Skull Crusher, Dumbbell Skull Crusher, Cable Skull Crusher]
- Forearm 2 slot: [Reverse Curl, Zottman Curl, Hammer Curl (Slow Eccentric)]

**Day 3:**
- Superset Bi slot: [EZ-Bar Curl, Barbell Curl, Cable Curl]
- Superset Tri slot: [Dip (Tricep Emphasis), Bench Dip, Close-Grip Push-Up]
- Superset Bi 2 slot: [Cable Curl, Machine Curl, Band Curl]
- Superset Tri 2 slot: [Tricep Pushdown (V-Bar), Tricep Rope Pushdown, Single-Arm Pushdown]
- Forearm 3 slot: [Behind-the-Back Wrist Curl, Plate Pinch, Wrist Roller]

### 4. Full Body Burn (3 days, 5 exercises/day)

**Day 1:**
- Squat slot: [Barbell Squat, Goblet Squat, Leg Press]
- Horizontal Push slot: [Flat Dumbbell Bench Press, Barbell Bench Press, Machine Chest Press]
- Horizontal Pull slot: [Bent-Over Barbell Row, Dumbbell Row, Seated Cable Row]
- Vertical Push slot: [Overhead Press, Dumbbell Shoulder Press, Arnold Press]
- Core slot: [Plank, Dead Bug, Pallof Press]

**Day 2:**
- Hinge slot: [Romanian Deadlift, Good Morning, Dumbbell RDL]
- Incline Push slot: [Incline Dumbbell Press, Incline Barbell Press, Landmine Press]
- Vertical Pull slot: [Lat Pulldown, Pull-Up (Assisted), Cable Pullover]
- Lateral slot: [Lateral Raise, Cable Lateral Raise, Machine Lateral Raise]
- Core 2 slot: [Hanging Knee Raise, Leg Raise, Cable Crunch]

**Day 3:**
- Leg Press slot: [Leg Press, Hack Squat, Smith Machine Squat]
- Row Variation slot: [Dumbbell Row, T-Bar Row, Meadows Row]
- Machine Push slot: [Machine Chest Press, Cable Crossover, Pec Deck]
- Rear Delt slot: [Face Pull, Reverse Pec Deck, Band Pull-Apart]
- Core 3 slot: [Cable Crunch, Weighted Sit-Up, Russian Twist]

### 5. Squat PR Builder (4 days, 5 exercises/day)

**Day 1 (Heavy):**
- Main Squat slot: [Back Squat] (1 variation -- always Back Squat on heavy day)
- Paused Work slot: [Pause Squat, Pin Squat, Anderson Squat]
- Leg Press slot: [Leg Press, Hack Squat, Belt Squat]
- Lunge slot: [Walking Lunge, Reverse Lunge, Front-Rack Lunge]
- Core slot: [Ab Wheel Rollout, Hanging Leg Raise, Pallof Press]

**Day 2 (Supplemental):**
- Front Squat slot: [Front Squat, Goblet Squat, Safety Bar Squat]
- Unilateral slot: [Bulgarian Split Squat, Step-Up, Single-Leg Press]
- Quad Iso slot: [Leg Extension, Sissy Squat, Wall Sit (Weighted)]
- Hamstring slot: [Leg Curl, Nordic Curl, Seated Leg Curl]
- Calf slot: [Calf Raise, Seated Calf Raise, Donkey Calf Raise]

**Day 3 (Speed):**
- Speed Squat slot: [Back Squat (Speed)] (1 variation -- always speed squats)
- Box Work slot: [Box Squat, Low Box Squat, Pause Box Squat]
- Machine Squat slot: [Hack Squat, Leg Press, Pendulum Squat]
- Posterior slot: [Glute-Ham Raise, Nordic Curl, Reverse Hyper]
- Core 2 slot: [Plank, Suitcase Carry, Farmer Walk]

**Day 4 (Max):**
- Top Single slot: [Back Squat (Top Single)] (1 variation -- always the competition lift)
- Tempo slot: [Tempo Squat, 1.5 Rep Squat, Eccentric-Only Squat]
- Step-Up slot: [Step-Up, Reverse Lunge, Walking Lunge]
- Quad Finisher slot: [Sissy Squat, Leg Extension, Wall Sit]
- Core 3 slot: [Hanging Leg Raise, Ab Wheel Rollout, Cable Crunch]

### 6. Push Pull Legs (6 days, 5 exercises/day)

**Day 1 (Push A):**
- Flat Press slot: [Flat Barbell Bench Press, Flat Dumbbell Bench Press, Close-Grip Bench Press]
- Shoulder Press slot: [Seated Dumbbell Shoulder Press, Arnold Press, Machine Shoulder Press]
- Incline slot: [Incline Dumbbell Press, Incline Barbell Press, Low-Incline Dumbbell Press]
- Lateral slot: [Lateral Raise, Cable Lateral Raise, Machine Lateral Raise]
- Tricep slot: [Tricep Rope Pushdown, Overhead Tricep Extension, Tricep Dip]

**Day 2 (Pull A):**
- Row slot: [Barbell Row, Pendlay Row, T-Bar Row]
- Pull-Up slot: [Weighted Pull-Up, Lat Pulldown, Neutral-Grip Pull-Up]
- Cable Row slot: [Seated Cable Row, Chest-Supported Row, Machine Row]
- Rear Delt slot: [Face Pull, Reverse Pec Deck, Band Pull-Apart]
- Bicep slot: [Barbell Curl, EZ-Bar Curl, Dumbbell Curl]

**Day 3 (Legs A):**
- Squat slot: [Barbell Squat, Safety Bar Squat, Belt Squat]
- Hip Hinge slot: [Romanian Deadlift, Stiff-Leg Deadlift, Good Morning]
- Quad Acc slot: [Leg Press, Hack Squat, Pendulum Squat]
- Hamstring slot: [Leg Curl, Nordic Curl, Seated Leg Curl]
- Calf slot: [Calf Raise, Seated Calf Raise, Leg Press Calf Raise]

**Day 4 (Push B):**
- OHP slot: [Overhead Press, Push Press, Viking Press]
- Incline Compound slot: [Incline Barbell Press, Incline Dumbbell Press, Incline Smith Press]
- Cable Fly slot: [Cable Crossover, Low-to-High Cable Flye, Pec Deck]
- Shoulder Acc slot: [Arnold Press, Lu Raise, Dumbbell Front Raise]
- Tricep 2 slot: [Overhead Tricep Extension, Skull Crusher, Tricep Kickback]

**Day 5 (Pull B):**
- Deadlift slot: [Deadlift, Sumo Deadlift, Trap Bar Deadlift]
- Pulldown slot: [Lat Pulldown, Close-Grip Pulldown, Straight-Arm Pulldown]
- Row 2 slot: [Dumbbell Row, Chest-Supported Row, Meadows Row]
- Rear Delt 2 slot: [Reverse Pec Deck, Face Pull, Prone Y Raise]
- Bicep 2 slot: [Hammer Curl, Incline Curl, Concentration Curl]

**Day 6 (Legs B):**
- Front Squat slot: [Front Squat, Goblet Squat, Zercher Squat]
- Hip Thrust slot: [Hip Thrust, Barbell Glute Bridge, Smith Machine Hip Thrust]
- Lunge slot: [Walking Lunge, Reverse Lunge, Lateral Lunge]
- Quad Iso slot: [Leg Extension, Sissy Squat, Spanish Squat]
- Calf 2 slot: [Seated Calf Raise, Standing Calf Raise, Single-Leg Calf Raise]

### 7. 5x5 Strength (3 days, 3 exercises/day)

**Day 1 (A):**
- Squat slot: [Barbell Squat] (no rotation -- 5x5 core lift)
- Bench slot: [Barbell Bench Press] (no rotation -- 5x5 core lift)
- Row slot: [Barbell Row, Pendlay Row, T-Bar Row]

**Day 2 (B):**
- Squat slot: [Barbell Squat] (no rotation -- 5x5 core lift)
- Press slot: [Overhead Press] (no rotation -- 5x5 core lift)
- Deadlift slot: [Deadlift] (no rotation -- 5x5 core lift)

**Day 3 (A alt):**
- Squat slot: [Barbell Squat] (no rotation -- 5x5 core lift)
- Bench slot: [Barbell Bench Press] (no rotation -- 5x5 core lift)
- Row slot: [Barbell Row, Pendlay Row, T-Bar Row]

> Note: 5x5 is intentionally minimal and repetitive by design. Only the accessory row slot varies.

### 8. Core and Abs (3 days, 5 exercises/day)

**Day 1:**
- Weighted Flexion slot: [Cable Crunch, Weighted Sit-Up, Machine Crunch]
- Hanging slot: [Hanging Leg Raise, Hanging Knee Raise, Toes-to-Bar]
- Isometric slot: [Plank, RKC Plank, Long-Lever Plank]
- Rotation slot: [Russian Twist, Woodchop (Cable), Landmine Rotation]
- Anti-Extension slot: [Dead Bug, Bird Dog, Bear Crawl]

**Day 2:**
- Rollout slot: [Ab Wheel Rollout, Barbell Rollout, Stability Ball Rollout]
- Crunch Variation slot: [Bicycle Crunch, Reverse Crunch, V-Up]
- Lateral Stability slot: [Side Plank, Copenhagen Plank, Suitcase Carry]
- Anti-Rotation slot: [Pallof Press, Banded Pallof Press, Half-Kneeling Pallof Press]
- Reverse Crunch slot: [Reverse Crunch, Lying Leg Raise, Decline Reverse Crunch]

**Day 3:**
- Weighted slot: [Weighted Sit-Up, Cable Crunch, Decline Weighted Crunch]
- Knee Raise slot: [Hanging Knee Raise, Captain's Chair Knee Raise, Decline Knee Raise]
- Woodchop slot: [Woodchop (Cable), Landmine Rotation, Half-Kneeling Woodchop]
- Dynamic slot: [Mountain Climber, Bear Crawl, Plank to Push-Up]
- Isometric 2 slot: [Hollow Body Hold, L-Sit, Dead Bug (Weighted)]

### 9. Shoulder Sculptor (3 days, 5 exercises/day)

**Day 1:**
- Press Compound slot: [Seated Barbell Overhead Press, Standing Overhead Press, Push Press]
- Lateral Raise slot: [Dumbbell Lateral Raise, Cable Lateral Raise, Machine Lateral Raise]
- Rear Delt slot: [Face Pull, Band Pull-Apart, Reverse Pec Deck]
- Front Raise slot: [Front Raise (Plate), Dumbbell Front Raise, Cable Front Raise]
- Trap slot: [Shrug, Dumbbell Shrug, Behind-the-Back Shrug]

**Day 2:**
- DB Press slot: [Dumbbell Shoulder Press, Arnold Press, Seated Dumbbell Press (Neutral Grip)]
- Cable Lateral slot: [Cable Lateral Raise, Lean-Away Lateral Raise, Cable Y Raise]
- Rear Delt 2 slot: [Reverse Pec Deck, Bent-Over Reverse Flye, Prone Y Raise]
- Upright Row slot: [Upright Row (Cable), Dumbbell Upright Row, Cable High Pull]
- Band Work slot: [Band Pull-Apart, Band Face Pull, Band Dislocate]

**Day 3:**
- Compound Press slot: [Arnold Press, Landmine Press, Z Press]
- Lu/Complex slot: [Lu Raise, Dumbbell Y-T-W, Prone I-Y-T Raise]
- Reverse Flye slot: [Bent-Over Reverse Flye, Reverse Pec Deck, Cable Reverse Flye]
- Unilateral Press slot: [Landmine Press, Single-Arm Dumbbell Press, Half-Kneeling Landmine Press]
- Rehab/Stability slot: [Prone Y Raise, External Rotation (Cable), Face Pull (Light)]

### 10. Deadlift Dominator (4 days, 5 exercises/day)

**Day 1 (Heavy):**
- Main Deadlift slot: [Conventional Deadlift] (no rotation -- main lift)
- Deficit Work slot: [Deficit Deadlift, Paused Deadlift, Snatch-Grip Deadlift]
- Row slot: [Barbell Row, Pendlay Row, Meadows Row]
- Posterior Chain slot: [Glute-Ham Raise, Nordic Curl, Back Extension]
- Grip/Carry slot: [Farmer's Walk, Suitcase Carry, Dead Hang]

**Day 2 (Variation):**
- Sumo slot: [Sumo Deadlift, Wide-Stance RDL, Sumo Block Pull]
- Block Pull slot: [Block Pull, Rack Pull, Pin Pull]
- Hip Thrust slot: [Hip Thrust, Barbell Glute Bridge, Smith Machine Hip Thrust]
- Cable Row slot: [Seated Cable Row, Chest-Supported Row, Machine Row]
- Core slot: [Hanging Leg Raise, Ab Wheel Rollout, Cable Crunch]

**Day 3 (Technique):**
- Paused DL slot: [Paused Deadlift, Tempo Deadlift, Deficit Deadlift]
- Good Morning slot: [Good Morning, Seated Good Morning, SSB Good Morning]
- Heavy Row slot: [Pendlay Row, Barbell Row, T-Bar Row]
- Back Extension slot: [Back Extension, 45-Degree Hyper, Reverse Hyperextension]
- Core 2 slot: [Plank (Weighted), Dead Bug, Pallof Press]

**Day 4 (Speed):**
- Speed DL slot: [Deadlift (Speed)] (no rotation -- speed work stays consistent)
- Snatch-Grip slot: [Snatch-Grip Deadlift, Snatch-Grip RDL, Clean Pull]
- Reverse Hyper slot: [Reverse Hyperextension, GHR, Back Extension]
- Row Variation slot: [Dumbbell Row, Chest-Supported Row, Kroc Row]
- Core 3 slot: [Ab Wheel Rollout, Hanging Leg Raise, Suitcase Carry]

### 11. Upper Lower Split (4 days, 6-7 exercises/day)

**Day 1 (Upper A):**
- Flat Press slot: [Flat Barbell Bench Press, Dumbbell Bench Press, Close-Grip Bench Press]
- Row slot: [Barbell Row, T-Bar Row, Pendlay Row]
- Shoulder Press slot: [Seated Dumbbell Shoulder Press, Arnold Press, Machine Shoulder Press]
- Pulldown slot: [Lat Pulldown, Pull-Up, Close-Grip Pulldown]
- Lateral slot: [Lateral Raise, Cable Lateral Raise, Machine Lateral Raise]
- Bicep slot: [Barbell Curl, EZ-Bar Curl, Dumbbell Curl]
- Tricep slot: [Tricep Pushdown, Rope Pushdown, V-Bar Pushdown]

**Day 2 (Lower A):**
- Squat slot: [Barbell Squat, Safety Bar Squat, Belt Squat]
- Hinge slot: [Romanian Deadlift, Good Morning, Stiff-Leg Deadlift]
- Leg Press slot: [Leg Press, Hack Squat, Pendulum Squat]
- Hamstring slot: [Leg Curl, Nordic Curl, Seated Leg Curl]
- Calf slot: [Calf Raise, Seated Calf Raise, Donkey Calf Raise]
- Core slot: [Cable Crunch, Hanging Leg Raise, Ab Wheel Rollout]

**Day 3 (Upper B):**
- Incline Press slot: [Incline Dumbbell Press, Incline Barbell Press, Low-Incline Smith Press]
- Vertical Pull slot: [Weighted Pull-Up, Lat Pulldown, Neutral-Grip Pull-Up]
- Fly slot: [Cable Crossover, Pec Deck, Dumbbell Flye]
- Cable Row slot: [Seated Cable Row, Chest-Supported Row, Machine Row]
- Shoulder Acc slot: [Arnold Press, Lu Raise, Landmine Press]
- Bicep 2 slot: [Hammer Curl, Incline Curl, Concentration Curl]
- Tricep 2 slot: [Overhead Tricep Extension, Skull Crusher, Tricep Kickback]

**Day 4 (Lower B):**
- Front Squat slot: [Front Squat, Goblet Squat, Zercher Squat]
- Hip Thrust slot: [Hip Thrust, Barbell Glute Bridge, Smith Machine Hip Thrust]
- Lunge slot: [Walking Lunge, Reverse Lunge, Lateral Lunge]
- Quad Iso slot: [Leg Extension, Sissy Squat, Wall Sit (Weighted)]
- Calf 2 slot: [Seated Calf Raise, Standing Calf Raise, Single-Leg Calf Raise]
- Core 2 slot: [Hanging Leg Raise, Cable Crunch, Pallof Press]

### 12. Cardio Shred (4 days, 5 exercises/day)

**Day 1 (HIIT Circuit):**
- Warm-Up slot: [Jump Rope, Jumping Jacks, High Knees]
- Explosive slot: [Burpee, Burpee Box Jump, Squat Jump to Burpee]
- Kettlebell slot: [Kettlebell Swing, Kettlebell Snatch, Kettlebell Clean]
- Dynamic slot: [Mountain Climber, Spider Climber, Plank Jack]
- Plyo slot: [Box Jump, Broad Jump, Depth Jump]

**Day 2 (Cardio Machines):**
- Rowing slot: [Rowing Machine, Ski Erg, Assault Bike (Distance)]
- Bike slot: [Assault Bike, Echo Bike, Spin Bike Sprint]
- Upper Conditioning slot: [Battle Rope, Rope Climb, Ball Slam]
- Sled slot: [Sled Push, Sled Drag, Prowler Sprint]
- Bodyweight Burnout slot: [Plank to Push-Up, Burpee, Mountain Climber]

**Day 3 (Sprint + Strength):**
- Sprint slot: [Treadmill Sprint, Bike Sprint, Hill Sprint]
- Lower Strength slot: [Goblet Squat, Dumbbell Squat, Kettlebell Front Squat]
- Full-Body slot: [Dumbbell Thruster, Kettlebell Thruster, Barbell Thruster]
- Lunge slot: [Jumping Lunge, Walking Lunge, Lateral Lunge]
- Crawl slot: [Bear Crawl, Crab Walk, Inchworm]

**Day 4 (Metabolic Finisher):**
- Steady-State slot: [Stair Climber, Incline Walk, Step Mill]
- Wall Ball slot: [Wall Ball, Medicine Ball Slam, Med Ball Throw]
- KB Complex slot: [Kettlebell Clean & Press, KB Snatch, KB Thruster]
- Agility slot: [Lateral Shuffle, Agility Ladder, Cone Drill]
- Conditioning slot: [Sprawl, Burpee, Man Maker]

---

## Summary for Implementing Engineer

1. Add `ExerciseSlot` type to `lib/types.ts`
2. Add `slot()` helper to `lib/catalog.ts`
3. Update `expandWithProgression()` to accept slots and apply the rotation algorithm
4. Rewrite each plan's exercise array to use `slot()` with variation pools from this spec
5. The `exercises` field on `CatalogPlan` remains `Exercise[]` -- it's just generated differently now
6. Test by loading any plan and verifying Week 1 vs Week 2 show different exercise names
