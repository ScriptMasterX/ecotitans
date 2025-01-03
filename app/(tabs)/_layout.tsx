import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  console.log("hiii")
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { height: 60 }, // Adjust for better spacing
        tabBarShowLabel: false, // Removes tab titles
      }}
    >
      <Tabs.Screen
        name="rewards/index"
        options={{
          title: "Rewards",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift-outline" color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan/index"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera-outline" color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={28} />
          )
        }}
      />
      <Tabs.Screen
        name="leaderboard/index"
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={28} />
          ),
        }}
      />
    </Tabs>
  );
}
