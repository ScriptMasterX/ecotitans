import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function RootLayout() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await SecureStore.getItemAsync("authToken");
        if (token) {
          // Token exists, user is logged in
          setIsLoggedIn(true);
        } else {
          // No token, user is not logged in
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setIsLoggedIn(false);
      }
    };

    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isLoggedIn === false) {
      router.replace("/auth/authScreen"); // Redirect to sign-in if not logged in
    }
  }, [isLoggedIn]);

  if (isLoggedIn === null) {
    // Show a loading screen while checking auth status
    return <></>;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false, // Global option to hide headers
      }}
    />
  );
}
