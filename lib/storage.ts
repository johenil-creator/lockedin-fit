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
} from "./types";

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
} as const;

// ── Generic helpers ───────────────────────────────────────────────────────────

async function load<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
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

export async function loadCustomCatalog(): Promise<any[]> {
  return (await load<any[]>(KEYS.customCatalog)) ?? [];
}

export async function saveCustomCatalog(data: any[]): Promise<void> {
  await save(KEYS.customCatalog, data);
}

// ── Clear All ─────────────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
