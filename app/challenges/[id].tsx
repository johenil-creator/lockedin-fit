import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { useAppTheme } from "../../contexts/ThemeContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import { useLocke } from "../../contexts/LockeContext";
import { useToast } from "../../contexts/ToastContext";
import { useChallenge } from "../../hooks/useChallenge";
import { useWorkouts } from "../../hooks/useWorkouts";
import { useStreak, isoWeek } from "../../hooks/useStreak";
import { useXP } from "../../hooks/useXP";

import { BackButton } from "../../components/BackButton";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { LockeMascot } from "../../components/Locke/LockeMascot";

import { getChallengeDefinition, challengeUnit } from "../../lib/challengeCatalog";
import {
  getCurrentDay,
  isLockedForToday,
  areRewardsLockedToday,
  workDayProgressPct,
  totalVolumeCompleted,
  detectMilestoneCrossed,
  toDateStr,
  type ChallengeMilestone,
} from "../../lib/challengeService";
import { awardSessionXP } from "../../lib/xpService";
import {
  hapticWorkoutComplete,
  hapticSetComplete,
  hapticRankUp,
} from "../../lib/hapticFeedback";
import { syncCompletedSession } from "../../lib/healthkit/integration";
import { makeId } from "../../lib/helpers";
import { spacing, radius, typography } from "../../lib/theme";
import type {
  ChallengeDefinition,
  ChallengeDay,
  ChallengeProgress,
  SessionExercise,
  SetEntry,
  WorkoutSession,
} from "../../lib/types";

/**
 * Millis until local midnight → short human string.
 * "4h 23m", "23m", "moments" — used by the locked CTA.
 */
function formatUntilMidnight(now: Date): string {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, midnight.getTime() - now.getTime());
  const totalMin = Math.ceil(diffMs / 60_000);
  if (totalMin <= 1) return "moments";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function milestoneToastMessage(
  milestone: ChallengeMilestone,
  xpAwarded: number,
): string {
  switch (milestone) {
    case "quarter":
      return `25% cleared — momentum locked. +${xpAwarded} XP`;
    case "half":
      return `Halfway there. You don't stop now. +${xpAwarded} XP`;
    case "three_quarter":
      return `75% done. Finish line in sight. +${xpAwarded} XP`;
  }
}

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { fire } = useLocke();
  const { profile, updateProfile } = useProfileContext();
  const { addWorkout } = useWorkouts();
  const { recordActivity } = useStreak();
  const { xp, setXPRecord } = useXP();

  const {
    progress,
    loading,
    startChallenge,
    abandonChallenge,
    advanceDay,
  } = useChallenge();

  const def: ChallengeDefinition | null = useMemo(
    () => (id ? getChallengeDefinition(id) : null),
    [id],
  );

  const isActive = progress?.challengeId === def?.id;
  const [saving, setSaving] = useState(false);
  // Speed-run lock: blocks logging another day of THIS challenge today.
  const lockedUntilTomorrow =
    isActive && progress ? isLockedForToday(progress) : false;
  // Rewards lock: survives abandon/rejoin so XP/fangs can't be farmed by
  // hopping between challenges. When true, completions still log and
  // advance the schedule — only the reward side effects are skipped.
  const rewardsLocked = areRewardsLockedToday(
    profile.lastChallengeDayCompletedDate,
  );
  const reducedMotion = useReducedMotion();

  // Ticking "now" used only to recompute the unlock countdown. 30s cadence is
  // plenty — the copy only changes minute-by-minute.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!lockedUntilTomorrow) return;
    const tickId = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tickId);
  }, [lockedUntilTomorrow]);
  const unlockCountdown = lockedUntilTomorrow
    ? `Unlocks in ${formatUntilMidnight(now)}`
    : "";

  // The day being shown — the user's current day if this challenge is active,
  // otherwise day 1 as a preview.
  const displayDay: ChallengeDay | null = useMemo(() => {
    if (!def) return null;
    if (isActive && progress) return getCurrentDay(progress, def);
    return def.schedule.find((d) => d.dayNumber === 1) ?? null;
  }, [def, isActive, progress]);

  const unit = def ? challengeUnit(def) : "reps";
  const unitLabel = unit === "seconds" ? "sec" : "reps";
  const volumeNoun = unit === "seconds" ? "SECONDS HELD" : `${def?.exerciseName.toUpperCase() ?? "REPS"} LOGGED`;

  // Cumulative volume across all completed days — drives the headline stat
  // in the Your Progress card so the user sees tangible work stacking up.
  const totalVolume = useMemo(() => {
    if (!def || !isActive || !progress) return 0;
    return totalVolumeCompleted(progress, def);
  }, [def, isActive, progress]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleStart() {
    if (!def || saving) return;
    if (progress && progress.challengeId !== def.id) {
      Alert.alert(
        "Replace Active Challenge?",
        "Starting this will abandon your current challenge progress.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace",
            style: "destructive",
            onPress: async () => {
              await abandonChallenge();
              await startChallenge(def.id);
            },
          },
        ],
      );
      return;
    }
    try {
      await startChallenge(def.id);
      showToast({ message: `Joined ${def.title}!`, type: "success" });
      fire({ trigger: "session_complete" }, 6000);
    } catch (e) {
      Alert.alert("Couldn't start", e instanceof Error ? e.message : "Try again.");
    }
  }

  async function handleAbandon() {
    if (!def) return;
    Alert.alert(
      "Abandon Challenge?",
      "Your progress will be lost. You can always restart the challenge later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Abandon",
          style: "destructive",
          onPress: async () => {
            await abandonChallenge();
            router.back();
          },
        },
      ],
    );
  }

  /**
   * Marks a rest day as done. Just advances the schedule — rest days still
   * count as "activity" for the streak so the user can't lose their streak
   * simply by following the challenge's rest schedule.
   */
  async function handleCompleteRestDay() {
    if (!def || !progress || saving || lockedUntilTomorrow) return;
    setSaving(true);
    try {
      // Streak tick (no workout session for rest days). Skipped entirely
      // when rewards are locked for today — the streak has already been
      // ticked via the earlier completion, and we don't want to touch
      // freeze accounting again.
      if (!rewardsLocked) {
        const restDays = profile.restDays ?? [];
        const week = isoWeek();
        const freezesLeft =
          profile.freezesResetWeek === week ? profile.freezesRemaining ?? 2 : 2;
        const { freezesUsed } = await recordActivity(
          new Date(),
          restDays,
          freezesLeft,
        );
        updateProfile({
          lastChallengeDayCompletedDate: toDateStr(),
          ...(freezesUsed > 0 || profile.freezesResetWeek !== week
            ? {
                freezesRemaining: freezesLeft - freezesUsed,
                freezesResetWeek: week,
              }
            : {}),
        });
      }

      const { archived } = await advanceDay();
      if (archived) {
        void hapticRankUp();
        fire({ trigger: "challenge_complete" }, 8000);
        showToast({ message: "Challenge complete! Legendary.", type: "success" });
      } else if (rewardsLocked) {
        hapticSetComplete();
        showToast({
          message: "Rest day logged. Rewards already earned today.",
          type: "success",
        });
      } else {
        hapticSetComplete();
        showToast({ message: "Rest day logged.", type: "success" });
      }
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Couldn't log rest day.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  /**
   * Marks today's workout day as complete. Builds a real WorkoutSession so
   * it appears in history, counts toward the streak, awards XP, and syncs
   * to Apple Health — same pattern as the 1RM test flow.
   */
  async function handleCompleteWorkoutDay() {
    if (!def || !progress || !displayDay || !displayDay.sets || saving || lockedUntilTomorrow) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const sets: SetEntry[] = displayDay.sets.map((s) => ({
        reps: String(s.reps),
        weight: "",
        completed: true,
      }));
      const sessionExercise: SessionExercise = {
        exerciseId: makeId(),
        name: def.exerciseName,
        sets,
        equipment: def.equipment,
        restTime: def.defaultRestSeconds,
      };
      const workoutSession: WorkoutSession = {
        id: makeId(),
        name: `${def.title} — Day ${displayDay.dayNumber}`,
        date: now,
        startedAt: now,
        completedAt: now,
        isActive: false,
        sessionType: "strength",
        exercises: [sessionExercise],
        xpClaimed: true,
        notes: `Day ${displayDay.dayNumber} of ${def.totalDays}`,
      };

      // Reward side effects — skipped entirely when the user has already
      // earned challenge rewards today (via any challenge). This lets the
      // schedule still advance below, so abandon→rejoin progresses the new
      // challenge without being able to farm XP/fangs/streak/history.
      let xpAwarded = 0;
      if (!rewardsLocked) {
        await addWorkout(workoutSession);

        // Streak with freeze + rest-day support
        const restDays = profile.restDays ?? [];
        const week = isoWeek();
        const freezesLeft =
          profile.freezesResetWeek === week ? profile.freezesRemaining ?? 2 : 2;
        const { streak: newStreak, freezesUsed } = await recordActivity(
          new Date(),
          restDays,
          freezesLeft,
        );
        // Stamp the profile-level completion date so future same-day
        // completions fall into the rewardsLocked branch above.
        updateProfile({
          lastChallengeDayCompletedDate: toDateStr(),
          ...(freezesUsed > 0 || profile.freezesResetWeek !== week
            ? {
                freezesRemaining: freezesLeft - freezesUsed,
                freezesResetWeek: week,
              }
            : {}),
        });

        // XP
        const xpResult = awardSessionXP(
          xp,
          workoutSession,
          false,
          newStreak.current,
        );
        await setXPRecord(xpResult.updatedRecord);
        xpAwarded = xpResult.awarded;

        // Apple Health sync (fire-and-forget)
        void syncCompletedSession(workoutSession);
      }

      // Snapshot pct BEFORE advancing so we can detect milestone crossings.
      const beforePct = workDayProgressPct(progress, def);
      const { archived, progress: nextProgress } = await advanceDay();
      const afterPct = nextProgress ? workDayProgressPct(nextProgress, def) : 1;
      const milestone = detectMilestoneCrossed(beforePct, afterPct);

      if (archived) {
        void hapticRankUp();
        fire({ trigger: "challenge_complete" }, 8000);
        showToast({
          message: "Challenge complete! Legendary.",
          type: "success",
        });
      } else if (rewardsLocked) {
        void hapticSetComplete();
        fire({ trigger: "session_complete" }, 5000);
        showToast({
          message: `Day ${displayDay.dayNumber} logged. Rewards already earned today.`,
          type: "success",
        });
      } else if (milestone) {
        void hapticWorkoutComplete();
        fire({ trigger: "streak_milestone" }, 7000);
        showToast({
          message: milestoneToastMessage(milestone, xpAwarded),
          type: "success",
        });
      } else {
        void hapticWorkoutComplete();
        fire({ trigger: "session_complete" }, 6000);
        showToast({
          message: `Day ${displayDay.dayNumber} done! +${xpAwarded} XP`,
          type: "success",
        });
      }
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Couldn't log day.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!def) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
            Challenge not found.
          </Text>
        </View>
      </View>
    );
  }

  const pct = isActive && progress ? workDayProgressPct(progress, def) : 0;

  // When the user has reduced motion enabled, skip entering animations
  // entirely — passing `undefined` renders the view statically.
  const enter = (delay: number) =>
    reducedMotion ? undefined : FadeInDown.delay(delay).duration(300);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.heading, { color: theme.colors.text, marginLeft: spacing.sm, flex: 1 }]} numberOfLines={1}>
          {def.title}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: isActive
              ? insets.bottom + spacing.xl
              : insets.bottom + spacing.xl + 72,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.intro}>
          <LockeMascot
            size={160}
            mood={
              displayDay?.isRest
                ? "neutral"
                : isActive
                ? "intense"
                : "encouraging"
            }
          />
          <Text style={[styles.tagline, { color: theme.colors.muted }]}>
            {def.tagline}
          </Text>
        </View>

        {/* Today's prescription */}
        <Animated.View entering={enter(80)}>
          <Text style={[styles.eyebrow, { color: theme.colors.muted, marginTop: spacing.md }]}>
            {isActive
              ? lockedUntilTomorrow
                ? "COMING TOMORROW"
                : "TODAY"
              : "DAY 1 PREVIEW"}
          </Text>

          {displayDay?.isRest ? (
            <Card>
              <View style={styles.restHeader}>
                <Ionicons name="moon-outline" size={22} color={theme.colors.accent} />
                <Text style={[styles.dayTitle, { color: theme.colors.text, marginLeft: 8 }]}>
                  Rest Day
                </Text>
              </View>
              <Text style={[styles.dayNote, { color: theme.colors.muted }]}>
                Recovery is the work. Check in to advance the schedule and keep your streak locked.
              </Text>
              {isActive && (
                <View style={{ marginTop: spacing.sm }}>
                  <Button
                    label={
                      lockedUntilTomorrow ? unlockCountdown : "Log Rest Day"
                    }
                    onPress={handleCompleteRestDay}
                    disabled={saving || lockedUntilTomorrow}
                    loading={saving}
                  />
                  {lockedUntilTomorrow ? (
                    <Text style={[styles.lockHint, { color: theme.colors.muted }]}>
                      You already completed a day of this challenge today. Come back tomorrow.
                    </Text>
                  ) : rewardsLocked ? (
                    <Text style={[styles.lockHint, { color: theme.colors.muted }]}>
                      Rewards already claimed today — you'll still advance the schedule.
                    </Text>
                  ) : null}
                </View>
              )}
            </Card>
          ) : displayDay ? (
            <Card>
              <Text style={[styles.dayTitle, { color: theme.colors.text }]}>
                {def.exerciseName}
              </Text>
              <Text style={[styles.dayNote, { color: theme.colors.muted }]}>
                Rest {def.defaultRestSeconds}s between sets.
              </Text>
              <View style={styles.setsWrap}>
                {displayDay.sets?.map((set, i) => (
                  <View
                    key={i}
                    style={[
                      styles.setRow,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.mutedBg,
                      },
                    ]}
                  >
                    <Text style={[styles.setLabel, { color: theme.colors.muted }]}>
                      SET {i + 1}
                    </Text>
                    <Text style={[styles.setReps, { color: theme.colors.text }]}>
                      {set.reps} {unitLabel}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: theme.colors.muted }]}>
                  TOTAL
                </Text>
                <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
                  {displayDay.totalReps} {unitLabel}
                </Text>
              </View>

              {isActive && (
                <View style={{ marginTop: spacing.sm }}>
                  <Button
                    label={
                      lockedUntilTomorrow
                        ? unlockCountdown
                        : saving
                        ? "Saving…"
                        : "Mark Day Complete"
                    }
                    onPress={handleCompleteWorkoutDay}
                    disabled={saving || lockedUntilTomorrow}
                    loading={saving}
                  />
                  {lockedUntilTomorrow ? (
                    <Text style={[styles.lockHint, { color: theme.colors.muted }]}>
                      You already completed a day of this challenge today. Come back tomorrow.
                    </Text>
                  ) : rewardsLocked ? (
                    <Text style={[styles.lockHint, { color: theme.colors.muted }]}>
                      Rewards already claimed today — you'll still advance the schedule.
                    </Text>
                  ) : null}
                </View>
              )}
            </Card>
          ) : (
            <Card>
              <Text style={[styles.dayNote, { color: theme.colors.muted }]}>
                You've cleared the schedule — outstanding.
              </Text>
            </Card>
          )}
        </Animated.View>

        {/* Active progress */}
        {isActive && progress && (
          <Animated.View entering={enter(140)}>
            <Text style={[styles.eyebrow, { color: theme.colors.primary, marginTop: spacing.md }]}>
              YOUR PROGRESS
            </Text>
            <Card elevation="glow" style={{ borderColor: theme.colors.primary }}>
              <Text style={[styles.progressStat, { color: theme.colors.text }]}>
                Day {Math.min(progress.currentDayNumber, def.totalDays)} of {def.totalDays}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.colors.mutedBg }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.colors.primary,
                      width: `${Math.round(pct * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: theme.colors.muted }]}>
                {progress.completedDays.length} workout day
                {progress.completedDays.length === 1 ? "" : "s"} done · {Math.round(pct * 100)}%
              </Text>
              {totalVolume > 0 && (
                <View
                  style={[
                    styles.volumeRow,
                    { borderTopColor: theme.colors.border },
                  ]}
                >
                  <Text style={[styles.volumeNumber, { color: theme.colors.primary }]}>
                    {totalVolume.toLocaleString()}
                  </Text>
                  <Text style={[styles.volumeLabel, { color: theme.colors.muted }]}>
                    {volumeNoun}
                  </Text>
                </View>
              )}
            </Card>
          </Animated.View>
        )}

        {/* Schedule preview */}
        <Animated.View entering={enter(220)}>
          <Text style={[styles.eyebrow, { color: theme.colors.muted, marginTop: spacing.md }]}>
            FULL SCHEDULE
          </Text>
          <Card>
            <View style={styles.grid}>
              {def.schedule.map((d) => {
                const done = progress?.completedDays.includes(d.dayNumber);
                const isCurrent =
                  isActive && progress?.currentDayNumber === d.dayNumber;
                const bg = done
                  ? theme.colors.primary
                  : isCurrent
                  ? theme.colors.accent
                  : d.isRest
                  ? "transparent"
                  : theme.colors.mutedBg;
                const borderCol = isCurrent ? theme.colors.primary : theme.colors.border;
                const txt = done
                  ? theme.colors.primaryText
                  : isCurrent
                  ? theme.colors.accentText
                  : theme.colors.text;
                const status = done
                  ? "completed"
                  : isCurrent
                  ? lockedUntilTomorrow
                    ? "current, locked until tomorrow"
                    : "current day"
                  : d.isRest
                  ? "rest day, upcoming"
                  : "upcoming";
                return (
                  <View
                    key={d.dayNumber}
                    accessibilityRole="text"
                    accessibilityLabel={`Day ${d.dayNumber}, ${status}`}
                    style={[
                      styles.dayCell,
                      {
                        backgroundColor: bg,
                        borderColor: borderCol,
                        borderStyle: d.isRest && !done ? "dashed" : "solid",
                      },
                      isCurrent && {
                        borderWidth: 2,
                        shadowColor: theme.colors.primary,
                        shadowOpacity: 0.6,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 4,
                      },
                    ]}
                  >
                    <Text style={[styles.dayCellNum, { color: txt }]}>
                      {d.dayNumber}
                    </Text>
                    {d.isRest && (
                      <Ionicons
                        name="moon"
                        size={10}
                        color={theme.colors.muted}
                        style={{ marginTop: 1 }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </Card>
        </Animated.View>

        {/* Description — hidden once active to focus on Today/Progress/Schedule */}
        {!isActive && (
          <Animated.View entering={enter(300)}>
            <Text style={[styles.eyebrow, { color: theme.colors.muted, marginTop: spacing.md }]}>
              ABOUT
            </Text>
            <Card>
              <Text style={[styles.aboutText, { color: theme.colors.text }]}>
                {def.description}
              </Text>
              <View style={styles.targetRow}>
                <Text style={[styles.targetLabel, { color: theme.colors.muted }]}>
                  Target:
                </Text>
                <Text style={[styles.targetValue, { color: theme.colors.text }]}>
                  {def.targetMuscles.join(" · ")}
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Abandon link stays inside scroll — secondary, destructive. */}
        {isActive && (
          <Pressable onPress={handleAbandon} style={styles.abandonLink}>
            <Text style={[styles.abandonText, { color: theme.colors.danger }]}>
              Abandon challenge
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Sticky Join CTA — only in preview mode so users can always act */}
      {!isActive && (
        <View
          style={[
            styles.stickyFooter,
            {
              backgroundColor: theme.colors.bg,
              borderTopColor: theme.colors.border,
              paddingBottom: insets.bottom + spacing.sm,
            },
          ]}
        >
          <Button
            label={progress ? "Switch to This Challenge" : "Join Challenge"}
            onPress={handleStart}
            disabled={loading || saving}
          />
        </View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  intro: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  tagline: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  progressStat: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 6,
  },
  restHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  dayNote: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  setsWrap: {
    gap: 6,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  setLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  setReps: {
    fontSize: 16,
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#ffffff15",
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellNum: {
    fontSize: 12,
    fontWeight: "700",
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: 6,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  targetValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  abandonLink: {
    alignItems: "center",
    padding: spacing.md,
  },
  abandonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  lockHint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  volumeRow: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    alignItems: "center",
  },
  volumeNumber: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  volumeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 2,
  },
  stickyFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
});
