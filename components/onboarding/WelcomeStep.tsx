import { View, Text } from "react-native";
import { LockeMascot } from "../Locke/LockeMascot";
import type { LockeMascotMood } from "../Locke/LockeMascot";
import { Button } from "../Button";
import { useAppTheme } from "../../contexts/ThemeContext";
import { StepSlide, onboardingStyles as styles } from "./shared";

type Props = {
  lockeMood: LockeMascotMood;
  onContinue: () => void;
};

export function WelcomeStep({ lockeMood, onContinue }: Props) {
  const { theme } = useAppTheme();
  return (
    <StepSlide>
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.center}>
          <LockeMascot size="full" mood={lockeMood} />
          <Text style={[styles.lockeIntro, { color: theme.colors.primary }]}>I'm Locke.</Text>
          <Text style={[styles.welcomeSub, { color: theme.colors.muted }]}>
            I'll be your training partner.
          </Text>
        </View>

        <View style={styles.bottom}>
          <Button label="Continue" onPress={onContinue} />
        </View>
      </View>
    </StepSlide>
  );
}
