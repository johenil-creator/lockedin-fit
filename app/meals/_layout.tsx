import { Stack } from "expo-router";

export default function MealsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#0D1117" },
      }}
    >
      <Stack.Screen name="setup" options={{ gestureEnabled: false, animation: "slide_from_bottom" }} />
    </Stack>
  );
}
