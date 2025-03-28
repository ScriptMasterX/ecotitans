import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, Linking } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { onAuthStateChanged, deleteUser } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email || "");
        fetchProfile(currentUser.uid);
      } else {
        setUser(null);
        router.replace("/auth/authScreen");
      }
    });

    return unsubscribe;
  }, []);

  const fetchProfile = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setName(data.name || "");
        setBio(data.bio || "");
        setEmail(data.email || auth.currentUser.email || "");
        
        if (!data.email) {
          await updateDoc(userDocRef, { email: auth.currentUser.email });
        }
      } else {
        await setDoc(userDocRef, { name: "", email: auth.currentUser.email, bio: "" });
        setName(generateGuestName());
        setBio("Add a bio to get started!");
        setEmail(auth.currentUser.email);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
      Alert.alert("Error", "Could not load profile data.");
    }
  };

  function generateGuestName() {
    const randomNumbers = Math.floor(100000 + Math.random() * 900000);
    return `Guest ${randomNumbers}`;
  }

  const saveProfile = async () => {
    try {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { name, bio, email });
        Alert.alert("Success", "Your profile has been updated.");
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving profile data:", error);
      Alert.alert("Error", "Could not save profile data.");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await auth.signOut();
              router.replace("/auth/authScreen");
            } catch (error) {
              console.error("Logout error:", error.message);
              Alert.alert("Logout Error", error.message);
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  // ✅ Delete account logic
  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "This action will permanently delete your account and all associated data. Are you sure you want to continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (user) {
                // Delete user document from Firestore
                await deleteDoc(doc(db, "users", user.uid));

                // Delete authentication account
                await deleteUser(user);

                Alert.alert("Account Deleted", "Your account has been successfully deleted.");
                router.replace("/auth/authScreen");
              }
            } catch (error) {
              console.error("Account deletion error:", error);
              Alert.alert("Error", "Unable to delete account. Please log out and log in again before retrying.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={[styles.input, isEditing && styles.editable]}
        value={name}
        onChangeText={setName}
        placeholder="Name"
        editable={isEditing}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        value={email}
        placeholder="Email"
        editable={false}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, isEditing && styles.editable]}
        value={bio}
        onChangeText={setBio}
        placeholder="Bio"
        editable={isEditing}
        multiline
      />

      <View style={styles.buttonContainer}>
        {isEditing ? (
          <Button title="Save Profile" onPress={saveProfile} />
        ) : (
          <Button title="Edit Profile" onPress={() => setIsEditing(true)} />
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Logout" onPress={handleLogout} />
      </View>

      <View style={styles.buttonContainer}>
        <Button color="red" title="Delete Account" onPress={handleDeleteAccount} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    backgroundColor: "#f5f5f5",
    color: "black",
  },
  editable: { backgroundColor: "#fff", borderColor: "#007BFF" },
  disabledInput: { backgroundColor: "#e9ecef" },
  buttonContainer: { marginBottom: 10 },
});
