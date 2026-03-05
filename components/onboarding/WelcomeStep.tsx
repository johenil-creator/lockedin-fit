import { View, Text } from "react-native";
import { LockeMascot } from "../Locke/LockeMascot";
import { Button } from "../Button";
import { useAppTheme } from "../../contexts/ThemeContext";
import { StepSlide, onboardingStyles as styles } from "./shared";

type Props = {
  onContinue: () => void;
};

export function WelcomeStep({ onContinue }: Props) {
  const { theme } = useAppTheme();
  return (
    <StepSlide>
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.center}>
          <LockeMascot size={400} mood="encouraging" />
          <Text style={[styles.lockeIntro, { color: theme.colors.primary }]}>I'm Locke.</Text>
          <Text style={[styles.welcomeSub, { color: theme.colors.muted }]}>
            I'm your personal trainer. I'll guide your sessions, track your progress, and help you crush PRs.
          </Text>
          <Text style={[styles.welcomeSub, { color: theme.colors.muted, marginTop: 8 }]}>
            Let's build something great together.
          </Text>
        </View>

        <View style={styles.bottom}>
          <Button label="Let's Go" onPress={onContinue} />
        </View>
      </View>
    </StepSlide>
  );
}
