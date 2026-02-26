import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../Button";
import { useAppTheme } from "../../contexts/ThemeContext";
import { StepSlide, onboardingStyles as styles } from "./shared";

type Props = {
  onManual: () => void;
  onSkip: () => void;
};

export function ExplainStep({ onManual, onSkip }: Props) {
  const { theme } = useAppTheme();
  const router = useRouter();
  return (
    <StepSlide>
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.body}>
          <Text style={[styles.stepEyebrow, { color: theme.colors.primary }]}>SETUP</Text>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>What's a 1RM?</Text>
          <Text style={[styles.explainText, { color: theme.colors.muted }]}>
            Your <Text style={{ color: theme.colors.text, fontWeight: "700" }}>1-Rep Max (1RM)</Text> is
            the maximum weight you can lift for a single rep on a given exercise.
          </Text>
          <Text style={[styles.explainText, { color: theme.colors.muted }]}>
            We use it to set intelligent load targets in your plans, track progress over time,
            and award PRs when you break your personal records.
          </Text>
          <Text style={[styles.explainText, { color: theme.colors.muted }]}>
            You don't need to test your true max — enter any weight and rep count and we'll
            estimate it using the Epley formula.
          </Text>
        </View>

        <View style={[styles.bottom, { gap: 12 }]}>
          <Button label="Start 1RM Test" onPress={() => router.push("/orm-test?source=onboarding")} />
          <Button label="Skip – I Know My Numbers" onPress={onManual} variant="secondary" />
          <Pressable onPress={onSkip} style={styles.skipTextBtn}>
            <Text style={[styles.skipText, { color: theme.colors.muted }]}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </StepSlide>
  );
}
