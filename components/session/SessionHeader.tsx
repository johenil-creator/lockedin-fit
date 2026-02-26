import { View, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { BackButton } from "../BackButton";
import { useAppTheme } from "../../contexts/ThemeContext";

type Props = {
  sessionName: string;
  isActive: boolean;
  activeExerciseId: string | null;
  onClearActiveExercise: () => void;
};

export function SessionHeader({
  sessionName,
  isActive,
  activeExerciseId,
  onClearActiveExercise,
}: Props) {
  const router = useRouter();
  const { theme } = useAppTheme();

  return (
    <View style={styles.header}>
      <BackButton
        onPress={() => {
          if (activeExerciseId) {
            onClearActiveExercise();
          } else if (isActive) {
            Alert.alert("Leave session?", "Your progress is saved.", [
              { text: "Stay", style: "cancel" },
              { text: "Leave", style: "destructive", onPress: () => router.back() },
            ]);
          } else {
            router.back();
          }
        }}
      />
      <View style={styles.headerCenter}>
        <Text style={[styles.sessionName, { color: theme.colors.text }]} numberOfLines={1}>
          {sessionName}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  sessionName: { fontSize: 17, fontWeight: "600" },
});
