import { View, Text, Pressable, StyleSheet } from "react-native";
import { LockeMascot } from "../Locke/LockeMascot";
import { Button } from "../Button";
import { BackButton } from "../BackButton";
import { useAppTheme } from "../../contexts/ThemeContext";
import { onboardingStyles as styles } from "./shared";

type Props = {
  unit: "kg" | "lbs";
  onSelectUnit: (unit: "kg" | "lbs") => void;
  onContinue: () => void;
  onBack?: () => void;
};

export function UnitStep({ unit, onSelectUnit, onContinue, onBack }: Props) {
  const { theme } = useAppTheme();

  const cardStyle = (selected: boolean) => ({
    flex: 1 as const,
    flexDirection: "row" as const,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
    borderColor: selected ? theme.colors.primary : theme.colors.border,
  });

  const labelColor = (selected: boolean) =>
    selected ? theme.colors.primaryText : theme.colors.text;

  const subtitleColor = (selected: boolean) =>
    selected ? theme.colors.primaryText + "BB" : theme.colors.muted;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {onBack && (
        <View style={unitStyles.header}>
          <BackButton onPress={onBack} />
        </View>
      )}
      <View style={unitStyles.inner}>
        <LockeMascot size={240} mood="neutral" />
        <Text style={[unitStyles.microcopy, { color: theme.colors.muted }]}>
          Just need to know how you measure.
        </Text>
        <Text style={[unitStyles.heading, { color: theme.colors.text }]}>
          How do you measure weight?
        </Text>

        <View style={unitStyles.cardRow}>
          <Pressable style={cardStyle(unit === "kg")} onPress={() => onSelectUnit("kg")}>
            <Text style={[unitStyles.cardLabel, { color: labelColor(unit === "kg") }]}>KG</Text>
            <Text style={[unitStyles.cardSub, { color: subtitleColor(unit === "kg") }]}>Kilograms</Text>
          </Pressable>
          <Pressable testID="unit-lbs" style={cardStyle(unit === "lbs")} onPress={() => onSelectUnit("lbs")}>
            <Text style={[unitStyles.cardLabel, { color: labelColor(unit === "lbs") }]}>LBS</Text>
            <Text style={[unitStyles.cardSub, { color: subtitleColor(unit === "lbs") }]}>Pounds</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottom}>
        <Button label="Continue" onPress={onContinue} />
      </View>
    </View>
  );
}

const unitStyles = StyleSheet.create({
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
  cardRow: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "stretch",
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardSub: {
    fontSize: 12,
    fontWeight: "500",
  },
});
