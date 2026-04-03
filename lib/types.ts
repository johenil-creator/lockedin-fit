// All shared types for LockedIn Fit

export type SetEntry = {
  reps: string;
  weight: string;
  completed: boolean;
  isWarmUp?: boolean;
};

// ── Exercise Feedback ───────────────────────────────────────────────────────

export type FeelingTag = 'great' | 'good' | 'okay' | 'tough' | 'brutal';

export type ExerciseFeedback = {
  rpe: number;          // 1-10, user-reported rate of perceived exertion
  feeling: FeelingTag;  // how they felt overall
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
  equipment?: string;  // catalog equipment type (barbell, bodyweight, etc.)
  feedback?: ExerciseFeedback;  // user-reported post-exercise feedback
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
  // ── Pause state (persists across navigation) ─────────────────────────────
  pausedAt?: string;              // ISO timestamp when paused
  totalPausedMs?: number;         // accumulated paused milliseconds
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
  notificationsEnabled?: boolean; // push notification toggle (default false)
  reminderHour?: number;       // workout reminder hour (8, 12, 18, or 21; default 18)
  cardioPRs?: CardioPRs;
  badges?: Badge[];
  friendCode?: string;
  friends?: Friend[];
};

// ── Friends ─────────────────────────────────────────────────────────────────

export type Friend = {
  code: string;
  addedAt: string;
  nickname?: string;
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
  | 'Apex'
  | 'Apex_Bronze'
  | 'Apex_Silver'
  | 'Apex_Gold';

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
  todayXP?: number;       // XP earned today
  todayDate?: string;     // ISO date string (YYYY-MM-DD) for resetting daily count
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
  | 'focused'
  | 'concerned'
  | 'proud'
  | 'analytical'
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
  | 'high_performance'
  | 'home_idle'
  | 'fuel_plan_ready'
  | 'fuel_weekly_refresh';

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

// ── Social & Customization ──────────────────────────────────────────────────

export type ReactionType = 'howl' | 'fire' | 'flex' | 'crown';

export type ActivityType =
  | 'workout_complete'
  | 'rank_up'
  | 'pr_hit'
  | 'streak_milestone'
  | 'pack_joined'
  | 'user_post'
  | 'milestone';

/** Layer-swap avatar customization — each field is a variant key from the manifest. */
export type LockeCustomization = {
  /** Body fur color variant: 'brown' | 'black' | 'arctic_white' | 'merle' | null (shows master base) */
  bodyFur: string | null;
  /** Head fur color variant (same options as body) */
  headFur: string | null;
  /** Eye variant: 'green' | 'blue' | 'red' | 'purple' | null */
  eyes: string | null;
  /** Eyebrow expression: 'neutral' | 'happy' | 'angry' | null */
  brows: string | null;
  /** Nose + mouth expression: 'neutral' | 'smile' | 'smirk' | null */
  noseMouth: string | null;
  /** Head accessory: 'flower_crown' | null */
  headAccessory: string | null;
  /** Neck accessory: 'collar_diamond' | 'collar_round' | 'collar_spikes' | null */
  neckAccessory: string | null;
  /** Ear accessory: 'earring_left' | 'earring_right' | null */
  earAccessory: string | null;
  /** Aura effect: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'outline' | null */
  aura: string | null;
};

// ── Avatar Expansion ────────────────────────────────────────────────────────

export type ElementalEffect = 'fire' | 'frost' | 'lightning' | 'shadow' | 'nature';
export type ArmorTier = 'none' | 'light' | 'medium' | 'heavy' | 'legendary' | 'mythic';
export type EmoteId = 'howl' | 'flex' | 'meditate' | 'sprint' | 'celebrate' | 'challenge';

export type AuraCosmeticItem = {
  id: string;
  effect: ElementalEffect;
  name: string;
  price: number;
  earnMethod?: string;
};

export type ArmorUnlock = {
  tier: ArmorTier;
  requiredRank: RankLevel;
  name: string;
  description: string;
};

export type EmoteItem = {
  id: EmoteId;
  name: string;
  price: number;
  animationAsset: string;
};

export type MilestoneType =
  | 'workout_100'
  | 'workout_250'
  | 'workout_500'
  | 'rank_sentinel'
  | 'rank_alpha'
  | 'rank_apex'
  | 'streak_30'
  | 'streak_100'
  | 'streak_365'
  | 'pr_count_10'
  | 'pr_count_50';

export type MilestoneEvent = {
  id: string;
  userId: string;
  displayName: string;
  milestoneType: MilestoneType;
  value: number;
  createdAt: string;
};

// ── Community Depth ─────────────────────────────────────────────────────────

export type Comment = {
  id: string;
  activityId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
};

export type StreakBattleStatus = 'active' | 'completed';

export type StreakBattle = {
  id: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  player1StreakStart: number;
  player2StreakStart: number;
  player1Broke: boolean;
  player2Broke: boolean;
  winnerId: string | null;
  status: StreakBattleStatus;
  fangsReward: number;
  createdAt: string;
};

export type AccountabilityPartner = {
  partnerId: string;
  partnerName: string;
  pairedAt: string;
  mutualStreakDays: number;
};

export type CheckInNudge = {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  message: string;
  createdAt: string;
  read: boolean;
};

// ── Pack Expansion ──────────────────────────────────────────────────────────

export type PackWarStatus = 'matchmaking' | 'active' | 'completed';

export type PackWar = {
  id: string;
  pack1Id: string;
  pack1Name: string;
  pack1Xp: number;
  pack2Id: string;
  pack2Name: string;
  pack2Xp: number;
  weekKey: string;
  status: PackWarStatus;
  winnerId: string | null;
  fangsReward: number;
  createdAt: string;
};

export type PackBossStatus = 'active' | 'defeated' | 'escaped';

export type PackBoss = {
  id: string;
  packId: string;
  bossName: string;
  bossEmoji: string;
  healthTotal: number;
  healthRemaining: number;
  metric: PackChallengeType;
  weekKey: string;
  status: PackBossStatus;
  rewards: number;
  createdAt: string;
};

export type PackBossContribution = {
  userId: string;
  displayName: string;
  damage: number;
};

export type PackLevel = {
  level: number;
  totalXp: number;
  memberCap: number;
  unlockedPerks: string[];
};

export type PackAchievementId =
  | 'first_challenge'
  | 'collective_100_workouts'
  | 'collective_500_workouts'
  | 'all_active_week'
  | 'boss_defeated'
  | '5_bosses_defeated'
  | 'war_won'
  | '5_wars_won'
  | '10_member_pack'
  | 'pack_level_5'
  | 'pack_level_10';

export type PackAchievement = {
  id: PackAchievementId;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
};

// ── Events & Insights ───────────────────────────────────────────────────────

export type SeasonalEventStatus = 'upcoming' | 'active' | 'ended';

export type SeasonalEvent = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  metric: PackChallengeType;
  rewards: number[];
  fangsMultiplier?: number;
};

export type EventLeaderboardEntry = {
  userId: string;
  displayName: string;
  rank: number;
  score: number;
  lockeCustomization?: LockeCustomization;
};

export type EventParticipation = {
  eventId: string;
  userId: string;
  score: number;
  joinedAt: string;
  rewardsClaimed: boolean;
};

export type WeekInReview = {
  weekKey: string;
  workoutsCompleted: number;
  totalSets: number;
  totalXpEarned: number;
  prsHit: number;
  streakDays: number;
  avgSessionDurationMin: number;
  topExercise: string;
  socialStats: { reactionsGiven: number; reactionsReceived: number; commentsPosted: number };
  recommendations: string[];
  comparedToLastWeek: { workouts: number; sets: number; xp: number };
};

export type InsightTip = {
  id: string;
  text: string;
  category: string;
};

export type CosmeticCategory = 'body_fur' | 'head_fur' | 'eyes' | 'brows' | 'nose_mouth' | 'head_accessory' | 'neck_accessory' | 'ear_accessory' | 'aura';

export type CosmeticUnlockType = 'free' | 'purchase' | 'achievement' | 'seasonal' | 'event' | 'milestone';

export type CosmeticItem = {
  id: string;
  category: CosmeticCategory;
  name: string;
  price: number;
  preview: string; // color hex or icon name
  rarity?: CosmeticRarity;
  unlockType?: CosmeticUnlockType;
  assetPath?: string; // overlay PNG path for cosmetic items
};

export type FangsRecord = {
  balance: number;
  lastUpdated: string;
};

export type AdWatchState = {
  date: string;        // "YYYY-MM-DD" — resets when day changes
  watchCount: number;  // 0..MAX_DAILY_AD_WATCHES
  lastWatchedAt: string; // ISO timestamp
};

export type PackRole = 'leader' | 'member';

export type PackInfo = {
  id: string;
  name: string;
  code: string;
  motto: string;
  memberCount: number;
  weeklyXp: number;
  weekKey: string;
  role: PackRole;
  createdBy: string;
  isPublic?: boolean;
};

export type PackMember = {
  userId: string;
  displayName: string;
  rank: RankLevel;
  role: PackRole;
  weeklyXp: number;
  lockeCustomization?: LockeCustomization;
};

export type ActivityEvent = {
  id: string;
  userId: string;
  displayName: string;
  type: ActivityType;
  payload: Record<string, any>;
  createdAt: string;
  weekKey: string;
};

export type Reaction = {
  fromUserId: string;
  toUserId: string;
  activityId: string;
  reactionType: ReactionType;
  createdAt: string;
};

export type FriendProfile = {
  userId: string;
  displayName: string;
  rank: RankLevel;
  lastActiveAt: string;
  lastWorkoutSummary?: {
    sessionName: string;
    setsCompleted: number;
    xpEarned: number;
    completedAt: string;
  };
  lockeCustomization?: LockeCustomization;
};

// ── Pack Challenges & Competitions ───────────────────────────────────────────

export type PackChallengeType = 'sets' | 'sessions' | 'xp' | 'streak';
export type PackChallengeStatus = 'active' | 'completed' | 'failed';

export type PackChallenge = {
  id: string;
  packId: string;
  type: PackChallengeType;
  target: number;
  current: number;
  weekKey: string;
  status: PackChallengeStatus;
  createdBy: string;
  createdAt: string;
};

export type PackLeaderboardEntry = {
  packId: string;
  packName: string;
  memberCount: number;
  weeklyXp: number;
  weekKey: string;
};

export type FriendChallengeMetric = 'xp' | 'sets' | 'sessions';
export type FriendChallengeStatus = 'pending' | 'active' | 'completed' | 'declined';

export type FriendChallenge = {
  id: string;
  challengerId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  metric: FriendChallengeMetric;
  weekKey: string;
  status: FriendChallengeStatus;
  challengerScore: number;
  opponentScore: number;
  winnerId: string | null;
  createdAt: string;
};

export type PackMessage = {
  id: string;
  packId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
};

// ── Quests & Enhanced Progression ───────────────────────────────────────────

export type QuestType = 'daily' | 'weekly';
export type QuestMetric = 'sets' | 'sessions' | 'xp' | 'exercises' | 'streak_maintain' | 'pr_attempt' | 'cardio_minutes';

export type Quest = {
  id: string;
  title: string;
  description: string;
  metric: QuestMetric;
  target: number;
  reward: number; // Fangs
  type: QuestType;
};

export type QuestProgress = {
  questId: string;
  current: number;
  completed: boolean;
  claimedAt: string | null;
};

export type DailyQuestState = {
  date: string;
  quests: QuestProgress[];
  refreshedAt: string;
};

export type WeeklyObjective = {
  weekKey: string;
  quest: Quest;
  progress: QuestProgress;
};

export type CosmeticRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'prestige';

export type SeasonalCosmeticItem = CosmeticItem & {
  rarity: CosmeticRarity;
  availableFrom: string;
  availableUntil: string;
  requiredRank?: RankLevel;
};

export type CosmeticGiftStatus = 'pending' | 'claimed';

export type CosmeticGift = {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  itemId: string;
  message: string;
  status: CosmeticGiftStatus;
  createdAt: string;
};

// ── Community & Discovery ───────────────────────────────────────────────────

export type GlobalLeaderboardEntry = {
  userId: string;
  displayName: string;
  rank: RankLevel;
  weeklyXp: number;
  allTimeXp: number;
  lockeCustomization?: LockeCustomization;
};

export type PublicProfile = {
  userId: string;
  displayName: string;
  rank: RankLevel;
  totalXp: number;
  totalWorkouts: number;
  streakDays: number;
  badges: Badge[];
  lockeCustomization?: LockeCustomization;
  packName?: string;
  isFriend: boolean;
};

export type PublicPack = {
  id: string;
  name: string;
  motto: string;
  memberCount: number;
  weeklyXp: number;
  isPublic: boolean;
  tags: string[];
};

export type NotificationType =
  | 'friend_workout'
  | 'challenge_received'
  | 'challenge_update'
  | 'gift_received'
  | 'pack_challenge_complete'
  | 'quest_expiring'
  | 'nudge_received'
  | 'streak_battle_lost'
  | 'milestone_friend'
  | 'comment_received';

export type InAppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
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
    /**
     * Optional health signal from Apple Health (resting HR, HRV, sleep, activity).
     * Present only when health data is available with confidence ≥ 0.3.
     * Weight: 14% (reallocated from other components when active).
     */
    healthSignal?: number;
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
