import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Switch, Alert, Share } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppTheme } from "../contexts/ThemeContext";
import { useProfileContext } from "../contexts/ProfileContext";
import { Card } from "../components/Card";
import { BackButton } from "../components/BackButton";
import { spacing, typography } from "../lib/theme";
import {
  requestNotificationPermission,
  scheduleWorkoutReminder,
  scheduleStreakRiskReminder,
  scheduleInactivityNudge,
  cancelAllReminders,
} from "../lib/notifications";
import { isSignedIn, signOut, signInWithGoogle, getStoredEmail } from "../lib/googleAuth";
import { useAuth } from "../contexts/AuthContext";
import { deleteAccount, clearLocalData as deleteLocalData } from "../lib/accountDeletion";

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REST_TIMER_OPTIONS = [30, 60, 90, 120] as const;
const REMINDER_TIME_OPTIONS = [
  { label: "Morning", hour: 8, sublabel: "8 AM" },
  { label: "Noon", hour: 12, sublabel: "12 PM" },
  { label: "Evening", hour: 18, sublabel: "6 PM" },
  { label: "Night", hour: 21, sublabel: "9 PM" },
] as const;

function convertValue(val: string | undefined, factor: number): string {
  if (!val) return "";
  const num = parseFloat(val);
  if (isNaN(num) || num === 0) return val;
  return String(Math.round(num * factor * 10) / 10);
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { profile, updateProfile } = useProfileContext();
  const [exporting, setExporting] = useState(false);
  const { user, signOut: authSignOut } = useAuth();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

  useEffect(() => {
    isSignedIn().then(setGoogleConnected);
    getStoredEmail().then(setGoogleEmail);
  }, []);

  const restDays = profile.restDays ?? [];
  const defaultRestTimer = profile.defaultRestTimer ?? 90;
  const hapticsEnabled = profile.hapticsEnabled !== false; // default true
  const notificationsEnabled = profile.notificationsEnabled ?? false;
  const reminderHour = profile.reminderHour ?? 18;

  function handleUnitChange(newUnit: "kg" | "lbs") {
    if (newUnit === profile.weightUnit) return;
    const factor = newUnit === "lbs" ? KG_TO_LBS : LBS_TO_KG;

    const convertedWeight = convertValue(profile.weight, factor);
    const convertedManual: Record<string, string> = {};
    for (const key of ["deadlift", "squat", "ohp", "bench"] as const) {
      convertedManual[key] = convertValue(profile.manual1RM?.[key], factor);
    }
    const convertedEstimated: Record<string, string> = {};
    if (profile.estimated1RM) {
      for (const key of ["deadlift", "squat", "ohp", "bench"] as const) {
        convertedEstimated[key] = convertValue(profile.estimated1RM?.[key], factor);
      }
    }

    updateProfile({
      weightUnit: newUnit,
      weight: convertedWeight,
      manual1RM: convertedManual,
      ...(profile.estimated1RM ? { estimated1RM: convertedEstimated } : {}),
    });
  }

  function toggleRestDay(day: number) {
    const next = restDays.includes(day) ? restDays.filter((d) => d !== day) : [...restDays, day];
    updateProfile({ restDays: next });
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys.filter((k) => k.startsWith("@lockedinfit/")));
      const data: Record<string, unknown> = {};
      for (const [key, value] of stores) {
        try { data[key] = value ? JSON.parse(value) : null; } catch { data[key] = value; }
      }
      const json = JSON.stringify(data, null, 2);
      await Share.share({ message: json, title: "LockedInFIT Data Export" });
    } catch {
      Alert.alert("Export Failed", "Could not export data.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.title, { color: theme.colors.text }]}>Settings</Text>
      </View>

      {/* Appearance */}
      <Card>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Appearance
        </Text>
        <View style={styles.row}>
          <Text style={[typography.body, { color: theme.colors.text }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#ffffff"
          />
        </View>
      </Card>

      {/* Preferences */}
      <Card>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Preferences
        </Text>
        <View style={styles.row}>
          <Text style={[typography.body, { color: theme.colors.text }]}>Weight Unit</Text>
          <View style={[styles.segmentedControl, { backgroundColor: theme.colors.mutedBg }]}>
            {(["kg", "lbs"] as const).map((u) => {
              const active = profile.weightUnit === u;
              return (
                <Pressable
                  key={u}
                  style={[
                    styles.segment,
                    { backgroundColor: active ? theme.colors.primary : "transparent" },
                  ]}
                  onPress={() => handleUnitChange(u)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? theme.colors.primaryText : theme.colors.muted },
                    ]}
                  >
                    {u.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.row}>
          <Text style={[typography.body, { color: theme.colors.text }]}>Haptics</Text>
          <Switch
            value={hapticsEnabled}
            onValueChange={(val) => updateProfile({ hapticsEnabled: val })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#ffffff"
          />
        </View>
      </Card>

      {/* Rest Timer */}
      <Card>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Rest Timer Default
        </Text>
        <View style={styles.timerRow}>
          {REST_TIMER_OPTIONS.map((sec) => {
            const active = defaultRestTimer === sec;
            return (
              <Pressable
                key={sec}
                style={[styles.timerChip, { backgroundColor: active ? theme.colors.primary : theme.colors.mutedBg, borderColor: active ? theme.colors.primary : theme.colors.border }]}
                onPress={() => updateProfile({ defaultRestTimer: sec })}
              >
                <Text style={[styles.timerChipText, { color: active ? theme.colors.primaryText : theme.colors.text }]}>
                  {sec}s
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Rest Days */}
      <Card>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: 4 }]}>
          Rest Days
        </Text>
        <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: spacing.sm }]}>
          Your streak won't break on rest days
        </Text>
        <View style={styles.daysRow}>
          {DAY_LABELS.map((label, idx) => {
            const active = restDays.includes(idx);
            return (
              <Pressable
                key={idx}
                style={[styles.dayChip, { backgroundColor: active ? theme.colors.primary : theme.colors.mutedBg, borderColor: active ? theme.colors.primary : theme.colors.border }]}
                onPress={() => toggleRestDay(idx)}
              >
                <Text style={[styles.dayChipText, { color: active ? theme.colors.primaryText : theme.colors.text }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Notifications */}
      <Card>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Notifications
        </Text>
        <View style={styles.row}>
          <Text style={[typography.body, { color: theme.colors.text }]}>Workout Reminder</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={async (val) => {
              if (val) {
                const granted = await requestNotificationPermission();
                if (!granted) {
                  Alert.alert("Notifications Disabled", "Enable notifications in your device settings.");
                  return;
                }
                await scheduleWorkoutReminder(reminderHour);
                await scheduleStreakRiskReminder();
                await scheduleInactivityNudge();
              } else {
                await cancelAllReminders();
              }
              updateProfile({ notificationsEnabled: val });
            }}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Reminder time picker — only shown when notifications are on */}
        {notificationsEnabled && (
          <View style={{ marginTop: spacing.sm }}>
            <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: 8 }]}>
              Reminder Time
            </Text>
            <View style={styles.timerRow}>
              {REMINDER_TIME_OPTIONS.map((opt) => {
                const active = reminderHour === opt.hour;
                return (
                  <Pressable
                    key={opt.hour}
                    style={[
                      styles.timerChip,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.mutedBg,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={async () => {
                      updateProfile({ reminderHour: opt.hour });
                      await scheduleWorkoutReminder(opt.hour);
                    }}
                  >
                    <Text
                      style={[
                        styles.timerChipText,
                        { color: active ? theme.colors.primaryText : theme.colors.text, fontSize: 12 },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={{
                        color: active ? theme.colors.primaryText : theme.colors.muted,
                        fontSize: 10,
                        fontWeight: "600",
                        marginTop: 2,
                      }}
                    >
                      {opt.sublabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.sm }]}>
          {notificationsEnabled
            ? `Daily reminder at ${REMINDER_TIME_OPTIONS.find((o) => o.hour === reminderHour)?.sublabel ?? "6 PM"} + streak alert at 8 PM`
            : "Enable for daily reminders + streak-at-risk alerts"}
        </Text>
      </Card>

      {/* Data */}
      <Card>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Data
        </Text>
        <Pressable style={styles.row} onPress={handleExport}>
          <Text style={[typography.body, { color: theme.colors.text }]}>Export All Data</Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>{exporting ? "Exporting…" : "JSON"}</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push("/onboarding?retake=1")}>
          <Text style={[typography.body, { color: theme.colors.text }]}>Retake 1RM Setup</Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>→</Text>
        </Pressable>
      </Card>

      {/* LockedInFIT Account */}
      <Card>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          LockedInFIT Account
        </Text>
        {user ? (
          <>
            <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: spacing.sm }]}>
              {user.email}
            </Text>
            <Pressable
              style={styles.row}
              onPress={() => {
                Alert.alert("Sign Out?", "You can sign back in any time.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: () => authSignOut(),
                  },
                ]);
              }}
            >
              <Text style={[typography.body, { color: theme.colors.danger }]}>Sign Out</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.row} onPress={() => router.push("/auth")}>
            <Text style={[typography.body, { color: theme.colors.primary }]}>Sign In / Sign Up</Text>
            <Text style={[typography.caption, { color: theme.colors.muted }]}>→</Text>
          </Pressable>
        )}
      </Card>

      {/* Google Account */}
      <Card>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Google Account
        </Text>
        {googleConnected ? (
          <>
            {googleEmail && (
              <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: spacing.sm }]}>
                {googleEmail}
              </Text>
            )}
            <Pressable
              style={styles.row}
              onPress={async () => {
                await signOut();
                try {
                  await signInWithGoogle();
                  const email = await getStoredEmail();
                  setGoogleEmail(email);
                  setGoogleConnected(true);
                } catch {
                  setGoogleConnected(false);
                  setGoogleEmail(null);
                }
              }}
            >
              <Text style={[typography.body, { color: theme.colors.text }]}>Switch Account</Text>
              <Text style={[typography.caption, { color: theme.colors.muted }]}>→</Text>
            </Pressable>
            <Pressable
              style={styles.row}
              onPress={() => {
                Alert.alert("Disconnect Google?", "You'll need to sign in again to import from Drive.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Disconnect",
                    style: "destructive",
                    onPress: async () => {
                      await signOut();
                      setGoogleConnected(false);
                      setGoogleEmail(null);
                    },
                  },
                ]);
              }}
            >
              <Text style={[typography.body, { color: theme.colors.danger }]}>Disconnect</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={styles.row}
            onPress={async () => {
              try {
                const result = await signInWithGoogle();
                setGoogleConnected(true);
                setGoogleEmail(result.email);
              } catch {
                // user cancelled or error
              }
            }}
          >
            <Text style={[typography.body, { color: theme.colors.primary }]}>Connect Google Account</Text>
            <Text style={[typography.caption, { color: theme.colors.muted }]}>→</Text>
          </Pressable>
        )}
      </Card>

      {/* Legal */}
      <Text style={[typography.subheading, { color: theme.colors.muted, marginTop: spacing.lg, marginBottom: spacing.xs }]}>Legal</Text>
      <Card style={{ marginTop: spacing.xs }}>
        <Pressable style={styles.row} onPress={() => router.push("/legal?doc=privacy")}>
          <Text style={[typography.body, { color: theme.colors.text }]}>Privacy Policy</Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>→</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push("/legal?doc=tos")}>
          <Text style={[typography.body, { color: theme.colors.text }]}>Terms of Service</Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>→</Text>
        </Pressable>
      </Card>

      {/* Danger Zone */}
      <Text style={[typography.subheading, { color: theme.colors.danger, marginTop: spacing.lg, marginBottom: spacing.xs }]}>Danger Zone</Text>
      <Card style={{ marginTop: spacing.xs }}>
        <Pressable
          style={styles.row}
          onPress={() => {
            Alert.alert(
              user ? "Delete Account?" : "Delete All Data?",
              user
                ? "This will permanently delete your account and all associated data. This action cannot be undone."
                : "This will permanently delete all your local data including workouts, plans, and progress. This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      if (user) {
                        await deleteAccount(user.uid);
                      } else {
                        await deleteLocalData();
                      }
                      router.replace("/onboarding");
                    } catch (e: any) {
                      Alert.alert("Error", e?.message ?? "Failed to delete data. Try again.");
                    }
                  },
                },
              ]
            );
          }}
        >
          <Text style={[typography.body, { color: theme.colors.danger }]}>{user ? "Delete Account" : "Delete All Data"}</Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>→</Text>
        </Pressable>
      </Card>

      {/* Version */}
      <Text style={[styles.version, { color: theme.colors.muted }]}>LockedInFIT v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.lg },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
  },
  timerRow: {
    flexDirection: "row",
    gap: 8,
  },
  timerChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  timerChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    marginTop: spacing.lg,
  },
});
