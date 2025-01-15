import React from "react";
import { View, Text, StyleSheet, Button, Alert } from "react-native";
import { auth } from "../../firebaseConfig";
import { useRouter } from "expo-router";

export default function Profile() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.signOut(); // Firebase sign-out
      router.replace("/auth/authScreen"); // Redirect to the login screen
    } catch (error: any) {
      console.error("Logout error:", error.message);
      Alert.alert("Logout Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.info}>Name: John Doe</Text>
      <Text style={styles.info}>Email: john.doe@example.com</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="Edit Profile"
          onPress={() => Alert.alert("Edit Profile Coming Soon!")}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Logout" onPress={handleLogout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  info: { fontSize: 18, marginBottom: 20 },
  buttonContainer: { marginBottom: 10 }, // Style for button wrappers
});
