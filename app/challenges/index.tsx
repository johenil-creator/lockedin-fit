import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAppTheme } from "../../contexts/ThemeContext";
import { BackButton } from "../../components/BackButton";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { LockeMascot } from "../../components/Locke/LockeMascot";
import { useChallenge } from "../../hooks/useChallenge";
import {
  CHALLENGE_CATALOG,
  challengeUnit,
  totalChallengeVolume,
} from "../../lib/challengeCatalog";
import { workDayProgressPct } from "../../lib/challengeService";
import { spacing, radius, typography } from "../../lib/theme";
import type { ChallengeDefinition } from "../../lib/types";

export default function ChallengesBrowseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { progress, def, currentDay, history, loading } = useChallenge();

  const activeChallengeId = progress?.challengeId ?? null;

  function openChallenge(id: string) {
    router.push(`/challenges/${id}`);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.heading, { color: theme.colors.text, marginLeft: spacing.sm }]}>
          30-Day Challenges
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro with Locke */}
        <View style={styles.intro}>
          <LockeMascot size={140} mood="encouraging" />
          <Text style={[styles.introTitle, { color: theme.colors.text }]}>
            30-Day Calisthenics
          </Text>
          <Text style={[styles.introSub, { color: theme.colors.muted }]}>
            Pick one. Show up every day. Let the reps do the work.
          </Text>
        </View>

        {/* Active challenge (if any) */}
        {progress && def && (
          <Animated.View entering={FadeInDown.delay(80).duration(300)}>
            <Text style={[styles.sectionLabel, { color: theme.colors.primary }]}>
              ACTIVE CHALLENGE
            </Text>
            <ActiveChallengeCard
              def={def}
              dayNumber={progress.currentDayNumber}
              pct={workDayProgressPct(progress, def)}
              restToday={currentDay?.isRest ?? false}
              onOpen={() => openChallenge(def.id)}
            />
          </Animated.View>
        )}

        {/* Catalog */}
        <Animated.View entering={FadeInDown.delay(160).duration(300)}>
          <Text style={[styles.sectionLabel, { color: theme.colors.muted, marginTop: spacing.lg }]}>
            {progress ? "OTHER CHALLENGES" : "CHOOSE A CHALLENGE"}
          </Text>
          {CHALLENGE_CATALOG.map((c) => (
            <CatalogCard
              key={c.id}
              def={c}
              isActive={c.id === activeChallengeId}
              onPress={() => openChallenge(c.id)}
            />
          ))}
        </Animated.View>

        {/* History */}
        {history.length > 0 && (
          <Animated.View entering={FadeInDown.delay(240).duration(300)}>
            <Text style={[styles.sectionLabel, { color: theme.colors.muted, marginTop: spacing.lg }]}>
              COMPLETED
            </Text>
            {history.map((h, i) => {
              const hDef = CHALLENGE_CATALOG.find((c) => c.id === h.challengeId);
              return (
                <Card key={`${h.challengeId}-${i}`} style={styles.historyCard}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="trophy"
                      size={18}
                      color="#FFD60A"
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.historyTitle, { color: theme.colors.text }]}>
                        {hDef?.title ?? h.challengeId}
                      </Text>
                      <Text style={[styles.historyMeta, { color: theme.colors.muted }]}>
                        {h.totalDaysCompleted} workout days · finished{" "}
                        {new Date(h.completedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </Animated.View>
        )}

        {loading && (
          <Text style={[styles.loadingText, { color: theme.colors.muted }]}>
            Loading…
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

// ── Active challenge card ────────────────────────────────────────────────────

function ActiveChallengeCard({
  def,
  dayNumber,
  pct,
  restToday,
  onOpen,
}: {
  def: ChallengeDefinition;
  dayNumber: number;
  pct: number;
  restToday: boolean;
  onOpen: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <Card
      elevation="glow"
      style={{ borderColor: theme.colors.primary }}
    >
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
        {def.title}
      </Text>
      <Text style={[styles.cardSub, { color: theme.colors.muted }]}>
        Day {Math.min(dayNumber, def.totalDays)} of {def.totalDays}
        {restToday ? " · rest day" : ""}
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
        {Math.round(pct * 100)}% complete
      </Text>

      <View style={{ marginTop: spacing.sm }}>
        <Button label={restToday ? "View Rest Day" : "Continue Today"} onPress={onOpen} />
      </View>
    </Card>
  );
}

// ── Catalog card ─────────────────────────────────────────────────────────────

function CatalogCard({
  def,
  isActive,
  onPress,
}: {
  def: ChallengeDefinition;
  isActive: boolean;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const unit = challengeUnit(def);
  const volume = totalChallengeVolume(def);
  return (
    <Pressable onPress={onPress}>
      <Card
        style={{
          borderColor: isActive ? theme.colors.primary : theme.colors.border,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {def.title}
            </Text>
            <Text style={[styles.cardTagline, { color: theme.colors.muted }]} numberOfLines={2}>
              {def.tagline}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </View>

        <View style={styles.metaRow}>
          <MetaPill icon="calendar-outline" label={`${def.totalDays} days`} />
          <MetaPill icon="barbell-outline" label={def.difficulty} />
          <MetaPill
            icon="flame-outline"
            label={`${volume.toLocaleString()} ${unit}`}
          />
        </View>
      </Card>
    </Pressable>
  );
}

function MetaPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.colors.mutedBg }]}>
      <Ionicons name={icon} size={12} color={theme.colors.muted} />
      <Text style={[styles.pillText, { color: theme.colors.muted }]}>{label}</Text>
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
    paddingVertical: spacing.md,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  introSub: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  cardTagline: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
    gap: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  historyCard: {
    paddingVertical: spacing.sm,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  historyMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingText: {
    fontSize: 13,
    textAlign: "center",
    padding: spacing.md,
  },
});
