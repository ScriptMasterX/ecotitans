import { Stack } from "expo-router";
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and redirect
    const isLoggedIn = true; // Replace with actual auth logic
    if (!isLoggedIn) {
      router.replace("/auth/sign-in");
    }
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Include the tabs layout */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Add other non-tab routes like auth or admin here */}
      <Stack.Screen name="auth" options={{ presentation: "modal" }} />
      <Stack.Screen name="admin" />
    </Stack>
  );
}
