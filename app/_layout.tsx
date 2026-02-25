import { Stack } from "expo-router";
import { ThemeProvider } from "../contexts/ThemeContext";
import { LockeProvider } from "../contexts/LockeContext";
import { PlanProvider } from "../contexts/PlanContext";
import { ProfileProvider } from "../contexts/ProfileContext";

export default function RootLayout() {
  return (
    <ProfileProvider>
      <ThemeProvider>
        <LockeProvider>
          <PlanProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="session/[id]" />
              <Stack.Screen name="start-session" />
              <Stack.Screen name="catalog" />
              <Stack.Screen name="orm-test" />
              <Stack.Screen name="settings" />
            </Stack>
          </PlanProvider>
        </LockeProvider>
      </ThemeProvider>
    </ProfileProvider>
  );
}
