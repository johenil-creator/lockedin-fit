// All shared types for LockedIn Fit

export type SetEntry = {
  reps: string;
  weight: string;
  completed: boolean;
  isWarmUp?: boolean;
};

export type SessionExercise = {
  exerciseId: string;
  name: string;
  sets: SetEntry[];
  notes?: string;
  warmUpSets?: number;
  restTime?: number;
  loadSource?: 'orm' | 'history' | 'rpe-estimate' | 'none';
  targetRPE?: number;
  // Catalog match metadata (for debug / autofill tracing)
  catalogId?: string;
  matchedPattern?: string;
  matchedAnchor?: string;
  matchedModifier?: number;
};

export type WorkoutSession = {
  id: string;
  name: string;
  date: string;
  exercises: SessionExercise[];
  isActive?: boolean;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  goal?: string;
  planWeek?: string;
  planDay?: string;
  xpClaimed?: boolean;
  // ── Cardio ────────────────────────────────────────────────────────────────
  sessionType?: 'strength' | 'cardio';
  cardioModality?: 'running' | 'cycling' | 'rowing' | 'walking' | 'swimming' | 'elliptical' | 'stairclimber' | 'jump_rope' | 'other';
  cardioGoalType?: 'time' | 'distance' | 'intervals';
  cardioGoalValue?: number;          // minutes, km, or round count
  cardioIntensity?: number;          // RPE 1-10
  cardioDurationMs?: number;         // actual active time excluding pauses
  cardioDistanceKm?: number;
  cardioIntervalsCompleted?: number;
  cardioIntervalConfig?: { rounds: number; workSeconds: number; restSeconds: number };
  virtualSets?: number;              // for XP calculation
  // ── Idempotency flags ─────────────────────────────────────────────────────
  prAwarded?: boolean;
  badgesUnlocked?: string[];         // badge IDs already awarded for this session
};

export type Exercise = {
  exercise: string;
  sets: string;
  reps: string;
  weight: string;
  comments: string;
  week: string;
  day: string;
  warmUpSets?: string;
  restTime?: string;
  notes?: string;
};

export type ProgressionRule = {
  type: 'linear' | 'percentage';
  increment?: number;
  percentIncrease?: number;
};

export type PlanData = {
  name: string;
  data: Exercise[];
  goal?: string;
  description?: string;
  totalWeeks?: number;
  weeklyProgression?: ProgressionRule;
  currentWeek?: number;
};

export type ExerciseSlot = {
  movementPattern: string;
  variations: string[];
  sets: string;
  reps: string;
  day: string;
  warmUpSets?: string;
  restTime?: string;
  comments?: string;
};

export type CatalogPlan = {
  id: string;
  name: string;
  goal: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  daysPerWeek: number;
  exercises: Exercise[];
  totalWeeks?: number;
  weeklyProgression?: ProgressionRule;
};

export type UserProfile = {
  name: string;
  weight: string;
  weightUnit: 'kg' | 'lbs';
  onboardingComplete?: boolean;
  manual1RM: {
    deadlift?: string;
    squat?: string;
    ohp?: string;
    bench?: string;
  };
  estimated1RM?: {
    deadlift?: string;
    squat?: string;
    ohp?: string;
    bench?: string;
  };
  lastTestedAt?: string;
  restDays?: number[];         // 0=Sun … 6=Sat — days with no workout expected
  freezesRemaining?: number;   // streak freezes left this week (default 2)
  freezesResetWeek?: string;   // ISO week string (e.g. "2026-W09") when freezes last reset
  defaultRestTimer?: number;   // rest timer default in seconds (30/60/90/120)
  hapticsEnabled?: boolean;    // global haptics toggle (default true)
  cardioPRs?: CardioPRs;
  badges?: Badge[];
};

// ── 1RM Test Session ────────────────────────────────────────────────────────

export type OrmLiftKey = 'squat' | 'deadlift' | 'bench' | 'ohp';

export type OrmSet = {
  setNumber: number;                   // 1–7
  prescribedPct: number;               // 0 = bar, 0.5, 0.6, 0.7, 0.8, 0.85, 0.90
  prescribedReps: number | 'amrap';    // sets 1-6 fixed, set 7 = 'amrap'
  weight: string;                      // pre-filled, editable
  reps: string;                        // fixed label for sets 1-6; editable on set 7
  completed: boolean;
};

export type OrmLiftResult = {
  liftKey: OrmLiftKey;
  liftLabel: string;
  estimatedInput: string;
  sets: OrmSet[];                      // always 7
  finalOrm: string | null;             // null until lift complete
  completed: boolean;
};

export type OrmTestSession = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  unit: 'kg' | 'lbs';
  lifts: OrmLiftResult[];              // 4 lifts, pre-generated on startTest
  currentLiftIndex: number;            // resume pointer
  status: 'in_progress' | 'completed' | 'abandoned';
};

// ── Performance & Progression System ─────────────────────────────────────────

export type RankLevel =
  | 'Runt'
  | 'Scout'
  | 'Stalker'
  | 'Hunter'
  | 'Sentinel'
  | 'Alpha'
  | 'Apex';

export type XPHistoryEntry = {
  date: string;      // ISO date string
  amount: number;
  reason: string;    // human-readable label e.g. "Session complete", "PR hit"
};

export type XPRecord = {
  total: number;         // lifetime XP — never decreases
  rank: RankLevel;
  history: XPHistoryEntry[];
  awardedMilestones?: string[];  // permanent record of streak milestones awarded
};

export type PerformanceWeek = {
  weekKey: string;           // "2026-W08" ISO week string
  score: number;             // 0–100
  sessionsCompleted: number;
  setsCompleted: number;
  prsHit: number;
  streakDays: number;
};

export type StreakData = {
  current: number;            // consecutive training days
  longest: number;
  lastActivityDate: string;   // ISO date "YYYY-MM-DD"
};

// ── Cardio PRs & Badges ───────────────────────────────────────────────────────

export type CardioPRKey =
  | 'longestSteady'
  | 'longestZone2'
  | 'longestDistance'
  | 'fastest1mi'
  | 'fastest1km'
  | 'fastest5km'
  | 'mostIntervals'
  | 'longestIntervalSession';

export type CardioPRs = Partial<Record<CardioPRKey, { value: number; date: string }>>;

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
};

// ── Plan Progress ────────────────────────────────────────────────────────────

export type PlanProgress = {
  /** Keys are "Week X|Day Y" strings, value is ISO date of completion */
  completedDays: Record<string, string>;
};

// ── Locke (Wolf Mascot) ───────────────────────────────────────────────────────

export type LockeState =
  | 'neutral'
  | 'encouraging'
  | 'celebrating'
  | 'disappointed'
  | 'intense'
  | 'savage'
  | 'onboarding_guide';

export type LockeTrigger =
  | 'session_complete'
  | 'pr_hit'
  | 'streak_milestone'
  | 'inactivity'
  | 'rank_up'
  | 'onboarding'
  | '1rm_test'
  | 'low_performance'
  | 'high_performance';

// ── Locke State Machine ───────────────────────────────────────────────────────

/** Behavioural states — what Locke "wants to do" right now. */
export type LockeStateMachineState =
  | 'idle'             // default — no active signal
  | 'encouraging'      // solid session, comeback, or building streak
  | 'challenging'      // low performance, weak session, below threshold
  | 'celebrating'      // PR, rank-up, major milestone
  | 'inactive_warning';// crossed inactivity threshold

/** Events that drive machine transitions. */
export type LockeMachineEvent =
  | { type: 'WORKOUT_COMPLETE'; weekScore: number; daysSinceLastSession: number }
  | { type: 'PR_ACHIEVED' }
  | { type: 'INACTIVITY_THRESHOLD'; daysSince: number }
  | { type: 'WEEKLY_SCORE_UPDATE'; score: number }
  | { type: 'RANK_UP' };

/** Persisted machine record (stored in AsyncStorage). */
export type LockeMachineRecord = {
  state:        LockeStateMachineState;
  enteredAt:    string;   // ISO timestamp of last state change
  eventCount:   number;   // how many events have fired in current state
};

// ── Load Engine Types ────────────────────────────────────────────────────────

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'isolation_upper'
  | 'isolation_lower'
  | 'core'
  | 'conditioning'
  | 'carry'
  | 'unknown';

export type LoadModifier = {
  fraction: number;
  label: string;
};

export type ExerciseClassification = {
  catalogId: string | null;
  pattern: MovementPattern;
  baseLift: OrmLiftKey | null;
  modifier: LoadModifier;
  confidence: number;
};

export type WeekPrescription = {
  intensity: number;
  rpe: number;
  sets: number;
  reps: number;
  phaseLabel: string;
  isDeload: boolean;
};

export type ExerciseLoadResult = {
  workingWeight: number | null;
  source: 'orm' | 'history' | 'rpe-estimate' | 'none';
  warmUps: { weight: string; reps: string }[];
  workingSets: { weight: string; reps: string }[];
  targetRPE: number;
  classification: ExerciseClassification;
};
