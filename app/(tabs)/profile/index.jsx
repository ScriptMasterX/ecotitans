import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null); // Allow both User and null
  const [name, setName] = useState(""); // User's name
  const [email, setEmail] = useState(""); // User's email
  const [bio, setBio] = useState(""); // User's bio
  const [isEditing, setIsEditing] = useState(false); // Toggle edit mode

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser); // Set the authenticated user
        setEmail(currentUser.email || "");
        fetchProfile(currentUser.uid); // Fetch user profile
      } else {
        setUser(null);
        router.replace("/auth/authScreen"); // Redirect to login if not authenticated
      }
    });

    return unsubscribe; // Cleanup the listener on unmount
  }, []);
  function generateGuestName() {
    const randomNumbers = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
    return `Guest ${randomNumbers}`;
  }
  // Fetch user profile data from Firestore
  const fetchProfile = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        const data = userDoc.data();
        setName(data.name || ""); // Set user's name
        setBio(data.bio || ""); // Set user's bio
        setEmail(data.email || user.email || ""); // Ensure email is set
        
        // ✅ If email is missing in Firestore, update it
        if (!data.email) {
          await updateDoc(userDocRef, { email: auth.currentUser.email });
        }
        
      } else {
        // ✅ Create a new document if it doesn't exist
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
  

  // Save user profile data to Firestore
  const saveProfile = async () => {
    try {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { name, bio, email }); // ✅ Ensure email is included
        Alert.alert("Success", "Your profile has been updated.");
        setIsEditing(false); // Exit edit mode
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
        {
          text: "Cancel",
          onPress: () => console.log("Logout cancelled"),
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await auth.signOut(); // Firebase sign-out
              router.replace("/auth/authScreen"); // Redirect to login screen
            } catch (error) {
              console.error("Logout error:", error.message);
              Alert.alert("Logout Error", error.message);
            }
          },
          style: "destructive", // Emphasizes the destructive action
        },
      ],
      { cancelable: true } // Dismiss dialog if tapped outside
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Name Label and Input */}
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={[styles.input, isEditing && styles.editable]}
        value={name}
        onChangeText={setName}
        placeholder="Name"
        editable={isEditing} // Name is editable only in edit mode
      />

      {/* Email Label and Input */}
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        value={email}
        placeholder="Email"
        editable={false} // Email is always read-only
      />

      {/* Bio Label and Input */}
      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, isEditing && styles.editable]}
        value={bio}
        onChangeText={setBio}
        placeholder="Bio"
        editable={isEditing} // Bio is editable only in edit mode
        multiline // Allow multi-line input for bio
      />

      {/* Buttons */}
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
