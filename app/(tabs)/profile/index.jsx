import React, { useState, useEffect, useMemo, useCallback  } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, Linking, Image, FlatList, TouchableOpacity, Modal, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { onAuthStateChanged, deleteUser } from "firebase/auth";
import { doc, getDoc, getDocs, updateDoc, setDoc, deleteDoc, collection, query, where } from "firebase/firestore";
import { useFocusEffect } from '@react-navigation/native';

import { useRouter } from "expo-router";
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Icon from "react-native-vector-icons/Feather";
import { ProgressBar } from "react-native-paper";

const presetAvatars = [
  require("../../../assets/images/avatar1.jpeg"),
  require("../../../assets/images/avatar2.jpeg"),
  require("../../../assets/images/avatar3.jpeg"),
  require("../../../assets/images/avatar4.jpeg"),
  require("../../../assets/images/avatar5.jpeg"),
  require("../../../assets/images/avatar6.jpeg"),
];
export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState(presetAvatars[0]);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [userScans, setUserScans] = useState([]);
  const Tab = createMaterialTopTabNavigator();
  const [scanCount, setScanCount] = useState(0);

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
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
  
      const fetchScanData = async () => {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
  
          if (userDoc.exists()) {
            const data = userDoc.data();
            setScanCount(data.scanCount || 0);
            const log = data.scanLog || [];
            const days = [...new Set(
              log.map(date => new Date(date).toDateString())
            )];
            setUserScans(days); // userScans now just holds scan day strings
          }
        } catch (error) {
          console.error("Error fetching scan data:", error);
        }
      };
  
      fetchScanData();
    }, [user])
  );
  
  
  const fetchProfile = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        const data = userDoc.data();
        setName(data.name || "");
        setBio(data.bio || "");
        setEmail(data.email || auth.currentUser.email || "");
        setAvatar(presetAvatars[data.avatarIndex] || presetAvatars[0]);
        setScanCount(data.scanCount || 0); // 🆕 get scanCount from Firestore
      } else {
        const randomIndex = Math.floor(Math.random() * presetAvatars.length);
        await setDoc(userDocRef, {
          name: generateUserName(),
          email: auth.currentUser.email,
          bio: "Add a bio to get started!",
          avatarIndex: randomIndex,
          scanCount: 0 // 🆕 initialize to 0
        });
        setName(`User ${randomIndex}`);
        setBio("Add a bio to get started!");
        setEmail(auth.currentUser.email);
        setAvatar(presetAvatars[randomIndex]);
        setScanCount(0); // 🆕
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
      Alert.alert("Error", "Could not load profile data.");
    }
  };

  function generateUserName() {
    const randomNumbers = Math.floor(100000 + Math.random() * 900000);
    return `User ${randomNumbers}`;
  }
  const AchievementsTab = () => {
  const achievements = computeAchievements();

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontWeight: "bold", fontSize: 22, marginBottom: 15 }}>
        🎯 Achievements
      </Text>
      <FlatList
        data={achievements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isCompleted = item.progress >= item.goal;
          const percent = Math.min(item.progress / item.goal, 1);

          return (
            <View style={styles.achievementCard}>
              <Text style={styles.achievementTitle}>{item.title}</Text>
              <Text style={styles.achievementDesc}>{item.description}</Text>
              <ProgressBar
                progress={percent}
                color={isCompleted ? "#22c55e" : "#3b82f6"}
                style={{ height: 8, borderRadius: 4 }}
              />
              <Text style={styles.achievementProgress}>
                {item.progress}/{item.goal} {isCompleted ? "✅ Completed" : ""}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
};

  const updateAvatar = async (selectedAvatar) => {
    try {
      const avatarIndex = presetAvatars.indexOf(selectedAvatar);
      setAvatar(selectedAvatar);
      setAvatarModalVisible(false);
  
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { avatarIndex });
      }
    } catch (error) {
      console.error("Error updating avatar:", error);
      Alert.alert("Error", "Could not update avatar.");
    }
  };
  
  
  
  
  const saveProfile = async () => {
    try {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const avatarIndex = presetAvatars.indexOf(avatar);
        await updateDoc(userDocRef, { name, bio, email, avatarIndex });
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
                await deleteDoc(doc(db, "users", user.uid));
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
  const settingsProps = useMemo(() => ({
    name,
    email,
    bio,
    isEditing,
    setName,
    setBio,
    saveProfile,
    handleLogout,
    handleDeleteAccount,
    setIsEditing,
  }), [
    name,
    email,
    bio,
    isEditing,
    setName,
    setBio,
    saveProfile,
    handleLogout,
    handleDeleteAccount,
    setIsEditing,
  ]);
  const computeAchievements = () => {
    const days = [...new Set(
      userScans
        .map(scan => {
          const ts = scan.timestamp;
          if (!ts) return null;
          if (ts.toDate) return ts.toDate().toDateString();
          if (typeof ts === "string" || typeof ts === "number") return new Date(ts).toDateString();
          return null;
        })
        .filter(Boolean)
    )];
  
    return [
      {
        id: "1",
        title: "🌌 Milkyway",
        description: "Reach 5 scans",
        progress: scanCount, // ✅ using scanCount
        goal: 5,
      },
      {
        id: "2",
        title: "🚀 Trash Trooper",
        description: "Scan trash 7 days in a row",
        progress: calculateStreak(days),
        goal: 7,
      },
      {
        id: "3",
        title: "🔥 Streak Starter",
        description: "Scan trash 3 days in a row",
        progress: calculateStreak(days),
        goal: 3,
      },
      {
        id: "4",
        title: "💎 Diamond Recycler",
        description: "Scan 100 trash items",
        progress: scanCount, // ✅ using scanCount
        goal: 100,
      },
    ];
  };
  
  
  // Helper to check streaks
  const calculateStreak = (daysArray) => {
    const sorted = daysArray.map(d => new Date(d)).sort((a, b) => b - a);
    let streak = 1;
  
    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = (sorted[i] - sorted[i + 1]) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
  
    return streak;
  };
  
  return (
      

      <View style={styles.container}>
        <TouchableOpacity onPress={() => setAvatarModalVisible(true)}>
          <View style={styles.avatarWrapper}>
            <Image source={avatar} style={styles.avatar} />
            <Icon name="edit-2" size={18} color="#fff" style={styles.editIcon} />
          </View>
        </TouchableOpacity>

        <Text style={styles.title}>{name}</Text>

        <Tab.Navigator>
          <Tab.Screen name="Achievements" component={AchievementsTab} />
          <Tab.Screen name="Settings" children={() => <SettingsTab {...settingsProps} />} />

        </Tab.Navigator>

      <Modal
        animationType="slide"
        transparent={true}
        visible={avatarModalVisible}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.avatarTitle}>Choose Your Avatar</Text>
            <FlatList
              horizontal
              data={presetAvatars}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={styles.avatarList}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => updateAvatar(item)}>
                  <Image
                    source={item}
                    style={[
                      styles.avatarOption,
                      avatar === item && styles.selectedAvatar,
                    ]}
                  />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setAvatarModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4FD1C5", // 🌤️ Sky Blue background
  },
  profileInformationWrapper: {
    flex: 1,
    marginTop: 20,
    backgroundColor: "#FFFFFF", // 🧾 White card
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginTop: 40,
    borderWidth: 4,
    borderColor: "#84CC16", // 🟡 Bright Lime
  },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 20, marginTop: 12, textAlign: "center" },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 15,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    color: "black",
  },
  editable: { backgroundColor: "#fff", borderColor: "#84CC16" },
  disabledInput: { backgroundColor: "#e9ecef" },
  buttonContainer: { marginBottom: 10 },

  // 🎨 Avatar Modal Styling
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalBox: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRadius: 20,
    width: "85%",
    alignItems: "center",
  },
  avatarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  avatarList: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  avatarOption: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginHorizontal: 8,
    borderWidth: 3,
    borderColor: "transparent",
    backgroundColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  selectedAvatar: {
    borderColor: "#84CC16",
  },
  closeButton: {
    marginTop: 25,
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: "#84CC16",
    borderRadius: 8,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  avatarWrapper: {
    position: "relative",
    alignSelf: "center"
  },
  editIcon: {
    position: "absolute",
    top: 40,
    right: 4,
    backgroundColor: "#007BFF",
    borderRadius: 10,
    padding: 3,
  },
  achievementCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  achievementTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },
  achievementDesc: {
    color: "#555",
    marginVertical: 4,
  },
  achievementProgress: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  
});
const SettingsTab = ({
  name, email, bio, isEditing,
  setName, setBio, saveProfile,
  handleLogout, handleDeleteAccount, setIsEditing
}) => (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={280}
  >
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="always">
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={[styles.input, isEditing && styles.editable]}
        value={name}
        onChangeText={setName}
        editable={isEditing}
      />
      <Text style={styles.label}>Email</Text>
      <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} />
      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, isEditing && styles.editable]}
        value={bio}
        onChangeText={setBio}
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
      <View style={styles.buttonContainer}><Button title="Logout" onPress={handleLogout} /></View>
      <View style={styles.buttonContainer}><Button color="red" title="Delete Account" onPress={handleDeleteAccount} /></View>
    </ScrollView>
  </KeyboardAvoidingView>
);