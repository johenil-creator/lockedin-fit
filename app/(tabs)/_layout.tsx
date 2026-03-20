import { Tabs } from "expo-router";
import { useAppTheme } from "../../contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const { theme } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.primary + '50',
          borderTopWidth: 0.5,
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarTestID: "tab-home", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="recovery" options={{ title: "Recovery", tabBarTestID: "tab-recovery", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "heart" : "heart-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="workout-log" options={{ title: "Log", tabBarTestID: "tab-log", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="plan" options={{ title: "Plan", tabBarTestID: "tab-plan", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "clipboard" : "clipboard-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="leagues" options={{ title: "Leagues", tabBarTestID: "tab-leagues", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "trophy" : "trophy-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
    </Tabs>
  );
}
