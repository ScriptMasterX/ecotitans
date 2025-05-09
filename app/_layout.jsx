import React, { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { View, ActivityIndicator, StyleSheet, LogBox } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/_firebaseConfig";   // make sure the path is correct

// Ignore noisy warn about spreading “key” prop
LogBox.ignoreLogs([
  'A props object containing a "key" prop is being spread into JSX',
]);

export default function RootLayout() {
  const router = useRouter();

  const [isLoading, setIsLoading]   = useState(true);  // show spinner at first
  const [isLoggedIn, setIsLoggedIn] = useState(false); // track auth state

  /* ------------ check Firebase auth once on mount ------------ */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is logged in:", user.email);
        setIsLoggedIn(true);
      } else {
        console.log("No user logged in");
        setIsLoggedIn(false);
      }
      setIsLoading(false);          // auth check finished
    });

    return unsubscribe;             // cleanup on unmount
  }, []);

  /* ------------ redirect once loading is finished ------------- */
  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn) {
        router.replace("/(tabs)/dashboard");   // protected area
      } else {
        router.replace("/auth/authScreen");    // login / signup
      }
    }
  }, [isLoading, isLoggedIn, router]);

  /* ------------------------ UI ------------------------ */
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,           // hide headers globally
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
