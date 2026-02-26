import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, DevSettings, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fmtDate, wasCompletedToday } from "../../lib/helpers";
import { useWorkouts } from "../../hooks/useWorkouts";
import { useProfileContext } from "../../contexts/ProfileContext";
import type { Exercise, LockeTrigger, LockeState } from "../../lib/types";
import { useXP } from "../../hooks/useXP";
import { useStreak } from "../../hooks/useStreak";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { RankBadge } from "../../components/RankBadge";
import { XPBar } from "../../components/XPBar";
import { LockeMini, LockeBanner } from "../../components/Locke";
import { LockeMascot } from "../../components/Locke/LockeMascot";
import { useLocke } from "../../contexts/LockeContext";
import { useAppTheme } from "../../contexts/ThemeContext";
import Logo from "../../components/Logo";
import { usePlanContext } from "../../contexts/PlanContext";
import { clearAllData } from "../../lib/storage";
import { pickMessage } from "../../lib/lockeMessages";

function StatCell({ label, value, small }: { label: string; value: string; small?: boolean }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.statCell}>
      <View style={styles.statValueWrap}>
        <Text style={[styles.statValue, { color: theme.colors.text }, small && { fontSize: 14 }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, { color: theme.colors.muted }]}>{label}</Text>
    </View>
  );
}


export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { workouts, loading: workoutsLoading, startSessionFromPlan, getActiveSession, reload: reloadWorkouts } = useWorkouts();
  const [refreshing, setRefreshing] = useState(false);
  const { hydrated, profileRef } = useProfileContext();
  const { xp, rank, progress, toNext, nextTier } = useXP();
  const { streak, daysSinceActivity } = useStreak();
  const { fire } = useLocke();
  const { exercises: planExercises, planName, isDayCompleted, completedDays, isPlanComplete, totalPlanDays } = usePlanContext();
  const didFireInactivity = useRef(false);
  const onboardingCheckDone = useRef(false);
  const planCelebrationShown = useRef(false);

  // ── Locke speech bubble ──────────────────────────────────────────────────────
  const homeTrigger: LockeTrigger =
    daysSinceActivity >= 3 && daysSinceActivity !== Infinity ? "inactivity"
    : streak.current >= 3 ? "streak_milestone"
    : "session_complete";

  const homeMood: LockeState =
    daysSinceActivity >= 3 && daysSinceActivity !== Infinity ? "disappointed"
    : streak.current >= 7 ? "celebrating"
    : streak.current >= 3 ? "encouraging"
    : "neutral";

  const [speechMsg, setSpeechMsg] = useState(() => pickMessage(homeTrigger, homeMood));
  const cycleSpeech = useCallback(() => {
    setSpeechMsg(pickMessage(homeTrigger, homeMood));
  }, [homeTrigger, homeMood]);

  useEffect(() => {
    if (!hydrated) return;
    if (onboardingCheckDone.current) return;
    onboardingCheckDone.current = true;
    // Read from ref — always up-to-date even before React commits the batched
    // setProfile update that may have been triggered by the previous screen.
    if (!profileRef.current.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [hydrated]);

  // Navigate to plan-complete when all plan days are done
  useEffect(() => {
    if (!isPlanComplete || planCelebrationShown.current) return;
    planCelebrationShown.current = true;
    router.push({
      pathname: "/plan-complete",
      params: {
        planName: planName || "Your Plan",
        totalDays: String(totalPlanDays),
        totalSessions: String(workouts.filter((w) => !!w.completedAt).length),
      },
    });
  }, [isPlanComplete]);

  useEffect(() => {
    if (didFireInactivity.current) return;
    if (!workoutsLoading && daysSinceActivity >= 3 && daysSinceActivity !== Infinity) {
      didFireInactivity.current = true;
      fire({ trigger: "inactivity", daysSinceLastSession: daysSinceActivity });
    }
  }, [daysSinceActivity, workoutsLoading]);

  const totalCount = workouts.length;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = workouts.filter((w) => new Date(w.date) >= weekStart).length;

  const lastWorkout = workouts[0]?.date ? fmtDate(workouts[0].date) : "—";
  const recent = workouts.slice(0, 3);
  const activeSession = workouts.find((w) => w.isActive);

  const profile = profileRef.current;

  // Find the next incomplete plan day (respecting week/day locking + calendar)
  function getNextPlanDay(): { week: string; day: string; exercises: Exercise[] } | null {
    const weekMap = new Map<string, Map<string, Exercise[]>>();
    for (const ex of planExercises) {
      const w = ex.week || "Week 1";
      const d = ex.day || "Day 1";
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
        // Check calendar: previous day must not have been completed today
        if (di > 0) {
          const prevDay = weeks[wi].days[di - 1];
          if (wasCompletedToday(completedDays, weeks[wi].week, prevDay.day)) return null;
        }
        return { week: weeks[wi].week, day: dayGroup.day, exercises: dayGroup.exercises };
      }
    }
    return null;
  }
  const has1RM = !!(
    profile.manual1RM?.deadlift ||
    profile.manual1RM?.squat ||
    profile.manual1RM?.bench ||
    profile.manual1RM?.ohp ||
    profile.lastTestedAt
  );

  const streakLabel =
    streak.current > 0
      ? `${streak.current}d streak`
      : daysSinceActivity === Infinity
      ? "No sessions yet"
      : `${daysSinceActivity}d ago`;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await reloadWorkouts(); setRefreshing(false); }}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Logo />
        {has1RM && (
          <Pressable onPress={cycleSpeech} style={styles.lockeWrap}>
            <LockeMini />
          </Pressable>
        )}
      </View>

      {/* Locke speech bubble */}
      {has1RM && speechMsg !== "" && (
        <Pressable onPress={cycleSpeech} style={[styles.speechBubble, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.speechText, { color: theme.colors.text }]}>"{speechMsg}"</Text>
        </Pressable>
      )}

      {/* Locke banner (appears when triggered from session end) */}
      <LockeBanner />

      {/* 1RM test CTA — shown when user skipped during onboarding */}
      {!has1RM && profile.onboardingComplete && (
        <View style={[styles.ormCtaCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent }]}>
          <View style={styles.ormCtaRow}>
            <LockeMascot size="icon" mood="encouraging" />
            <View style={styles.ormCtaTextWrap}>
              <Text style={[styles.ormCtaTitle, { color: theme.colors.text }]}>
                Set your baseline
              </Text>
              <Text style={[styles.ormCtaSub, { color: theme.colors.muted }]}>
                Take the 1RM test so I can track your progress and set smart targets.
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <Button label="Take 1RM Test" onPress={() => router.push("/orm-test?source=home")} />
          </View>
        </View>
      )}

      {/* Workout stats */}
      <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>THIS WEEK</Text>
      <Card style={styles.statsCard}>
        <View style={styles.statsRow}>
          <StatCell label="Total" value={String(totalCount)} />
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <StatCell label="This Week" value={String(thisWeek)} />
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <StatCell label="Last" value={lastWorkout} small />
        </View>
      </Card>

      {/* Rank + XP widget */}
      <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>YOUR RANK</Text>
      <Card style={styles.rankCard}>
        <View style={styles.rankRow}>
          <RankBadge rank={rank} />
          <Text style={[styles.streakText, { color: streak.current >= 3 ? theme.colors.primary : theme.colors.muted }]}>
            {streak.current >= 1 ? "🔥" : "·"} {streakLabel}
          </Text>
        </View>
        <View style={{ marginTop: 10 }}>
          <XPBar
            totalXP={xp.total}
            progress={progress}
            toNext={toNext}
            nextRank={nextTier?.rank ?? null}
          />
        </View>
      </Card>

      {/* Active session resume banner */}
      {activeSession && (
        <Pressable
          style={[styles.activeBanner, { backgroundColor: theme.colors.accent }]}
          onPress={() => router.push(`/session/${activeSession.id}`)}
        >
          <Text style={{ color: theme.colors.accentText, fontWeight: "700" }}>● Session in Progress</Text>
          <Text style={{ color: theme.colors.accentText, fontSize: 13, marginTop: 2, opacity: 0.85 }}>
            {activeSession.name} — tap to continue
          </Text>
        </Pressable>
      )}

      {__DEV__ && (
        <Pressable
          style={styles.devReset}
          onPress={() =>
            Alert.alert("Reset Data", "Wipe all data and start fresh?", [
              { text: "Cancel", style: "cancel" },
              { text: "Reset", style: "destructive", onPress: async () => {
                await clearAllData();
                DevSettings.reload();
              } },
            ])
          }
        >
          <Text style={[styles.devResetText, { color: theme.colors.danger }]}>⚠ DEV: Reset All Data</Text>
        </Pressable>
      )}

      {planExercises.length > 0 ? (
        <>
          <Button
            label="Start Session"
            onPress={async () => {
              const active = getActiveSession();
              if (active) {
                router.push(`/session/${active.id}`);
                return;
              }
              const next = getNextPlanDay();
              if (!next) {
                // Distinguish between plan complete vs calendar-locked
                const allDone = planExercises.length > 0 && (() => {
                  const wm = new Map<string, Set<string>>();
                  for (const ex of planExercises) {
                    const w = ex.week || "Week 1";
                    const d = ex.day || "Day 1";
                    if (!wm.has(w)) wm.set(w, new Set());
                    wm.get(w)!.add(d);
                  }
                  for (const [w, days] of wm) {
                    for (const d of days) {
                      if (!isDayCompleted(w, d)) return false;
                    }
                  }
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
              const id = await startSessionFromPlan(
                planName || "Workout",
                next.week,
                next.day,
                next.exercises,
                profile
              );
              router.push(`/session/${id}`);
            }}
          />
          <View style={{ height: 12 }} />
          <Button label="View Plan" onPress={() => router.push("/plan")} variant="secondary" />
        </>
      ) : (
        <>
          <Button label="Browse Plans" onPress={() => router.push("/catalog")} />
          <View style={{ height: 12 }} />
          <Button label="Quick Workout" onPress={() => router.push("/quick-workout")} variant="secondary" />
          <View style={{ height: 12 }} />
          <Button label="Import Plan" onPress={() => router.push("/plan")} variant="secondary" />
        </>
      )}

      {/* Quick links */}
      <View style={styles.quickLinksRow}>
        <Pressable style={[styles.quickLink, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => router.push("/exercise-library")}>
          <Text style={[styles.quickLinkText, { color: theme.colors.text }]}>Exercise Library</Text>
        </Pressable>
        <Pressable style={[styles.quickLink, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => router.push("/weekly-summary")}>
          <Text style={[styles.quickLinkText, { color: theme.colors.text }]}>Weekly Summary</Text>
        </Pressable>
      </View>

      {recent.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>RECENT ACTIVITY</Text>
          {recent.map((w) => (
            <Pressable key={w.id} onPress={() => router.push(`/session/${w.id}`)}>
              <Card style={styles.recentCard}>
                <Text style={[styles.recentName, { color: theme.colors.text }]}>{w.name}</Text>
                <Text style={[styles.recentMeta, { color: theme.colors.muted }]}>
                  {fmtDate(w.date)}
                  {w.exercises.length > 0 ? ` · ${w.exercises.length} exercises` : ""}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 0, paddingHorizontal: 24, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  statsCard: { marginBottom: 12 },
  statsRow: { flexDirection: "row", alignItems: "stretch" },
  statCell: { flex: 1, alignItems: "center", justifyContent: "center" },
  statValueWrap: { height: 28, justifyContent: "flex-end" },
  statValue: { fontSize: 22, fontWeight: "700", marginBottom: 2 },
  statLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, alignSelf: "stretch", marginVertical: 4 },
  rankCard: { marginBottom: 20 },
  rankRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  streakText: { fontSize: 13, fontWeight: "600" },
  activeBanner: { borderRadius: 16, padding: 18, marginBottom: 16 },
  recentSection: { marginTop: 28 },
  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  recentCard: { marginBottom: 8, padding: 14 },
  recentName: { fontSize: 15, fontWeight: "600" },
  recentMeta: { fontSize: 12, marginTop: 2 },
  devReset: { alignItems: "center", paddingVertical: 8, marginBottom: 12 },
  devResetText: { fontSize: 12, fontWeight: "600" },
  quickLinksRow: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 4 },
  quickLink: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  quickLinkText: { fontSize: 13, fontWeight: "600" },
  ormCtaCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  ormCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ormCtaTextWrap: {
    flex: 1,
  },
  ormCtaTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  ormCtaSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  lockeWrap: {
    alignItems: "center",
  },
  speechBubble: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  speechText: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },
});
