import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LockeMascot } from "../Locke/LockeMascot";
import { Button } from "../Button";
import { BackButton } from "../BackButton";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useHealthKit } from "../../hooks/useHealthKit";
import { useHealthPermissions } from "../../hooks/useHealthPermissions";
import { onboardingStyles as styles } from "./shared";

type Props = {
  unit: "kg" | "lbs";
  onSynced: (weight: string) => void;
  onSkip: () => void;
  onBack: () => void;
};

/**
 * Single-screen Apple Health onboarding step.
 *
 * One tap requests ALL useful permissions (weight + workouts + HR + steps + etc.)
 * and auto-reads weight. No second "expand" screen — the benefits are shown
 * upfront so the user understands the value before connecting.
 */
export function HealthStep({ unit, onSynced, onSkip, onBack }: Props) {
  const { theme } = useAppTheme();
  const { weight, loading, error: hkError, fetchWeight } = useHealthKit();
  const { requestEnhancedPermissions } = useHealthPermissions();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const autoAdvanced = useRef(false);

  const error = connectError || hkError;

  // Auto-advance once weight is synced
  useEffect(() => {
    if (weight && !autoAdvanced.current) {
      autoAdvanced.current = true;
      const timer = setTimeout(() => onSynced(weight), 1200);
      return () => clearTimeout(timer);
    }
  }, [weight]);

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      // Request enhanced permissions (weight + workouts + HR + steps + active energy)
      // in a single dialog — no second screen needed
      const granted = await requestEnhancedPermissions();
      if (granted) {
        // Then fetch weight (uses the permissions we just requested)
        await fetchWeight(unit);
      } else {
        setConnectError("Could not connect to Apple Health. You can enable it later in Settings.");
      }
    } catch (e: any) {
      if (__DEV__) console.error("[HealthStep] connect error:", e);
      setConnectError("Could not connect to Apple Health. You can enable it later in Settings.");
    }
    setConnecting(false);
  }

  const synced = !!weight;
  const isLoading = loading || connecting;
  const mood = synced ? "celebrating" : error ? "disappointed" : "neutral";

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={healthStyles.header}>
        <BackButton onPress={onBack} />
      </View>
      <View style={healthStyles.inner}>
        <LockeMascot size={200} mood={mood} />

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
            <Text style={[healthStyles.heading, { color: theme.colors.text }]}>
              Connect Apple Health
            </Text>

            <View style={healthStyles.benefitsList}>
              <BenefitRow
                icon="scale-outline"
                text="Auto-fill your body weight"
                theme={theme}
              />
              <BenefitRow
                icon="barbell-outline"
                text="Detect workouts done outside this app"
                theme={theme}
              />
              <BenefitRow
                icon="heart-outline"
                text="Use heart rate to improve readiness scoring"
                theme={theme}
              />
              <BenefitRow
                icon="footsteps-outline"
                text="Factor in your daily activity level"
                theme={theme}
              />
            </View>

            <Text style={[healthStyles.privacy, { color: theme.colors.muted }]}>
              Your health data stays on your device and is never uploaded or shared.
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
            label="Connect Apple Health"
            onPress={handleConnect}
            loading={isLoading}
            disabled={isLoading}
          />
          <View style={{ height: 12 }} />
          <Button label="Skip" onPress={onSkip} variant="secondary" />
        </View>
      )}
    </View>
  );
}

function BenefitRow({
  icon,
  text,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  theme: any;
}) {
  return (
    <View style={healthStyles.benefitRow}>
      <Ionicons name={icon} size={20} color={theme.colors.primary} />
      <Text style={[healthStyles.benefitText, { color: theme.colors.text }]}>
        {text}
      </Text>
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
  heading: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  badge: {
    marginBottom: 8,
  },
  error: {
    fontSize: 13,
    textAlign: "center",
    marginTop: -8,
    marginBottom: 12,
  },
  benefitsList: {
    alignSelf: "stretch",
    gap: 14,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  privacy: {
    fontSize: 12,
    textAlign: "center",
  },
});
