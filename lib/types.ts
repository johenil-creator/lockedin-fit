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

// ── Adaptive Training — Recovery & Fatigue System ────────────────────────────

/** Anatomical muscle groups tracked by the fatigue model. */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'forearms'
  | 'traps'
  | 'lats'
  | 'rear_delts'
  | 'front_delts'
  | 'side_delts';

/**
 * Fatigue level per muscle group, expressed as 0–100.
 * 0 = fully fresh, 100 = maximally fatigued / overtrained.
 */
export type MuscleFatigueMap = Record<MuscleGroup, number>;

/** Qualitative recovery status derived from the fatigue score. */
export type RecoveryStatus = 'Fresh' | 'Warming Up' | 'Fatigued' | 'Overtrained';

/** Full recovery estimate returned for a single muscle group. */
export type RecoveryEstimate = {
  /** Hours until the muscle is considered sufficiently recovered (fatigue < threshold). */
  estimatedHoursToRecover: number;
  status: RecoveryStatus;
  /** Short actionable recommendation shown to the user. */
  recommendation: string;
  /** Raw fatigue score 0–100 used to derive the status. */
  fatigueLevel: number;
};

// ── Readiness Score ───────────────────────────────────────────────────────────

/** Coarse label for the user's overall training readiness today. */
export type ReadinessLabel = 'Prime' | 'Ready' | 'Manage Load' | 'Recover';

/**
 * Composite readiness score derived from five weighted components.
 *
 * Weights:
 *   muscleFreshness  40% — size-weighted inverse of current fatigue
 *   blockContext     20% — how appropriate fatigue levels are for the current block
 *   streakModifier   15% — penalty for long training streaks without a rest day
 *   forecastScore    15% — inverse forecast risk for tomorrow's session
 *   acwrScore        10% — ACWR proximity to the sweet-spot band 0.8–1.3
 *
 * All component values are 0–100 before weighting.
 */
export type ReadinessScore = {
  /** Composite weighted score 0–100. */
  score: number;
  label: ReadinessLabel;
  /** Per-component raw scores (0–100 each) for the dashboard breakdown card. */
  components: {
    /**
     * Inverse of the size-weighted average muscle fatigue.
     * Large muscles (quads, chest, lats) are weighted more heavily.
     * 100 = all muscles fully fresh, 0 = all muscles maximally fatigued.
     * Weight: 40%.
     */
    muscleFreshness: number;
    /**
     * How appropriate the current fatigue level is for the active block.
     * Accumulation tolerates more fatigue (higher score even when tired);
     * realization demands freshness (penalised if muscles are fatigued).
     * Weight: 20%.
     */
    blockContext: number;
    /**
     * Penalty for long training streaks without a rest day.
     * Starts at 100; decreases once streak exceeds 3 consecutive days.
     * Weight: 15%.
     */
    streakModifier: number;
    /**
     * Inverse of forecast risk: 100 = tomorrow's session won't hit fatigued
     * muscles; 0 = tomorrow targets maximally fatigued muscle groups.
     * Weight: 15%.
     */
    forecastScore: number;
    /**
     * ACWR proximity to the sweet-spot band 0.8–1.3.
     * 100 = squarely in range; 0 = dangerously under or overreaching.
     * Weight: 10%.
     */
    acwrScore: number;
  };
};

// ── Periodisation — Block & Week Structure ────────────────────────────────────

/** Macro-cycle block type following classic periodisation. */
export type BlockType = 'accumulation' | 'intensification' | 'realization';

/** Where the current week sits within its training block. */
export type BlockWeekPosition = 'intro' | 'build' | 'peak' | 'pivot_deload';

// ── Acute:Chronic Workload Ratio & Adaptation Model ──────────────────────────

/**
 * Rolling workload snapshot used for ACWR calculation.
 * Acute load = 7-day rolling sum; chronic load = 28-day rolling average.
 */
export type TrainingLoadRecord = {
  /** How many weeks the user has been training (approximated from session history). */
  trainingAgeWeeks: number;
  /** Sum of session loads over the past 7 days (arbitrary load units). */
  acuteLoad: number;
  /** Average weekly load over the past 28 days. */
  chronicLoad: number;
  /**
   * Acute:Chronic Workload Ratio = acuteLoad / chronicLoad.
   * Sweet spot is typically 0.8–1.3; >1.5 indicates injury risk.
   */
  acwr: number;
  /**
   * 0–100 score representing long-term adaptation trend.
   * Rising chronic load + improving performance → high score.
   */
  adaptationScore: number;
};

// ── Plateau Detection ─────────────────────────────────────────────────────────

/** Root cause classification for a detected strength plateau. */
export type PlateauClassification =
  | 'under_recovered'   // fatigue is suppressing performance
  | 'under_stimulated'  // insufficient progressive overload
  | 'inconsistent';     // irregular attendance is preventing adaptation

/** Full plateau insight surfaced to the user or coach system. */
export type PlateauInsight = {
  classification: PlateauClassification;
  /** Calendar days since the last measurable performance improvement. */
  daysSinceImprovement: number;
  /** Session adherence over the detection window, expressed as 0–100. */
  adherencePercent: number;
  /** Specific corrective action recommended for this plateau type. */
  recommendation: string;
};

// ── Smart Deload Trigger ──────────────────────────────────────────────────────

/** Decision output from the deload trigger engine. */
export type DeloadTrigger = {
  /** Whether a deload is recommended this week. */
  triggered: boolean;
  /** Human-readable reasons that contributed to the deload recommendation. */
  reasons: string[];
  /** Suggested volume reduction as a fraction (e.g. 0.4 = drop 40 % of sets). */
  volumeReduction: number;
  /** Suggested intensity reduction as a fraction (e.g. 0.1 = reduce load by 10 %). */
  intensityReduction: number;
};

// ── Volume Adjustment Recommendations ────────────────────────────────────────

/** Per-muscle-group volume adjustment output from the adaptation model. */
export type VolumeAdjustment = {
  muscleGroup: MuscleGroup;
  /** Current weekly working sets for this muscle group. */
  currentSets: number;
  /** Model-recommended weekly working sets. */
  recommendedSets: number;
  /**
   * Signed percentage change: positive = increase, negative = reduce.
   * e.g. -20 means "drop volume by 20 %".
   */
  changePercent: number;
  /** Short explanation of why this adjustment is suggested. */
  reason: string;
};

// ── Daily Fatigue Snapshot ────────────────────────────────────────────────────

/** Lightweight daily summary written to storage after each session. */
export type DailySnapshot = {
  /** ISO date string "YYYY-MM-DD". */
  date: string;
  /** Weighted average fatigue across all tracked muscle groups (0–100). */
  overallFatigue: number;
  /** Up to 3 most fatigued muscle groups for quick display (names only). */
  topMuscles: MuscleGroup[];
  /**
   * Per-muscle fatigue values for the top 3 muscles on this day.
   * Used by RecoveryTrendGraph to plot individual muscle lines.
   * Ordered descending by fatigue.
   */
  topMusclesFatigue: Array<{ muscle: MuscleGroup; fatigue: number }>;
  readinessScore: ReadinessScore;
};

// ── Fatigue Forecast ──────────────────────────────────────────────────────────

/** Warning surfaced when projected fatigue will exceed a safe threshold. */
export type ForecastWarning = {
  muscle: MuscleGroup;
  /** Current fatigue score (0–100). */
  currentFatigue: number;
  /** Estimated fatigue after the next planned session targeting this muscle. */
  projectedFatigue: number;
  /** Suggested action to stay within safe training ranges. */
  recommendation: string;
};

// ── Coach Output (Locke Integration) ─────────────────────────────────────────

/**
 * Mood states the coach can be in when generating adaptive messages.
 * Maps onto LockeState but is typed separately to keep systems decoupled.
 */
export type CoachMood =
  | 'encouraging'
  | 'focused'
  | 'celebrating'
  | 'savage'
  | 'concerned'
  | 'rest_day';

/**
 * Structured output from the coach message generator.
 * Character limits are enforced to keep UI layout consistent.
 */
export type CoachOutput = {
  mood: CoachMood;
  /** Primary headline — max 42 characters. */
  headline: string;
  /** Supporting context — max 90 characters. */
  subtext: string;
  /** Optional 2–3 bullet tips shown in an expanded card. */
  tips?: string[];
};

// ── Recovery Cache & Persistence ─────────────────────────────────────────────

/**
 * Persisted pre-computed fatigue state.
 *
 * The raw fatigue map is stored before decay so that exact elapsed time
 * can be applied at read-time. This avoids recomputing from full session
 * history on every cold start — O(1) reads instead of O(sessions × exercises).
 *
 * Performance note: always use loadRecoveryBundle() to read this alongside
 * dailySnapshots in a single AsyncStorage.multiGet round-trip.
 */
export type CachedFatigueState = {
  /** ISO timestamp when rawFatigueMap was last computed and written. */
  computedAt: string;
  /**
   * Un-decayed fatigue map at time of computation.
   * Caller must apply: decayFatigue(rawFatigueMap, elapsedHours, halfLifeHours)
   * to get the current live fatigue levels.
   */
  rawFatigueMap: MuscleFatigueMap;
  /** Half-life used for this stored state (hours). Default 36. */
  halfLifeHours: number;
  /** ID of the last session that contributed to this fatigue state. */
  lastSessionId: string;
};

/**
 * Batch container returned by loadRecoveryBundle().
 * All recovery fields are loaded in a single AsyncStorage.multiGet call.
 */
export type RecoveryBundle = {
  fatigueState: CachedFatigueState | null;
  dailySnapshots: DailySnapshot[];
};
