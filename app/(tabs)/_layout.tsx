import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";

export default function TabLayout() {
  const { theme } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏠</Text> }} />
      <Tabs.Screen name="workout-log" options={{ title: "Log", tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📋</Text> }} />
      <Tabs.Screen name="plan" options={{ title: "Plan", tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text> }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📈</Text> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text> }} />
    </Tabs>
  );
}
