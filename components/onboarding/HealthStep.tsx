import { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LockeMascot } from "../Locke/LockeMascot";
import { Button } from "../Button";
import { BackButton } from "../BackButton";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useHealthKit } from "../../hooks/useHealthKit";
import { onboardingStyles as styles } from "./shared";

type Props = {
  unit: "kg" | "lbs";
  onSynced: (weight: string) => void;
  onSkip: () => void;
  onBack: () => void;
};

export function HealthStep({ unit, onSynced, onSkip, onBack }: Props) {
  const { theme } = useAppTheme();
  const { weight, loading, error, fetchWeight } = useHealthKit();
  const autoAdvanced = useRef(false);

  useEffect(() => {
    if (weight && !autoAdvanced.current) {
      autoAdvanced.current = true;
      const timer = setTimeout(() => onSynced(weight), 1200);
      return () => clearTimeout(timer);
    }
  }, [weight]);

  async function handleSync() {
    const w = await fetchWeight(unit);
    // success/error states handled via hook — auto-advance in useEffect
  }

  const synced = !!weight;
  const mood = synced ? "celebrating" : error ? "disappointed" : "neutral";

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={healthStyles.header}>
        <BackButton onPress={onBack} />
      </View>
      <View style={healthStyles.inner}>
        <LockeMascot size={240} mood={mood} />

        {synced ? (
          <>
            <View style={healthStyles.badge}>
              <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
            </View>
            <Text style={[healthStyles.heading, { color: theme.colors.text }]}>
              {weight} {unit} synced
            </Text>
          </>
        ) : (
          <>
            <Text style={[healthStyles.microcopy, { color: theme.colors.muted }]}>
              We only read your body weight — nothing is written to Health.
            </Text>
            <Text style={[healthStyles.heading, { color: theme.colors.text }]}>
              Sync with Apple Health?
            </Text>
          </>
        )}

        {error && (
          <Text style={[healthStyles.error, { color: theme.colors.danger }]}>
            {error}
          </Text>
        )}
      </View>

      {!synced && (
        <View style={styles.bottom}>
          <Button
            label="Sync with Apple Health"
            onPress={handleSync}
            loading={loading}
            disabled={loading}
          />
          <View style={{ height: 12 }} />
          <Button label="Skip" onPress={onSkip} variant="secondary" />
        </View>
      )}
    </View>
  );
}

const healthStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  microcopy: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },
  badge: {
    marginBottom: 8,
  },
  error: {
    fontSize: 13,
    textAlign: "center",
    marginTop: -12,
    marginBottom: 12,
  },
});
