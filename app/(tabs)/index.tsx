import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  DevSettings,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { fmtDate, wasCompletedToday } from "../../lib/helpers";
import { useWorkouts } from "../../hooks/useWorkouts";
import { useProfileContext } from "../../contexts/ProfileContext";
import type { Exercise, LockeTrigger } from "../../lib/types";
import { useXP } from "../../hooks/useXP";
import { useStreak } from "../../hooks/useStreak";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { RankBadge } from "../../components/RankBadge";
import { XPBar } from "../../components/XPBar";
import { LockeBanner } from "../../components/Locke";
import { LockeMascot } from "../../components/Locke/LockeMascot";
import type { LockeMascotMood } from "../../components/Locke/LockeMascot";
import { useLocke } from "../../contexts/LockeContext";
import { useAppTheme } from "../../contexts/ThemeContext";
import Logo from "../../components/Logo";
import { ProfileButton } from "../../components/ProfileButton";
import { usePlanContext } from "../../contexts/PlanContext";
import { clearAllData } from "../../lib/storage";
import { pickMessage, pickMessageWithMood } from "../../lib/lockeMessages";

// ── Local sub-components ──────────────────────────────────────────────────────

/** Sticky header: Logo left, dev tools right. */
type HeaderSectionProps = {
  topInset: number;
  onCycleSpeech?: () => void;
  onReset?: () => void;
};

function HeaderSection({ topInset, onCycleSpeech, onReset }: HeaderSectionProps) {
  const { theme } = useAppTheme();
  const [devOpen, setDevOpen] = useState(false);
  return (
    <View
      style={[
        styles.stickyHeader,
        { backgroundColor: theme.colors.bg, paddingTop: topInset + 12 },
      ]}
    >
      <Logo />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {__DEV__ && onCycleSpeech && onReset && (
          <View style={{ alignItems: "flex-end" }}>
            <Pressable onPress={() => setDevOpen((v) => !v)}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.muted, opacity: 0.6 }}>
                {devOpen ? "DEV ▲" : "DEV ▼"}
              </Text>
            </Pressable>
            {devOpen && (
              <View style={{ position: "absolute", top: 20, right: 0, backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 10, gap: 10, zIndex: 99, minWidth: 130 }}>
                <Pressable onPress={onCycleSpeech}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: theme.colors.primary }} numberOfLines={1}>
                    Cycle Speech
                  </Text>
                </Pressable>
                <Pressable onPress={() => Alert.alert("Reset Data", "Wipe all data and start fresh?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Reset", style: "destructive", onPress: onReset },
                ])}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: theme.colors.danger }} numberOfLines={1}>
                    Reset All Data
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        <ProfileButton />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/** "Hey, {name}" greeting + compact Rank/XP/Streak row. */
type RankXPRowProps = {
  name: string;
  rank: ReturnType<typeof useXP>["rank"];
  xp: ReturnType<typeof useXP>["xp"];
  progress: number;
  toNext: number;
  nextTier: ReturnType<typeof useXP>["nextTier"];
  streak: ReturnType<typeof useStreak>["streak"];
};

function RankXPRow({
  name,
  rank,
  xp,
  progress,
  toNext,
  nextTier,
  streak,
}: RankXPRowProps) {
  const { theme } = useAppTheme();

  const streakLabel = streak.current > 0 ? `${streak.current}d` : "—";

  // Spec: primary if >= 7, primary @0.7 if >= 3, muted otherwise
  const streakColor =
    streak.current >= 7
      ? theme.colors.primary
      : streak.current >= 3
      ? theme.colors.primary + "B3"   // ~0.7 opacity hex
      : theme.colors.muted;

  return (
    <View style={styles.greetingBlock}>
      <Text style={[styles.greeting, { color: theme.colors.text }]}>
        Hey, {name || "there"}
      </Text>
      <View style={[styles.rankXPRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <RankBadge rank={rank} />
        <View style={styles.xpBarWrap}>
          <XPBar
            totalXP={xp.total}
            progress={progress}
            toNext={toNext}
            nextRank={nextTier?.rank ?? null}
          />
        </View>
        <View style={styles.streakChip}>
          <Ionicons name="flash" size={12} color={streakColor} />
          <Text style={[styles.streakChipLabel, { color: streakColor }]}>
            {streakLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/** Locke panel: 120px mascot left + dynamic microcopy right. Only shown when has1RM. */
type LockePanelProps = {
  mood: LockeMascotMood;
  microcopy: string;
};

function LockePanel({ mood, microcopy }: LockePanelProps) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        styles.lockePanel,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <LockeMascot size={120} mood={mood} />
      <Text style={[styles.lockeMicrocopy, { color: theme.colors.text }]}>
        {microcopy}
      </Text>
    </View>
  );
}


// ─────────────────────────────────────────────────────────────────────────────

/** Primary CTA card when a plan is loaded. */
type TodayWorkoutCardProps = {
  planName: string;
  week: string;
  day: string;
  exerciseCount: number;
  completedDayCount: number;
  totalDayCount: number;
  /** null = has next day | true = active session | false = today done (calendar lock) */
  ctaState: "start" | "resume" | "today_done" | "plan_done";
  onStart: () => void;
};

function TodayWorkoutCard({
  planName,
  week,
  day,
  exerciseCount,
  completedDayCount,
  totalDayCount,
  ctaState,
  onStart,
}: TodayWorkoutCardProps) {
  const { theme } = useAppTheme();
  const planProgress = totalDayCount > 0 ? completedDayCount / totalDayCount : 0;

  const ctaLabel =
    ctaState === "resume"     ? "Resume Session"  :
    ctaState === "today_done" ? "Today Complete"  :
    ctaState === "plan_done"  ? "Plan Complete"   :
                                "Start Today's Session";

  const ctaDisabled = ctaState === "today_done" || ctaState === "plan_done";

  const subtitle =
    week && day
      ? `${week} · ${day} · ${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""}`
      : "All days complete";

  return (
    <View
      style={[
        styles.workoutCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
        TODAY'S WORKOUT
      </Text>

      <View style={styles.workoutCardHeader}>
        <View style={styles.workoutCardMeta}>
          <Text
            style={[styles.workoutPlanName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {planName}
          </Text>
          <Text style={[styles.workoutDayLabel, { color: theme.colors.muted }]}>
            {subtitle}
          </Text>
        </View>
        {totalDayCount > 0 && (
          <View style={styles.planCounterWrap}>
            <Text style={[styles.planCounterNum, { color: theme.colors.primary }]}>
              {completedDayCount}
            </Text>
            <Text style={[styles.planCounterDen, { color: theme.colors.muted }]}>
              /{totalDayCount}
            </Text>
          </View>
        )}
      </View>

      {/* Plan progress bar */}
      {totalDayCount > 0 && (
        <View style={[styles.planProgressTrack, { backgroundColor: theme.colors.mutedBg }]}>
          <View
            style={[
              styles.planProgressFill,
              {
                backgroundColor: theme.colors.primary,
                width: `${Math.round(planProgress * 100)}%`,
              },
            ]}
          />
        </View>
      )}

      <View style={styles.workoutCardBtnWrap}>
        <Button
          label={ctaLabel}
          onPress={onStart}
          disabled={ctaDisabled}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/** Shown when no plan is loaded. */
function NoPlanCard({
  onBrowse,
  onQuick,
  onImport,
}: {
  onBrowse: () => void;
  onQuick: () => void;
  onImport: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        styles.workoutCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
        TODAY'S WORKOUT
      </Text>
      <Text style={[styles.workoutPlanName, { color: theme.colors.text }]}>
        No plan loaded
      </Text>
      <Text style={[styles.workoutDayLabel, { color: theme.colors.muted, marginBottom: 16 }]}>
        Browse plans or start a quick workout
      </Text>
      <View style={styles.noPlanBtns}>
        <Button label="Browse Plans" onPress={onBrowse} />
        <Button label="Quick Workout" onPress={onQuick} variant="secondary" />
        <Button label="Import Plan" onPress={onImport} variant="secondary" />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/** 1RM baseline CTA — shown when !has1RM. */
function BaselineCTA({ onTake, onManual }: { onTake: () => void; onManual: () => void }) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        styles.baselineCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent },
      ]}
    >
      <LockeMascot size={110} mood="encouraging" />
      <Text style={[styles.baselineTitle, { color: theme.colors.text }]}>
        Set your baseline
      </Text>
      <Text style={[styles.baselineSub, { color: theme.colors.muted }]}>
        Add your 1RM data so I can track your progress and set smart targets.
      </Text>
      <View style={styles.baselineBtnWrap}>
        <Pressable
          style={[styles.baselineOption, { backgroundColor: theme.colors.primary + "15", borderColor: theme.colors.primary }]}
          onPress={onTake}
        >
          <Ionicons name="barbell-outline" size={20} color={theme.colors.primary} />
          <View style={styles.baselineOptionText}>
            <Text style={[styles.baselineOptionLabel, { color: theme.colors.primary }]}>Take 1RM Test</Text>
            <Text style={[styles.baselineOptionHint, { color: theme.colors.muted }]}>Guided protocol, most accurate</Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.baselineOption, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={onManual}
        >
          <Ionicons name="create-outline" size={20} color={theme.colors.text} />
          <View style={styles.baselineOptionText}>
            <Text style={[styles.baselineOptionLabel, { color: theme.colors.text }]}>Enter Manually</Text>
            <Text style={[styles.baselineOptionHint, { color: theme.colors.muted }]}>Quick if you know your numbers</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/** 4 equal-width quick action cells in a horizontal row. */
type QuickActionDef = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  showBadge?: boolean;
};

function QuickActionsRow({ actions }: { actions: QuickActionDef[] }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.quickActionsRow}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          style={[
            styles.quickActionBtn,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={action.onPress}
        >
          <View style={styles.quickActionIconWrap}>
            <Ionicons name={action.icon} size={22} color={theme.colors.text} />
            {action.showBadge && (
              <View
                style={[styles.quickActionBadge, { backgroundColor: theme.colors.primary }]}
              />
            )}
          </View>
          <Text style={[styles.quickActionLabel, { color: theme.colors.muted }]}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/** Progress snapshot: 3-column stats + recent activity list. */
type ProgressSnapshotProps = {
  totalSessions: number;
  thisWeekSessions: number;
  lastWorkoutDate: string;
  recentWorkouts: ReturnType<typeof useWorkouts>["workouts"];
  onWorkoutPress: (id: string) => void;
};

function ProgressSnapshot({
  totalSessions,
  thisWeekSessions,
  lastWorkoutDate,
  recentWorkouts,
  onWorkoutPress,
}: ProgressSnapshotProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.progressSection}>
      <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
        PROGRESS
      </Text>

      {/* 3-column stats */}
      <View
        style={[
          styles.statsRow,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.statCell}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {totalSessions}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.statCell}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {thisWeekSessions}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>This Week</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.statCell}>
          <Text style={[styles.statValue, { color: theme.colors.text }]} numberOfLines={1}>
            {lastWorkoutDate}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Last</Text>
        </View>
      </View>

      {/* Recent activity */}
      {recentWorkouts.length > 0 && (
        <>
          <Text
            style={[styles.sectionLabel, { color: theme.colors.muted, marginTop: 24 }]}
          >
            RECENT ACTIVITY
          </Text>
          {recentWorkouts.map((w) => (
            <Pressable key={w.id} onPress={() => onWorkoutPress(w.id)}>
              <Card style={styles.recentCard}>
                <Text style={[styles.recentName, { color: theme.colors.text }]}>
                  {w.name}
                </Text>
                <Text style={[styles.recentMeta, { color: theme.colors.muted }]}>
                  {fmtDate(w.date)}
                  {w.sessionType === "cardio"
                    ? " · Cardio"
                    : w.exercises.length > 0
                    ? ` · ${w.exercises.length} exercises`
                    : ""}
                </Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Determine Locke mood, incorporating PR detection. */
function resolveLockeMood(
  streak: number,
  daysSince: number,
  hadRecentPR: boolean
): LockeMascotMood {
  if (daysSince >= 3 && daysSince !== Infinity) return "disappointed";
  if (hadRecentPR) return "intense";
  if (streak >= 7) return "celebrating";
  if (streak >= 3) return "encouraging";
  return "neutral";
}

/** Build microcopy string, interpolating {N} with streak count. */
function buildMicrocopy(
  streak: number,
  daysSince: number,
  rawMessage: string
): string {
  if (daysSince >= 3 && daysSince !== Infinity) {
    return "I've been waiting for you...";
  }
  if (streak >= 30) return `${streak} days. Unstoppable.`;
  if (streak >= 7)  return `${streak}-day streak. You're locked in.`;
  if (streak >= 3)  return `Nice rhythm. Keep it up.`;
  return rawMessage.replace("{N}", String(streak)) || "Let's get started.";
}

/** True if the last completed workout was today or yesterday and has a loadSource match (proxy for PR). */
function detectRecentPR(workouts: ReturnType<typeof useWorkouts>["workouts"]): boolean {
  const last = workouts.find((w) => !!w.completedAt);
  if (!last?.completedAt) return false;
  const completedMs = new Date(last.completedAt).getTime();
  const msAgo = Date.now() - completedMs;
  // within last 36 hours
  if (msAgo > 36 * 60 * 60 * 1000) return false;
  // session marked as PR-awarded is the reliable signal
  return !!last.prAwarded;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    workouts,
    loading: workoutsLoading,
    startSessionFromPlan,
    getActiveSession,
    reload: reloadWorkouts,
  } = useWorkouts();
  const [refreshing, setRefreshing] = useState(false);
  const { hydrated, profileRef } = useProfileContext();
  const { xp, rank, progress, toNext, nextTier } = useXP();
  const { streak, daysSinceActivity } = useStreak();
  const { fire } = useLocke();
  const {
    exercises: planExercises,
    planName,
    isDayCompleted,
    completedDays,
    isPlanComplete,
    totalPlanDays,
  } = usePlanContext();
  const didFireInactivity   = useRef(false);
  const onboardingCheckDone = useRef(false);
  const planCelebrationShown = useRef(false);
  const isFirstFocus        = useRef(true);

  // ── Reload workouts on tab focus (fixes stale state after navigating away) ─
  useFocusEffect(
    useCallback(() => {
      // Skip first focus — initial load is handled by useWorkouts' own useEffect
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      reloadWorkouts();
    }, [reloadWorkouts])
  );

  // ── Locke speech / mood ───────────────────────────────────────────────────

  const homeTrigger: LockeTrigger =
    daysSinceActivity >= 3 && daysSinceActivity !== Infinity ? "inactivity"
    : streak.current >= 3 ? "streak_milestone"
    : "session_complete";

  const homeMood =
    daysSinceActivity >= 3 && daysSinceActivity !== Infinity ? "disappointed" as const
    : streak.current >= 7 ? "celebrating" as const
    : streak.current >= 3 ? "encouraging" as const
    : "neutral" as const;

  const [speechMsg, setSpeechMsg] = useState(() => pickMessage(homeTrigger, homeMood));
  const [tappedMood, setTappedMood] = useState<LockeMascotMood | null>(null);
  const cycleSpeech = useCallback(() => {
    const { message, mood } = pickMessageWithMood(homeTrigger);
    setSpeechMsg(message);
    // Map mood to LockeMascotMood (they overlap except onboarding_guide → neutral)
    const mascotMood: LockeMascotMood = mood === "onboarding_guide" ? "neutral" : mood as LockeMascotMood;
    setTappedMood(mascotMood);
  }, [homeTrigger]);

  const hadRecentPR = useMemo(() => detectRecentPR(workouts), [workouts]);

  const baseMood = useMemo(
    () => resolveLockeMood(streak.current, daysSinceActivity, hadRecentPR),
    [streak.current, daysSinceActivity, hadRecentPR]
  );
  const lockeMood = tappedMood ?? baseMood;

  const microcopy = useMemo(
    () => buildMicrocopy(streak.current, daysSinceActivity, speechMsg),
    [streak.current, daysSinceActivity, speechMsg]
  );

  // ── Navigation effects ────────────────────────────────────────────────────

  const [gateReady, setGateReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (onboardingCheckDone.current) return;
    onboardingCheckDone.current = true;
    if (!profileRef.current.onboardingComplete) {
      router.replace("/onboarding");
    } else {
      setGateReady(true);
    }
  }, [hydrated]);

  useEffect(() => {
    if (!gateReady) return;
    if (!isPlanComplete || planCelebrationShown.current) return;
    planCelebrationShown.current = true;
    router.push({
      pathname: "/plan-complete",
      params: {
        planName:      planName || "Your Plan",
        totalDays:     String(totalPlanDays),
        totalSessions: String(workouts.filter((w) => !!w.completedAt).length),
      },
    });
  }, [isPlanComplete, gateReady]);

  useEffect(() => {
    if (!gateReady) return;
    if (didFireInactivity.current) return;
    if (!workoutsLoading && daysSinceActivity >= 3 && daysSinceActivity !== Infinity) {
      didFireInactivity.current = true;
      fire({ trigger: "inactivity", daysSinceLastSession: daysSinceActivity });
    }
  }, [daysSinceActivity, workoutsLoading, gateReady]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const profile      = profileRef.current;
  const has1RM       = !!(
    profile.manual1RM?.deadlift ||
    profile.manual1RM?.squat    ||
    profile.manual1RM?.bench    ||
    profile.manual1RM?.ohp      ||
    profile.lastTestedAt
  );
  const activeSession = useMemo(() => workouts.find((w) => w.isActive), [workouts]);
  const totalCount    = useMemo(() => workouts.filter((w) => !!w.completedAt).length, [workouts]);
  const lastDate      = useMemo(() => {
    const last = workouts.find((w) => !!w.completedAt);
    if (!last?.date) return "—";
    const safe = /^\d{4}-\d{2}-\d{2}$/.test(last.date) ? last.date + "T12:00:00" : last.date;
    const d = new Date(safe);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [workouts]);

  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return workouts.filter((w) => !!w.completedAt && new Date(w.date) >= weekStart).length;
  }, [workouts]);

  const recentWorkouts = useMemo(() => workouts.filter((w) => !!w.completedAt).slice(0, 3), [workouts]);

  // ── Plan helpers ──────────────────────────────────────────────────────────

  const getNextPlanDay = useCallback((): {
    week: string; day: string; exercises: Exercise[];
  } | null => {
    const weekMap = new Map<string, Map<string, Exercise[]>>();
    for (const ex of planExercises) {
      const w = ex.week || "Week 1";
      const d = ex.day  || "Day 1";
      if (!weekMap.has(w)) weekMap.set(w, new Map());
      const dayMap = weekMap.get(w)!;
      if (!dayMap.has(d)) dayMap.set(d, []);
      dayMap.get(d)!.push(ex);
    }
    const weeks = Array.from(weekMap.entries()).map(([week, dayMap]) => ({
      week,
      days: Array.from(dayMap.entries()).map(([day, exs]) => ({ day, exercises: exs })),
    }));

    for (let wi = 0; wi < weeks.length; wi++) {
      if (wi > 0) {
        const prev = weeks[wi - 1];
        if (!prev.days.every((d) => isDayCompleted(prev.week, d.day))) break;
      }
      for (let di = 0; di < weeks[wi].days.length; di++) {
        const dayGroup = weeks[wi].days[di];
        if (isDayCompleted(weeks[wi].week, dayGroup.day)) continue;
        if (di > 0) {
          const prevDay = weeks[wi].days[di - 1];
          if (wasCompletedToday(completedDays, weeks[wi].week, prevDay.day)) return null;
        }
        return { week: weeks[wi].week, day: dayGroup.day, exercises: dayGroup.exercises };
      }
    }
    return null;
  }, [planExercises, isDayCompleted, completedDays]);

  const completedDayCount = useMemo(() => {
    if (planExercises.length === 0) return 0;
    const keys = new Set<string>();
    for (const ex of planExercises) keys.add(`${ex.week || "Week 1"}|${ex.day || "Day 1"}`);
    return Array.from(keys).filter((k) => !!completedDays[k]).length;
  }, [planExercises, completedDays]);

  const nextPlanDay = useMemo(
    () => (planExercises.length === 0 ? null : getNextPlanDay()),
    [planExercises, getNextPlanDay]
  );

  // Derive CTA state for TodayWorkoutCard
  const ctaState = useMemo((): "start" | "resume" | "today_done" | "plan_done" => {
    if (activeSession) return "resume";
    if (isPlanComplete) return "plan_done";
    if (planExercises.length > 0 && !nextPlanDay) return "today_done";
    return "start";
  }, [activeSession, isPlanComplete, planExercises.length, nextPlanDay]);

  // ── Start session handler ─────────────────────────────────────────────────

  const doStartPlanSession = useCallback(async (next: { week: string; day: string; exercises: import("../../lib/types").Exercise[] }) => {
    const id = await startSessionFromPlan(
      planName || "Workout", next.week, next.day, next.exercises, profile
    );
    router.push(`/session/${id}`);
  }, [startSessionFromPlan, planName, profile, router]);

  const handleStartSession = useCallback(async () => {
    const active = getActiveSession();
    if (active) { router.push(`/session/${active.id}`); return; }

    const next = getNextPlanDay();
    if (!next) {
      const allDone = isPlanComplete || (() => {
        const wm = new Map<string, Set<string>>();
        for (const ex of planExercises) {
          const w = ex.week || "Week 1"; const d = ex.day || "Day 1";
          if (!wm.has(w)) wm.set(w, new Set());
          wm.get(w)!.add(d);
        }
        for (const [w, days] of wm) for (const d of days) if (!isDayCompleted(w, d)) return false;
        return true;
      })();
      Alert.alert(
        allDone ? "Plan Complete" : "Come Back Tomorrow",
        allDone
          ? "You've finished every day in your plan!"
          : "You already completed today's session. Rest up and come back tomorrow."
      );
      return;
    }

    if (!has1RM) {
      Alert.alert(
        "No 1RM Data",
        "Your big 4 lifts aren't set up yet. Weights will be more accurate with your 1RM data.",
        [
          { text: "Start Anyway", style: "cancel", onPress: () => doStartPlanSession(next) },
          { text: "Enter Manually", onPress: () => router.push("/onboarding?retake=1&step=manual") },
          { text: "Take 1RM Test", onPress: () => router.push("/orm-test?source=home") },
        ]
      );
      return;
    }

    doStartPlanSession(next);
  }, [
    getActiveSession, getNextPlanDay, isPlanComplete, planExercises,
    isDayCompleted, doStartPlanSession, has1RM, router,
  ]);

  // ── Quick actions ─────────────────────────────────────────────────────────

  const quickActions = useMemo<QuickActionDef[]>(
    () => [
      { icon: "heart-outline",       label: "Cardio",    onPress: () => router.push("/cardio-setup") },
      { icon: "list-outline",        label: "View Plan", onPress: () => router.push("/plan") },
      { icon: "stats-chart-outline", label: "Stats",     onPress: () => router.push("/weekly-summary") },
    ],
    [router]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  // Show blank dark screen until onboarding check completes — prevents flash
  if (!gateReady) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
  }

  return (
    <View style={[styles.rootContainer, { backgroundColor: theme.colors.bg }]}>
      {/* STICKY HEADER — outside ScrollView */}
      <HeaderSection topInset={insets.top} onCycleSpeech={cycleSpeech} onReset={async () => { await clearAllData(); DevSettings.reload(); }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: 16, paddingBottom: 48 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await reloadWorkouts();
              setRefreshing(false);
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* 1. GREETING + RANK/XP/STREAK */}
        <RankXPRow
          name={profile.name}
          rank={rank}
          xp={xp}
          progress={progress}
          toNext={toNext}
          nextTier={nextTier}
          streak={streak}
        />

        {/* 2. ACTIVE SESSION BANNER — above primary CTA */}
        {activeSession && (
          <Pressable
            style={[styles.activeBanner, { backgroundColor: theme.colors.accent }]}
            onPress={() => router.push(`/session/${activeSession.id}`)}
          >
            <Text style={[styles.activeBannerTitle, { color: theme.colors.accentText }]}>
              · Session in Progress
            </Text>
            <Text style={[styles.activeBannerSub, { color: theme.colors.accentText }]}>
              {activeSession.name} — tap to continue
            </Text>
          </Pressable>
        )}

        {/* 3. LOCKE PANEL — only when has1RM */}
        {has1RM && (
          <LockePanel mood={lockeMood} microcopy={microcopy} />
        )}

        {/* Locke banner from session-end events */}
        <LockeBanner />

        {/* 4. 1RM BASELINE CTA */}
        {!has1RM && profile.onboardingComplete && (
          <BaselineCTA onTake={() => router.push("/orm-test?source=home")} onManual={() => router.push("/onboarding?retake=1&step=manual")} />
        )}

        {/* 5. TODAY'S WORKOUT CARD (PRIMARY CTA) */}
        {planExercises.length > 0 ? (
          <TodayWorkoutCard
            planName={planName || "Workout"}
            week={nextPlanDay?.week ?? ""}
            day={nextPlanDay?.day ?? ""}
            exerciseCount={nextPlanDay?.exercises.length ?? 0}
            completedDayCount={completedDayCount}
            totalDayCount={totalPlanDays}
            ctaState={ctaState}
            onStart={handleStartSession}
          />
        ) : (
          <NoPlanCard
            onBrowse={() => router.push("/catalog")}
            onQuick={() => router.push("/start-session")}
            onImport={() => router.push("/plan")}
          />
        )}

        {/* 6. QUICK ACTIONS ROW */}
        <Text
          style={[
            styles.sectionLabel,
            { color: theme.colors.muted, marginTop: 24, marginBottom: 8 },
          ]}
        >
          QUICK ACTIONS
        </Text>
        <QuickActionsRow actions={quickActions} />

        {/* 7. PROGRESS SNAPSHOT */}
        <ProgressSnapshot
          totalSessions={totalCount}
          thisWeekSessions={thisWeekCount}
          lastWorkoutDate={lastDate}
          recentWorkouts={recentWorkouts}
          onWorkoutPress={(id) => router.push(`/session/${id}`)}
        />

        {/* DEV: Tools — subtle, bottom */}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Root layout — sticky header + scrollable body
  rootContainer: { flex: 1 },
  stickyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    // paddingTop handled by insets passed via useSafeAreaInsets in Provider
  },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16 },

  // Greeting block
  greetingBlock: { marginBottom: 12 },
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 12,
  },

  // Rank/XP/Streak row
  rankXPRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  xpBarWrap: { flex: 1 },
  streakChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  streakChipLabel: { fontSize: 12, fontWeight: "700" },

  // Active session banner
  activeBanner: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  activeBannerTitle: { fontSize: 14, fontWeight: "700" },
  activeBannerSub:   { fontSize: 13, marginTop: 2, opacity: 0.85 },

  // Locke panel
  lockePanel: {
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  lockeMicrocopy: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    textAlign: "center",
  },
  // Today's workout card
  workoutCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  workoutCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  workoutCardMeta: { flex: 1, paddingRight: 12 },
  workoutPlanName:  { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  workoutDayLabel:  { fontSize: 13 },
  planCounterWrap:  { flexDirection: "row", alignItems: "baseline" },
  planCounterNum:   { fontSize: 22, fontWeight: "800" },
  planCounterDen:   { fontSize: 14, fontWeight: "600" },
  planProgressTrack: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 4,
  },
  planProgressFill: { height: "100%", borderRadius: 999, minWidth: 4 },
  workoutCardBtnWrap: { marginTop: 16 },
  noPlanBtns: { gap: 8 },

  // Baseline CTA
  baselineCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  baselineTitle: { fontSize: 17, fontWeight: "700", marginTop: 4, marginBottom: 4 },
  baselineSub:   { fontSize: 13, lineHeight: 18, textAlign: "center", marginBottom: 4 },
  baselineBtnWrap: { alignSelf: "stretch", marginTop: 12, gap: 10 },
  baselineOption: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 16 },
  baselineOptionText: { flex: 1 },
  baselineOptionLabel: { fontSize: 15, fontWeight: "700" },
  baselineOptionHint: { fontSize: 12, marginTop: 2 },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  // Quick actions
  quickActionsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  quickActionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIconWrap: { position: "relative" },
  quickActionBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Progress snapshot
  progressSection: { marginTop: 8 },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statCell: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  statDivider: { width: 1, alignSelf: "stretch", marginVertical: 12 },
  statValue: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  statLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },

  recentCard:  { marginBottom: 8, padding: 14 },
  recentName:  { fontSize: 15, fontWeight: "600" },
  recentMeta:  { fontSize: 12, marginTop: 2 },
});
