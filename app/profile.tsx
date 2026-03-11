import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  Share,
  Clipboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { useProfileContext } from "../contexts/ProfileContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { useXP } from "../hooks/useXP";
import { clearAllData } from "../lib/storage";
import { spacing, radius, typography } from "../lib/theme";
import { sanitizeWeight } from "../lib/sanitizeWeight";
import { RankEvolutionPath } from "../components/RankEvolutionPath";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { useHealthKit } from "../hooks/useHealthKit";
import * as Haptics from "expo-haptics";
import { BADGE_DEFINITIONS } from "../lib/badgeService";
import type { Friend } from "../lib/types";

const BIG_4 = [
  { key: "deadlift" as const, label: "Deadlift" },
  { key: "squat" as const, label: "Squat" },
  { key: "ohp" as const, label: "Overhead Press" },
  { key: "bench" as const, label: "Bench Press" },
];

const FRIEND_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

function generateFriendCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += FRIEND_CODE_CHARS[Math.floor(Math.random() * FRIEND_CODE_CHARS.length)];
  }
  return code;
}

function calcEpley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { profile, loading: profileLoading, updateProfile } = useProfileContext();
  const { workouts, loading: workoutsLoading } = useWorkouts();
  const { xp, rank, progress, toNext } = useXP();
  const { error: hkError, available: hkAvailable, fetchWeight: hkFetchWeight } = useHealthKit();

  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  const [friendInput, setFriendInput] = useState("");
  const [friendError, setFriendError] = useState("");
  const [copyFlash, setCopyFlash] = useState(false);

  useEffect(() => {
    if (!profileLoading) {
      setName(profile.name);
      setWeight(profile.weight);
      setManualOverrides({
        deadlift: profile.manual1RM.deadlift ?? "",
        squat: profile.manual1RM.squat ?? "",
        ohp: profile.manual1RM.ohp ?? "",
        bench: profile.manual1RM.bench ?? "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when profile loads, weight changes (HealthKit sync), or 1RM changes
  }, [profileLoading, profile.weight, profile.manual1RM]);

  // Generate friend code once if missing
  useEffect(() => {
    if (!profileLoading && !profile.friendCode) {
      updateProfile({ friendCode: generateFriendCode() });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading]);

  const myCode = profile.friendCode ?? "";
  const friends: Friend[] = profile.friends ?? [];

  function handleCopyCode() {
    if (!myCode) return;
    Clipboard.setString(myCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopyFlash(true);
    setTimeout(() => setCopyFlash(false), 1500);
  }

  async function handleShareCode() {
    if (!myCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Share.share({
      message: `Add me on LockedInFIT! My friend code is: ${myCode}`,
    });
  }

  function handleAddFriend() {
    setFriendError("");
    const code = friendInput.trim().toUpperCase();
    if (!code || code.length !== 6 || !/^[A-Z0-9]{6}$/.test(code)) {
      setFriendError("Enter a valid 6-character code.");
      return;
    }
    if (code === myCode) {
      setFriendError("That's your own code!");
      return;
    }
    if (friends.some((f) => f.code === code)) {
      setFriendError("Already added.");
      return;
    }
    const newFriend: Friend = { code, addedAt: new Date().toISOString() };
    updateProfile({ friends: [...friends, newFriend] });
    setFriendInput("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleRemoveFriend(code: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateProfile({ friends: friends.filter((f) => f.code !== code) });
  }

  const estimated1RMs = useMemo(() => {
    const results: Record<string, number> = {};
    for (const lift of BIG_4) {
      // Start with the value from the ORM test (manual1RM or estimated1RM)
      const manual = parseFloat(profile.manual1RM?.[lift.key] ?? "0") || 0;
      const tested = parseFloat(profile.estimated1RM?.[lift.key] ?? "0") || 0;
      let best = Math.max(manual, tested);

      // Also check workout history — take the highest estimate
      for (const w of workouts) {
        for (const ex of w.exercises) {
          if (!ex.name.toLowerCase().includes(
            lift.key === "ohp" ? "overhead" : lift.key === "bench" ? "bench" : lift.key
          )) continue;
          for (const s of ex.sets) {
            if (!s.completed) continue;
            const wt = parseFloat(s.weight);
            const r = parseFloat(s.reps);
            if (isNaN(wt) || isNaN(r)) continue;
            const est = calcEpley(wt, r);
            if (est > best) best = est;
          }
        }
      }
      results[lift.key] = best;
    }
    return results;
  }, [workouts, profile.manual1RM, profile.estimated1RM]);

  function handleWeightBlur() {
    updateProfile({ weight });
  }

  function handleManualBlur(key: string) {
    updateProfile({
      manual1RM: { ...profile.manual1RM, [key]: manualOverrides[key] },
    });
  }

  function handleClearData() {
    Alert.alert(
      "Clear All Data",
      "This will delete all workouts, your plan, and reset the app.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            setName("");
            setWeight("");
            setManualOverrides({ deadlift: "", squat: "", ohp: "", bench: "" });
            updateProfile({
              name: "",
              weight: "",
              weightUnit: "kg",
              manual1RM: {},
            });
          },
        },
      ]
    );
  }

  if (profileLoading || workoutsLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <Skeleton.Group>
          <Skeleton.Rect width="40%" height={24} />
          <View style={{ height: 12 }} />
          <Skeleton.Card />
          <Skeleton.Card />
        </Skeleton.Group>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.profileHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[typography.title, { color: theme.colors.text, flex: 1 }]}>
          Profile
        </Text>
        <Pressable onPress={() => router.push("/settings")} style={styles.gearBtn}>
          <Text style={{ fontSize: 22, color: theme.colors.muted }}>{"⚙"}</Text>
        </Pressable>
      </View>

      {/* Section 1: Profile Card */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Your Info
        </Text>

        <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "500", marginBottom: 6 }]}>Name</Text>
        <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>{name || "—"}</Text>

        <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "500", marginBottom: 6, marginTop: spacing.md }]}>
          Body Weight
        </Text>
        {hkError ? (
          <Text style={[typography.caption, { color: theme.colors.danger, marginBottom: 6 }]}>
            {hkError}
          </Text>
        ) : null}
        <View style={styles.weightRow}>
          <TextInput
            style={[styles.input, styles.weightInput, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={weight}
            onChangeText={setWeight}
            onBlur={handleWeightBlur}
            placeholder="0"
            placeholderTextColor="#BDC4CE"
            keyboardType="numeric"
          />
          <View style={[styles.unitLabel, { backgroundColor: theme.colors.mutedBg }]}>
            <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>
              {profile.weightUnit}
            </Text>
          </View>
        </View>
      </View>

      {/* Section 2: Evolution Path */}
      <RankEvolutionPath
        currentRank={rank}
        currentXP={xp.total}
        xpForNextRank={toNext}
        progress={progress}
      />

      {/* Section 3: Badges */}
      <Pressable
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        onPress={() => router.push("/badges")}
      >
        <View style={styles.badgeCardHeader}>
          <Text style={[typography.subheading, { color: theme.colors.text }]}>Badges</Text>
          <Text style={[typography.caption, { color: theme.colors.accent, fontWeight: "700" }]}>
            {(profile.badges ?? []).length} / {BADGE_DEFINITIONS.length}
          </Text>
        </View>
        {(profile.badges ?? []).length > 0 && (
          <View style={styles.badgeIconRow}>
            {(profile.badges ?? []).slice(-4).map((b) => (
              <View key={b.id} style={styles.badgeIconCircle}>
                <Ionicons
                  name={
                    ({ footprint: "footsteps-outline", flag: "flag-outline", fire: "flame-outline", zap: "flash-outline", heart: "heart-outline", dumbbell: "barbell-outline", layers: "layers-outline", trophy: "trophy-outline", flame: "flame-outline", award: "ribbon-outline", calendar: "calendar-outline", map: "map-outline", stopwatch: "stopwatch-outline", body: "body-outline", fitness: "fitness-outline", "swap-horizontal": "swap-horizontal-outline", star: "star-outline", diamond: "diamond-outline", medal: "medal-outline" } as Record<string, any>)[b.icon] ?? "help-circle-outline"
                  }
                  size={18}
                  color={theme.colors.accent}
                />
              </View>
            ))}
          </View>
        )}
        <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.sm }]}>
          Tap to view all badges
        </Text>
      </Pressable>

      {/* Section 4: Friends */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Friends
        </Text>

        {/* Your Code */}
        <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "500", marginBottom: 6 }]}>
          Your Code
        </Text>
        <View style={styles.codeRow}>
          <View style={[styles.codeBadge, { backgroundColor: theme.colors.mutedBg }]}>
            <Text style={[styles.codeText, { color: theme.colors.accent }]}>
              {myCode || "------"}
            </Text>
          </View>
          <Pressable onPress={handleCopyCode} style={styles.iconBtn} hitSlop={8}>
            <Ionicons
              name={copyFlash ? "checkmark-circle" : "copy-outline"}
              size={22}
              color={copyFlash ? theme.colors.accent : theme.colors.muted}
            />
          </Pressable>
          <Pressable onPress={handleShareCode} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="share-outline" size={22} color={theme.colors.muted} />
          </Pressable>
        </View>

        {/* Add a Friend */}
        <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "500", marginBottom: 6, marginTop: spacing.md }]}>
          Add a Friend
        </Text>
        <View style={styles.addRow}>
          <TextInput
            style={[
              styles.input,
              styles.friendInput,
              { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: friendError ? theme.colors.danger : theme.colors.border },
            ]}
            value={friendInput}
            onChangeText={(val) => {
              setFriendInput(val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
              if (friendError) setFriendError("");
            }}
            placeholder="Enter code"
            placeholderTextColor="#BDC4CE"
            autoCapitalize="characters"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleAddFriend}
          />
          <Pressable
            onPress={handleAddFriend}
            style={[styles.addBtn, { backgroundColor: theme.colors.accent }]}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
        {friendError ? (
          <Text style={[typography.caption, { color: theme.colors.danger, marginTop: 4 }]}>
            {friendError}
          </Text>
        ) : null}

        {/* Friend List */}
        {friends.length === 0 ? (
          <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.md, textAlign: "center" }]}>
            No friends yet — share your code and add theirs!
          </Text>
        ) : (
          <View style={{ marginTop: spacing.md }}>
            {friends.map((f) => (
              <View key={f.code} style={[styles.friendRow, { borderBottomColor: theme.colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>
                    {f.nickname ?? f.code}
                  </Text>
                  {f.nickname ? (
                    <Text style={[typography.caption, { color: theme.colors.muted }]}>{f.code}</Text>
                  ) : null}
                </View>
                <Pressable onPress={() => handleRemoveFriend(f.code)} hitSlop={8}>
                  <Ionicons name="close-circle-outline" size={22} color={theme.colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Section 4: 1RM Tracker */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Big 4 Lifts — Est. 1RM
        </Text>

        {BIG_4.map((lift) => {
          const est = estimated1RMs[lift.key];
          return (
            <View key={lift.key} style={styles.liftRow}>
              <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600", marginBottom: 4 }]}>
                {lift.label}
              </Text>
              <Text style={[typography.small, { color: theme.colors.accent, fontWeight: "500", marginBottom: 4 }]}>
                {est > 0
                  ? `Est. 1RM: ${Math.round(est)} ${profile.weightUnit}`
                  : "No data yet"}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={manualOverrides[lift.key] ?? ""}
                onChangeText={(val) =>
                  setManualOverrides((prev) => ({ ...prev, [lift.key]: sanitizeWeight(val) }))
                }
                onBlur={() => handleManualBlur(lift.key)}
                placeholder={`Manual override (${profile.weightUnit})`}
                placeholderTextColor="#BDC4CE"
                keyboardType="decimal-pad"
                maxLength={6}
              />
            </View>
          );
        })}

        <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.sm, marginBottom: spacing.md }]}>
          Recalibrate your maxes to update training loads.
        </Text>
        <Button
          label="Retake 1RM Test"
          onPress={() => router.push("/orm-test?source=retake")}
          variant="secondary"
        />
      </View>

      {/* Section 5: Danger Zone */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.danger, borderWidth: 1.5 }]}>
        <Text style={[typography.subheading, { color: theme.colors.danger, marginBottom: spacing.sm }]}>
          Danger Zone
        </Text>
        <Pressable
          style={[styles.dangerButton, { backgroundColor: theme.colors.danger }]}
          onPress={handleClearData}
        >
          <Text style={[typography.body, { color: theme.colors.dangerText, fontWeight: "600" }]}>
            Clear All Data
          </Text>
        </Pressable>
      </View>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  weightInput: { flex: 1 },
  unitLabel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  liftRow: {
    marginBottom: spacing.lg,
  },
  dangerButton: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  gearBtn: {
    padding: 12,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  codeBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
  },
  codeText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 4,
    fontVariant: ["tabular-nums"],
  },
  iconBtn: {
    padding: 6,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  friendInput: {
    flex: 1,
    letterSpacing: 2,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badgeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  badgeIconRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  badgeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 135, 90, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
