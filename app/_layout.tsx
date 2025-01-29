import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig"; // Ensure your Firebase is initialized properly
import { useRouter } from "expo-router";

export default function RootLayout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true); // Show a loading spinner
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track logged-in status

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is logged in:", user.email); // Debug log
        setIsLoggedIn(true); // User is logged in
      } else {
        console.log("No user logged in"); // Debug log
        setIsLoggedIn(false); // User is not logged in
      }
      setIsLoading(false); // Stop the loading spinner
    });

    return unsubscribe; // Cleanup listener on unmount
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn) {
        router.replace("/(tabs)/dashboard"); // Redirect to the main app if logged in
      } else {
        router.replace("/auth/authScreen"); // Redirect to login if not logged in
      }
    }
  }, [isLoading, isLoggedIn]);

  if (isLoading) {
    // Show a loading spinner while checking auth status
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false, // Global option to hide headers
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
