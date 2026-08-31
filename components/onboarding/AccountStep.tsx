import { useCallback } from "react";
import { View, Text } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { LockeMascot } from "../Locke/LockeMascot";
import { Button } from "../Button";
import { StepSlide, onboardingStyles as styles } from "./shared";

type Props = {
  onComplete: () => void;
  onBack: () => void;
};

export function AccountStep({ onComplete, onBack }: Props) {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const router = useRouter();

  // Auto-proceed when the user returns from /auth already signed in
  useFocusEffect(
    useCallback(() => {
      if (user) onComplete();
    }, [user, onComplete])
  );

  return (
    <StepSlide>
      <View style={[styles.body, { backgroundColor: "transparent" }]}>
        <View style={{ alignItems: "center", marginBottom: 16, marginTop: 24 }}>
          <LockeMascot size={200} mood="celebrating" />
        </View>

        <Text style={[styles.stepEyebrow, { color: theme.colors.primary }]}>YOUR DATA</Text>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
          Keep your progress safe
        </Text>
        <Text style={[styles.stepSub, { color: theme.colors.muted }]}>
          Sign in so your workouts, XP, and streak are automatically backed up. Your data will be there whenever you need it — new phone, reinstall, anything.
        </Text>
      </View>

      <View style={[styles.bottom]}>
        <Button
          label="Sign In / Create Account"
          onPress={() => router.push("/auth")}
        />
        <View style={{ height: 12 }} />
        <Button
          label="Skip for now"
          onPress={onComplete}
          variant="secondary"
        />
        <View style={{ height: 12 }} />
        <Button label="Back" onPress={onBack} variant="secondary" />
      </View>
    </StepSlide>
  );
}
