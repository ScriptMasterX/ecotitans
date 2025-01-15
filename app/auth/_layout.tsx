import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hides the header for all auth screens
        animation: "slide_from_right", // Screen transition animation
      }}
    />
  );
}
