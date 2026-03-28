import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { BackButton } from "../components/BackButton";
import { useAuth } from "../contexts/AuthContext";
import { useProfileContext } from "../contexts/ProfileContext";
import { useXP } from "../hooks/useXP";
import { useHealthKit } from "../hooks/useHealthKit";
import { useFangs } from "../hooks/useFangs";
import { FangsDisplay } from "../components/social/FangsDisplay";
import { useAdWatch } from "../hooks/useAdWatch";
import { usePack } from "../hooks/usePack";
import { loadLockeCustomization, getLockeCustomizationSync, hasLockeCustomization } from "../lib/storage";
import { updatePublicProfile } from "../lib/publicProfileService";
import { LockeAvatarBuilder } from "../components/avatar/LockeAvatarBuilder";
import { spacing, radius, typography } from "../lib/theme";
import { rankDisplayName } from "../lib/rankService";
import type { LockeCustomization } from "../lib/types";

const FRIEND_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateFriendCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += FRIEND_CODE_CHARS[Math.floor(Math.random() * FRIEND_CODE_CHARS.length)];
  }
  return code;
}

// ── Nav Card ──────────────────────────────────────────────────────────────────

type NavCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string;
  iconColor?: string;
};

function NavCard({ icon, label, subtitle, onPress, badge, iconColor }: NavCardProps) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      style={[styles.navCard, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      accessibilityLabel={`${label}${subtitle ? `, ${subtitle}` : ""}`}
      accessibilityRole="button"
    >
      <View style={[styles.navIcon, { backgroundColor: (iconColor ?? theme.colors.primary) + "18" }]}>
        <Ionicons name={icon} size={20} color={iconColor ?? theme.colors.primary} />
      </View>
      <View style={styles.navContent}>
        <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: theme.colors.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <Text style={[typography.caption, { color: theme.colors.accent, fontWeight: "700", marginRight: 4 }]}>
          {badge}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
    </Pressable>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfileContext();
  const { xp, rank } = useXP();
  const { error: hkError } = useHealthKit();
  const { balance: fangsBalance } = useFangs();
  const adWatch = useAdWatch();
  const { pack, refresh: refreshPack } = usePack();
  const [weight, setWeight] = useState("");
  const [lockeCustomization, setLockeCustomization] = useState<LockeCustomization>(getLockeCustomizationSync());
  const [isPublicProfile, setIsPublicProfile] = useState(false);

  useEffect(() => {
    if (!profileLoading) {
      setWeight(profile.weight);
    }
  }, [profileLoading, profile.weight]);

  useEffect(() => {
    if (!profileLoading && !profile.friendCode) {
      updateProfile({ friendCode: generateFriendCode() });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading]);

  // Load customization on mount
  useEffect(() => {
    loadLockeCustomization().then(setLockeCustomization);
  }, []);

  // Refresh on focus (coming back from studio)
  useFocusEffect(
    useCallback(() => {
      loadLockeCustomization().then(setLockeCustomization);
      refreshPack();
    }, [refreshPack])
  );

  function handleWeightBlur() {
    updateProfile({ weight });
  }

  const badgeCount = (profile.badges ?? []).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.profileHeader}>
        <BackButton />
        <Text style={[typography.title, { color: theme.colors.text, flex: 1, marginLeft: 8 }]}>
          Profile
        </Text>
      </View>

      {/* ── Profile Identity Card ─────────────────────────────────────── */}
      <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.summaryRow}>
          <View style={[styles.avatarFrame, { borderColor: theme.colors.primary + "50" }]}>
            {hasLockeCustomization() ? (
              <LockeAvatarBuilder size={70} customization={lockeCustomization} animated={false} />
            ) : (
              <Image
                source={require("../assets/avatar/layers/base/master_base.png")}
                style={{ width: 70, height: 105 }}
                resizeMode="contain"
                fadeDuration={0}
              />
            )}
          </View>
          <View style={styles.summaryInfo}>
            <Text style={[styles.heroName, { color: theme.colors.text }]}>
              {profile.name || "Wolf"}
            </Text>
            <View style={[styles.rankPill, { backgroundColor: theme.colors.primary + "15", borderColor: theme.colors.primary + "40" }]}>
              <Text style={[styles.rankPillText, { color: theme.colors.primary }]}>
                {rankDisplayName(rank)}
              </Text>
            </View>
            <FangsDisplay balance={fangsBalance} size="sm" showInfo />
            {adWatch.canWatch && (
              <Pressable onPress={adWatch.watchAd} disabled={!adWatch.adReady && !__DEV__} hitSlop={8} style={{ opacity: (adWatch.adReady || __DEV__) ? 1 : 0.5 }}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: "#FFD70099", marginTop: -1 }}>
                  Watch to earn Fangs · {adWatch.remaining} left
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* ── Stats & Settings Card ─────────────────────────────────────── */}
      <View style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
        {/* Weight */}
        <View style={styles.weightSection}>
          <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "500", marginBottom: 4 }]}>
            Body Weight
          </Text>
          {hkError ? (
            <Text style={[typography.caption, { color: theme.colors.danger, marginBottom: 4 }]}>
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

        {/* Public Profile Toggle */}
        {user && (
          <View style={[styles.publicProfileRow, { borderTopColor: theme.colors.border }]}>
            <View style={styles.publicProfileInfo}>
              <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>
                Public Profile
              </Text>
              <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.xs }]}>
                Let others see your stats and badges
              </Text>
            </View>
            <Switch
              value={isPublicProfile}
              onValueChange={(val) => {
                setIsPublicProfile(val);
                updatePublicProfile(user.uid, {
                  displayName: profile.name || "Anonymous",
                  rank,
                  totalXp: xp.total,
                  totalWorkouts: 0,
                  badges: profile.badges ?? [],
                }).catch(() => setIsPublicProfile(!val));
              }}
              trackColor={{ false: theme.colors.mutedBg, true: theme.colors.accent + "60" }}
              thumbColor={isPublicProfile ? theme.colors.accent : theme.colors.muted}
            />
          </View>
        )}
      </View>

      {/* ── Navigation Cards ────────────────────────────────────────────── */}
      <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "600", letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.sm }]}>
        CUSTOMIZE
      </Text>

      <NavCard
        icon="color-palette-outline"
        label="Avatar Studio"
        subtitle="Customize your wolf avatar"
        onPress={() => router.push("/locke-studio")}
        iconColor={theme.colors.accent}
      />

      <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "600", letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg }]}>
        SOCIAL
      </Text>

      <NavCard
        icon="people-outline"
        label="The Den"
        subtitle="Friends, challenges & community"
        onPress={() => router.push("/friends")}
      />

      <NavCard
        icon="paw-outline"
        label="Pack"
        subtitle={pack ? pack.name : "Join or create a pack"}
        onPress={() => router.push(pack ? "/pack-detail" : "/create-pack")}
      />

      {!pack && (
        <NavCard
          icon="search-outline"
          label="Scout Packs"
          subtitle="Browse and join public packs"
          onPress={() => router.push("/pack-discovery")}
          iconColor={theme.colors.muted}
        />
      )}

      <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "600", letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg }]}>
        TRAINING
      </Text>

      <NavCard
        icon="barbell-outline"
        label="Big 4 Lifts"
        subtitle="Estimated 1RM & manual overrides"
        onPress={() => router.push("/lifts")}
      />

      <NavCard
        icon="shield-outline"
        label="Evolution Path"
        subtitle={`${rankDisplayName(rank)} — ${badgeCount} badges earned`}
        onPress={() => router.push("/evolution")}
      />

      <NavCard
        icon="settings-outline"
        label="Settings"
        subtitle="Theme, units, data & more"
        onPress={() => router.push("/settings")}
        iconColor={theme.colors.muted}
      />

      <View style={{ height: spacing.xl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  summaryCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarFrame: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 4,
    overflow: "hidden",
  },
  summaryInfo: {
    flex: 1,
    gap: 6,
    alignItems: "flex-start",
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
  },
  rankPill: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  rankPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statsCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  weightSection: {},
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
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  publicProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  publicProfileInfo: {
    flex: 1,
  },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  navContent: {
    flex: 1,
  },
});
