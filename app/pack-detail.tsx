import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  Clipboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { BackButton } from "../components/BackButton";
import { useAuth } from "../contexts/AuthContext";
import { usePack } from "../hooks/usePack";
import { usePackChallenge } from "../hooks/usePackChallenge";
import { usePackLeaderboard } from "../hooks/usePackLeaderboard";
import { PackMemberRow } from "../components/social/PackMemberRow";
import { PackChallengeCard } from "../components/social/PackChallengeCard";
import { PackLeaderboardCard } from "../components/social/PackLeaderboardCard";
import { PackWarCard } from "../components/pack/PackWarCard";
import { PackBossCard } from "../components/pack/PackBossCard";
import { PackLevelBadge } from "../components/pack/PackLevelBadge";
import { PackAchievementGrid } from "../components/pack/PackAchievementGrid";
import { usePackWar } from "../hooks/usePackWar";
import { usePackBoss } from "../hooks/usePackBoss";
import { usePackLevel } from "../hooks/usePackLevel";
import { usePackAchievements } from "../hooks/usePackAchievements";
import { spacing, typography, radius } from "../lib/theme";
import { impact, notification, ImpactStyle, NotificationType } from "../lib/haptics";
import { togglePackVisibility } from "../lib/packDiscoveryService";

export default function PackDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { pack, members, loading, leave, refresh } = usePack();
  const { challenge, create: createChallenge, refresh: refreshChallenge } = usePackChallenge(pack?.id ?? null);
  const { entries: leaderboardEntries } = usePackLeaderboard();
  const { war, requestWar, warLoading } = usePackWar();
  const { boss, spawnBoss, contributions, bossLoading } = usePackBoss();
  const { level: packLevel, totalXp: packTotalXp, memberCap, perks } = usePackLevel();
  const { achievements } = usePackAchievements();
  const [copyFlash, setCopyFlash] = useState(false);
  const [isPublic, setIsPublic] = useState(pack?.isPublic ?? false);
  const [segment, setSegment] = useState<"overview" | "battles" | "challenge" | "board">("overview");
  useEffect(() => { refresh(); }, []);

  // Sync public state when pack data loads/changes
  useEffect(() => {
    if (pack) setIsPublic(pack.isPublic ?? false);
  }, [pack]);

  async function handleTogglePublic(value: boolean) {
    if (!pack) return;
    setIsPublic(value);
    try {
      await togglePackVisibility(pack.id, value);
    } catch {
      setIsPublic(!value);
      Alert.alert("Error", "Could not update pack visibility.");
    }
  }

  function handleCopyCode() {
    if (!pack) return;
    Clipboard.setString(pack.code);
    notification(NotificationType.Success);
    setCopyFlash(true);
    setTimeout(() => setCopyFlash(false), 1500);
  }

  function handleLeave() {
    Alert.alert(
      "Leave Pack?",
      "You will lose access to this pack's challenges and leaderboard.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            const success = await leave();
            if (success) {
              notification(NotificationType.Success);
              router.back();
            }
          },
        },
      ]
    );
  }

  if (loading || !pack) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <BackButton />
          <Text style={[typography.heading, { color: theme.colors.text }]}>Pack</Text>
        </View>
      </View>
    );
  }

  const isLeader = pack.role === "leader";

  const segments = [
    { key: "overview" as const, label: "Overview" },
    { key: "battles" as const, label: "Battles" },
    { key: "challenge" as const, label: "Challenge" },
    { key: "board" as const, label: "Board" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.md, paddingTop: spacing.sm }]}>
        <BackButton />
        <Text style={[typography.heading, { color: theme.colors.text, flex: 1, marginLeft: spacing.sm }]}>
          {pack.name}
        </Text>
      </View>

      {/* Segmented Toggle */}
      <View style={[styles.segmentScroll, { marginBottom: spacing.sm }]}>
        <View style={[styles.segmentRow, { backgroundColor: theme.colors.mutedBg }]}>
          {segments.map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                styles.segmentPill,
                segment === tab.key && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setSegment(tab.key)}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: segment === tab.key ? theme.colors.primaryText : theme.colors.muted },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Segment content */}
      <ScrollView contentContainerStyle={styles.content}>
          {segment === "overview" && (
            <>
              {/* Pack info card */}
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                {pack.motto ? (
                  <Text style={[typography.body, { color: theme.colors.muted, fontStyle: "italic", marginBottom: spacing.sm }]}>
                    "{pack.motto}"
                  </Text>
                ) : null}

                <View style={styles.statsGrid}>
                  <View style={styles.stat}>
                    <Text style={[typography.caption, { color: theme.colors.muted }]}>Members</Text>
                    <Text style={[typography.heading, { color: theme.colors.text }]}>{pack.memberCount}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[typography.caption, { color: theme.colors.muted }]}>Weekly XP</Text>
                    <Text style={[typography.heading, { color: theme.colors.accent }]}>{pack.weeklyXp}</Text>
                  </View>
                </View>

                {/* Invite code */}
                <View style={styles.inviteRow}>
                  <Text style={[typography.small, { color: theme.colors.muted }]}>Pack Code:</Text>
                  <View style={[styles.codeBadge, { backgroundColor: theme.colors.mutedBg }]}>
                    <Text style={[styles.codeText, { color: theme.colors.accent }]}>
                      {pack.code}
                    </Text>
                  </View>
                  <Pressable onPress={handleCopyCode} hitSlop={8}>
                    <Ionicons
                      name={copyFlash ? "checkmark-circle" : "copy-outline"}
                      size={20}
                      color={copyFlash ? theme.colors.accent : theme.colors.muted}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Public toggle — leader only */}
              {isLeader && (
                <View style={[styles.toggleRow, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[typography.body, { color: theme.colors.text, flex: 1 }]}>Public Pack</Text>
                  <Switch
                    value={isPublic}
                    onValueChange={handleTogglePublic}
                    trackColor={{ false: theme.colors.mutedBg, true: theme.colors.accent }}
                  />
                </View>
              )}

              {/* Pack Level Badge */}
              <View style={[styles.card, { backgroundColor: theme.colors.surface, alignItems: "center" }]}>
                <PackLevelBadge level={packLevel} totalXp={packTotalXp} />
                <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.xs }]}>
                  {memberCap} member cap
                </Text>
              </View>

              {/* Pack Achievements */}
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
                  Achievements
                </Text>
                <PackAchievementGrid achievements={achievements} />
              </View>

              {/* Members */}
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
                  Members
                </Text>
                {members.map((member) => (
                  <PackMemberRow
                    key={member.userId}
                    member={member}
                    isLeader={member.role === "leader"}
                  />
                ))}
              </View>

              {/* Leave pack */}
              <Pressable
                style={[styles.leaveBtn, { borderColor: theme.colors.danger }]}
                onPress={handleLeave}
              >
                <Text style={[typography.body, { color: theme.colors.danger, fontWeight: "600" }]}>
                  Leave Pack
                </Text>
              </Pressable>
            </>
          )}

          {segment === "battles" && (
            <>
              {/* Pack War */}
              {war ? (
                <PackWarCard war={war} />
              ) : isLeader ? (
                <Pressable
                  style={[styles.card, { backgroundColor: theme.colors.surface, alignItems: "center" }]}
                  onPress={() => requestWar()}
                >
                  <Ionicons name="flash" size={24} color={theme.colors.accent} />
                  <Text style={[typography.body, { color: theme.colors.accent, fontWeight: "700", marginTop: spacing.xs }]}>
                    Start Pack War
                  </Text>
                </Pressable>
              ) : (
                <View style={[styles.card, { backgroundColor: theme.colors.surface, alignItems: "center" }]}>
                  <Ionicons name="flash-outline" size={24} color={theme.colors.muted} />
                  <Text style={[typography.body, { color: theme.colors.muted, marginTop: spacing.xs }]}>
                    No active pack war
                  </Text>
                </View>
              )}

              {/* Pack Boss */}
              {boss && boss.status === "active" ? (
                <PackBossCard boss={boss} contributions={contributions} />
              ) : isLeader ? (
                <Pressable
                  style={[styles.card, { backgroundColor: theme.colors.surface, alignItems: "center" }]}
                  onPress={() => {
                    if (pack) spawnBoss(0, pack.memberCount);
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{"\uD83D\uDC09"}</Text>
                  <Text style={[typography.body, { color: theme.colors.accent, fontWeight: "700", marginTop: spacing.xs }]}>
                    Spawn Boss
                  </Text>
                </Pressable>
              ) : (
                <View style={[styles.card, { backgroundColor: theme.colors.surface, alignItems: "center" }]}>
                  <Text style={{ fontSize: 28 }}>{"\uD83D\uDC09"}</Text>
                  <Text style={[typography.body, { color: theme.colors.muted, marginTop: spacing.xs }]}>
                    No active boss
                  </Text>
                </View>
              )}
            </>
          )}

          {segment === "challenge" && (
            <PackChallengeCard
              challenge={challenge}
              isLeader={isLeader}
              onCreate={createChallenge}
            />
          )}

          {segment === "board" && (
            <PackLeaderboardCard
              entries={leaderboardEntries}
              userPackId={pack.id}
            />
          )}

          <View style={{ height: insets.bottom + spacing.xl }} />
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  // ── Segmented toggle ────────────────────────────────────────────────
  segmentScroll: {
    paddingHorizontal: spacing.md,
  },
  segmentRow: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 3,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.md - 2,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // ── Cards ───────────────────────────────────────────────────────────
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  codeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  codeText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 3,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  leaveBtn: {
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: "center",
  },
});
