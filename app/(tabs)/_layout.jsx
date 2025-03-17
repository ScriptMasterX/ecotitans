import { Tabs, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { height: 80}, // Hide tabs dynamically
        tabBarShowLabel: false, // Removes tab titles
      }}
    >
      <Tabs.Screen
        name="rewards/index"
        options={{
          title: "Rewards",
          tabBarIcon: ({ color }) => <Ionicons name="gift-outline" color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="scan/index"
        options={{
          title: "Scan",
          tabBarIcon: ({ color }) => <Ionicons name="camera-outline" color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard/index"
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ color }) => <Ionicons name="trophy-outline" color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" color={color} size={28} />,
        }}
      />
    </Tabs>
  );
}
