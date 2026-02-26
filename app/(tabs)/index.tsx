import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, DevSettings } from "react-native";
import { useRouter } from "expo-router";
import { useWorkouts } from "../../hooks/useWorkouts";
import { useProfileContext } from "../../contexts/ProfileContext";
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

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${String(d.getFullYear()).slice(-2)}`;
}

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
  const { workouts, loading: workoutsLoading } = useWorkouts();
  const { hydrated, profileRef } = useProfileContext();
  const { xp, rank, progress, toNext, nextTier } = useXP();
  const { streak, daysSinceActivity } = useStreak();
  const { fire } = useLocke();
  const { exercises: planExercises } = usePlanContext();
  const didFireInactivity = useRef(false);
  const onboardingCheckDone = useRef(false);

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
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Logo />
        {has1RM && <LockeMini />}
      </View>

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
            onPress={() => router.push("/plan")}
          />
          <View style={{ height: 12 }} />
          <Button label="Browse Plans" onPress={() => router.push("/catalog")} variant="secondary" />
        </>
      ) : (
        <>
          <Button label="Browse Plans" onPress={() => router.push("/catalog")} />
          <View style={{ height: 12 }} />
          <Button label="Import Plan" onPress={() => router.push("/plan")} variant="secondary" />
        </>
      )}

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
  content: { paddingTop: 80, paddingHorizontal: 24, paddingBottom: 40 },
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
});
