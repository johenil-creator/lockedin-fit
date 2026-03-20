import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  WorkoutSession,
  PlanData,
  UserProfile,
  XPRecord,
  PerformanceWeek,
  StreakData,
  OrmTestSession,
  PlanProgress,
  TrainingLoadRecord,
  MuscleFatigueMap,
  DailySnapshot,
  CachedFatigueState,
  RecoveryBundle,
  FangsRecord,
  LockeCustomization,
  PackInfo,
} from "./types";
import type { ExerciseCatalogEntry } from "../src/lib/exerciseMatch";

// ── Keys ──────────────────────────────────────────────────────────────────────

const KEYS = {
  workouts: "@lockedinfit/workouts",
  plan: "@lockedinfit/plan",
  planProgress: "@lockedinfit/plan-progress",
  profile: "@lockedinfit/profile",
  xp: "@lockedinfit/xp",
  performance: "@lockedinfit/performance",
  streak: "@lockedinfit/streak",
  ormTest: "@lockedinfit/orm-test",
  customCatalog: "@lockedinfit/custom-catalog",
  trainingLoad: "@lockedinfit/training-load",
  muscleFatigue: "@lockedinfit/muscle-fatigue",
  dailySnapshots: "@lockedinfit/daily-snapshots",
  // fatigueState stores CachedFatigueState (timestamp-aware, for decay-at-read-time).
  // Distinct from muscleFatigue (raw MuscleFatigueMap) — use fatigueState for the
  // recovery dashboard so decay can be applied with exact elapsed hours on every read.
  fatigueState: "@lockedinfit/fatigue-state",
  fangs: "@lockedinfit/fangs",
  lockeCustomization: "@lockedinfit/locke-customization",
  packInfo: "@lockedinfit/pack-info",
  ownedCosmetics: "@lockedinfit/owned-cosmetics",
  packChallenge: "@lockedinfit/pack-challenge",
  friendChallenges: "@lockedinfit/friend-challenges",
  questState: "@lockedinfit/quest-state",
  weeklyObjective: "@lockedinfit/weekly-objective",
  pendingGifts: "@lockedinfit/pending-gifts",
  globalLeaderboardCache: "@lockedinfit/global-leaderboard-cache",
  notificationsCache: "@lockedinfit/notifications-cache",
  publicProfileCache: "@lockedinfit/public-profile-cache",
  planDraft: "@lockedinfit/plan-draft",
  planDrafts: "@lockedinfit/plan-drafts",
} as const;

// ── Generic helpers ───────────────────────────────────────────────────────────

async function load<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    if (__DEV__) console.warn("[storage] caught:", e);
    return null;
  }
}

async function save<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ── Workouts ──────────────────────────────────────────────────────────────────

export async function loadWorkouts(): Promise<WorkoutSession[]> {
  return (await load<WorkoutSession[]>(KEYS.workouts)) ?? [];
}

export async function saveWorkouts(data: WorkoutSession[]): Promise<void> {
  await save(KEYS.workouts, data);
}

// ── Plan ──────────────────────────────────────────────────────────────────────

export async function loadPlan(): Promise<PlanData | null> {
  return load<PlanData>(KEYS.plan);
}

export async function savePlan(data: PlanData): Promise<void> {
  await save(KEYS.plan, data);
}

export async function loadPlanDraft(): Promise<any | null> {
  return load<any>(KEYS.planDraft);
}

export async function savePlanDraft(data: any): Promise<void> {
  await save(KEYS.planDraft, data);
}

export async function clearPlanDraft(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.planDraft);
}

// ── Saved Plan Drafts (multiple) ─────────────────────────────────────────────

export type SavedPlanDraft = {
  id: string;
  name: string;
  goal: string;
  daysPerWeek: number;
  numWeeks: number;
  totalExercises: number;
  updatedAt: string;
  draft: any;
};

export async function loadSavedDrafts(): Promise<SavedPlanDraft[]> {
  return (await load<SavedPlanDraft[]>(KEYS.planDrafts)) ?? [];
}

export async function saveSavedDraft(entry: SavedPlanDraft): Promise<void> {
  const existing = await loadSavedDrafts();
  const filtered = existing.filter((d) => d.id !== entry.id);
  const updated = [entry, ...filtered].slice(0, 20);
  await save(KEYS.planDrafts, updated);
}

export async function deleteSavedDraft(id: string): Promise<void> {
  const existing = await loadSavedDrafts();
  await save(KEYS.planDrafts, existing.filter((d) => d.id !== id));
}

export async function loadSavedDraftById(id: string): Promise<SavedPlanDraft | null> {
  const all = await loadSavedDrafts();
  return all.find((d) => d.id === id) ?? null;
}

export async function clearPlan(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.plan);
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function loadProfile(): Promise<UserProfile | null> {
  return load<UserProfile>(KEYS.profile);
}

export async function saveProfile(data: UserProfile): Promise<void> {
  await save(KEYS.profile, data);
}

// ── XP ────────────────────────────────────────────────────────────────────────

export async function loadXP(): Promise<XPRecord | null> {
  return load<XPRecord>(KEYS.xp);
}

export async function saveXP(data: XPRecord): Promise<void> {
  await save(KEYS.xp, data);
}

// ── Performance ───────────────────────────────────────────────────────────────

export async function loadPerformance(): Promise<PerformanceWeek[] | null> {
  return load<PerformanceWeek[]>(KEYS.performance);
}

export async function savePerformance(data: PerformanceWeek[]): Promise<void> {
  await save(KEYS.performance, data);
}

// ── Streak ────────────────────────────────────────────────────────────────────

export async function loadStreak(): Promise<StreakData | null> {
  return load<StreakData>(KEYS.streak);
}

export async function saveStreak(data: StreakData): Promise<void> {
  await save(KEYS.streak, data);
}

// ── Plan Progress ─────────────────────────────────────────────────────────────

export async function loadPlanProgress(): Promise<PlanProgress> {
  return (await load<PlanProgress>(KEYS.planProgress)) ?? { completedDays: {} };
}

export async function savePlanProgress(data: PlanProgress): Promise<void> {
  await save(KEYS.planProgress, data);
}

// ── ORM Test ──────────────────────────────────────────────────────────────────

export async function loadOrmTest(): Promise<OrmTestSession | null> {
  return load<OrmTestSession>(KEYS.ormTest);
}

export async function saveOrmTest(data: OrmTestSession): Promise<void> {
  await save(KEYS.ormTest, data);
}

export async function clearOrmTest(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.ormTest);
}

// ── Custom Catalog ───────────────────────────────────────────────────────────

export async function loadCustomCatalog(): Promise<ExerciseCatalogEntry[]> {
  return (await load<ExerciseCatalogEntry[]>(KEYS.customCatalog)) ?? [];
}

export async function saveCustomCatalog(data: ExerciseCatalogEntry[]): Promise<void> {
  await save(KEYS.customCatalog, data);
}

// ── Training Load (ACWR / Adaptation Model) ───────────────────────────────────

export async function loadTrainingLoad(): Promise<TrainingLoadRecord | null> {
  return load<TrainingLoadRecord>(KEYS.trainingLoad);
}

export async function saveTrainingLoad(data: TrainingLoadRecord): Promise<void> {
  await save(KEYS.trainingLoad, data);
}

// ── Muscle Fatigue Map ────────────────────────────────────────────────────────

export async function loadMuscleFatigue(): Promise<MuscleFatigueMap | null> {
  return load<MuscleFatigueMap>(KEYS.muscleFatigue);
}

export async function saveMuscleFatigue(data: MuscleFatigueMap): Promise<void> {
  await save(KEYS.muscleFatigue, data);
}

// ── Daily Snapshots ───────────────────────────────────────────────────────────

/** Load all daily fatigue snapshots (most recent first). */
export async function loadDailySnapshots(): Promise<DailySnapshot[]> {
  return (await load<DailySnapshot[]>(KEYS.dailySnapshots)) ?? [];
}

export async function saveDailySnapshots(data: DailySnapshot[]): Promise<void> {
  await save(KEYS.dailySnapshots, data);
}

/**
 * Append or replace today's snapshot, keeping at most the last 30 days.
 * Snapshots are stored newest-first. If a snapshot for `snapshot.date`
 * already exists it is replaced rather than duplicated.
 */
export async function saveDailySnapshot(snapshot: DailySnapshot): Promise<void> {
  const MAX_DAYS = 30;
  const existing = await loadDailySnapshots();
  const updated = [snapshot, ...existing.filter((s) => s.date !== snapshot.date)]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_DAYS);
  await save(KEYS.dailySnapshots, updated);
}

/**
 * Return the most-recent `days` snapshots (newest-first).
 * Capped at whatever is available — never throws on empty storage.
 */
export async function getDailySnapshots(days: number): Promise<DailySnapshot[]> {
  const all = await loadDailySnapshots();
  return all.slice(0, days);
}

// ── Cached Fatigue State ──────────────────────────────────────────────────────

export async function loadCachedFatigueState(): Promise<CachedFatigueState | null> {
  return load<CachedFatigueState>(KEYS.fatigueState);
}

export async function saveCachedFatigueState(data: CachedFatigueState): Promise<void> {
  await save(KEYS.fatigueState, data);
}

// ── Recovery Bundle (single multiGet round-trip) ──────────────────────────────

/**
 * Load fatigueState + dailySnapshots in ONE AsyncStorage.multiGet call.
 * Use this on the Recovery Dashboard to avoid sequential awaits at mount.
 */
export async function loadRecoveryBundle(): Promise<RecoveryBundle> {
  const pairs = await AsyncStorage.multiGet([KEYS.fatigueState, KEYS.dailySnapshots]);
  const fatigueState: CachedFatigueState | null = pairs[0][1]
    ? JSON.parse(pairs[0][1])
    : null;
  const dailySnapshots: DailySnapshot[] = pairs[1][1]
    ? JSON.parse(pairs[1][1])
    : [];
  return { fatigueState, dailySnapshots };
}

// ── Fangs ────────────────────────────────────────────────────────────────────

export async function loadFangs(): Promise<FangsRecord> {
  return (await load<FangsRecord>(KEYS.fangs)) ?? { balance: 0, lastUpdated: "" };
}

export async function saveFangs(data: FangsRecord): Promise<void> {
  await save(KEYS.fangs, data);
}

// ── Locke Customization ──────────────────────────────────────────────────────

export const DEFAULT_CUSTOMIZATION: LockeCustomization = {
  bodyFur: null,
  headFur: null,
  eyes: null,
  brows: null,
  noseMouth: null,
  headAccessory: null,
  neckAccessory: null,
  earAccessory: null,
  aura: null,
};

let _customizationCache: LockeCustomization | null = null;
let _hasCustomization = false;

export async function loadLockeCustomization(): Promise<LockeCustomization> {
  if (_customizationCache) return _customizationCache;
  const raw = await load<LockeCustomization>(KEYS.lockeCustomization);
  _hasCustomization = raw !== null;
  const data = raw ?? DEFAULT_CUSTOMIZATION;
  _customizationCache = data;
  return data;
}

export function getLockeCustomizationSync(): LockeCustomization {
  return _customizationCache ?? DEFAULT_CUSTOMIZATION;
}

export function hasLockeCustomization(): boolean {
  return _hasCustomization;
}

export async function saveLockeCustomization(data: LockeCustomization): Promise<void> {
  _customizationCache = data;
  _hasCustomization = true;
  await save(KEYS.lockeCustomization, data);
}

// ── Owned Cosmetics ──────────────────────────────────────────────────────────

export async function loadOwnedCosmetics(): Promise<string[]> {
  return (await load<string[]>(KEYS.ownedCosmetics)) ?? [];
}

export async function saveOwnedCosmetics(items: string[]): Promise<void> {
  await save(KEYS.ownedCosmetics, items);
}

// ── Pack Info (local cache) ──────────────────────────────────────────────────

export async function loadPackInfo(): Promise<PackInfo | null> {
  return load<PackInfo>(KEYS.packInfo);
}

export async function savePackInfo(data: PackInfo): Promise<void> {
  await save(KEYS.packInfo, data);
}

export async function clearPackInfo(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.packInfo);
}

// ── Clear All ─────────────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
