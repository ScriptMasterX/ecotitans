import React, { useState, useEffect, useMemo, useCallback  } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, Linking, Image, FlatList, TouchableOpacity, Modal, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { auth, db } from "../../../lib/_firebaseConfig";
import { onAuthStateChanged, deleteUser } from "firebase/auth";
import { doc, getDoc, getDocs, updateDoc, setDoc, deleteDoc, collection, query, where, arrayUnion, increment } from "firebase/firestore";
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
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState(presetAvatars[0]);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [userScans, setUserScans] = useState([]);
  const Tab = createMaterialTopTabNavigator();
  const [scanCount, setScanCount] = useState(0);
  const [claimedMissions, setClaimedMissions] = useState([]);

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
        setEmail(data.email || auth.currentUser.email || "");
        setAvatar(presetAvatars[data.avatarIndex] || presetAvatars[0]);
        setScanCount(data.scanCount || 0);
        setClaimedMissions(data.claimedMissions || []); // ✅ New
      } else {
        const randomIndex = Math.floor(Math.random() * presetAvatars.length);
        await setDoc(userDocRef, {
          name: generateUserName(),
          email: auth.currentUser.email,
          avatarIndex: randomIndex,
          scanCount: 0,
          claimedMissions: [], // ✅ Initialize new field
        });
        setName(`User ${randomIndex}`);
        setEmail(auth.currentUser.email);
        setAvatar(presetAvatars[randomIndex]);
        setScanCount(0);
        setClaimedMissions([]); // ✅ Ensure state is set
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
  const MissionsTab = () => {
    const missions = computeMissions().sort((a, b) => {
      if (a.claimed && !b.claimed) return 1;
      if (!a.claimed && b.claimed) return -1;
      return 0;
    });
    
  
    const claimMission = async (missionId, rewardPoints) => {
      if (!user) return;
  
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          claimedMissions: arrayUnion(missionId),
          points: increment(rewardPoints),
          lifetimePoints: increment(rewardPoints),
        });
  
        Alert.alert("✅ Mission Claimed", `You earned ${rewardPoints} points!`);
        fetchProfile(user.uid); // Refresh profile data
      } catch (error) {
        console.error("Error claiming mission:", error);
        Alert.alert("Error", "Could not claim mission.");
      }
    };
  
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ fontWeight: "bold", fontSize: 22, marginBottom: 15, textAlign: "center" }}>
          Missions
        </Text>
        <FlatList
          data={missions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const percent = Math.min(item.progress / item.goal, 1);
            const canClaim = item.progress >= item.goal && !item.claimed;
  
            return (
              <View style={styles.achievementCard}>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.achievementTitle}>{item.title}</Text>
                  <Text style={styles.achievementDesc}>{item.description}</Text>
                </View>

                <ProgressBar
                  progress={Math.min(item.progress / item.goal, 1)}
                  color={item.claimed ? "#22c55e" : "#3b82f6"}
                  style={styles.progressBar}
                />

                <View style={styles.missionFooter}>
                  <Text style={styles.progressText}>
                    {item.progress}/{item.goal}
                    {item.claimed ? " ✅ Claimed" : item.progress >= item.goal ? " 🎉 Claim now" : ""}
                  </Text>
                  <Text style={styles.rewardText}>🎁 {item.rewardPoints} pts</Text>
                </View>

                {item.progress >= item.goal && !item.claimed && (
                  <TouchableOpacity style={styles.claimButton} onPress={() => claimMission(item.id, item.rewardPoints)}>
                    <Text style={styles.buttonText}>Claim</Text>
                  </TouchableOpacity>
                )}
              </View>

            );
          }}
        />
      </View>
    );
  };
  
  const claimMission = async (missionId, rewardPoints) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        claimedMissions: arrayUnion(missionId),
        points: increment(rewardPoints),
        lifetimePoints: increment(rewardPoints),
      });

      Alert.alert("✅ Mission Claimed", `You earned ${rewardPoints} points!`);
      // Optionally refetch profile data to update points and claimed missions in state
      fetchProfile(user.uid);
    } catch (error) {
      console.error("Error claiming mission:", error);
      Alert.alert("Error", "Could not claim mission.");
    }
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
        await updateDoc(userDocRef, { name, email, avatarIndex });
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
    isEditing,
    setName,
    saveProfile,
    handleLogout,
    handleDeleteAccount,
    setIsEditing,
  }), [
    name,
    email,
    isEditing,
    setName,
    saveProfile,
    handleLogout,
    handleDeleteAccount,
    setIsEditing,
  ]);
  const computeMissions = () => {
    const days = [...new Set(userScans.map(d => new Date(d).toDateString()))];
  
    return [
      {
        id: "milkyway",
        title: "🌌 Milkyway",
        description: "Reach 5 scans",
        progress: scanCount,
        goal: 5,
        rewardPoints: 50,
        claimed: claimedMissions.includes("milkyway"),
      },
      {
        id: "trashTrooper",
        title: "🚀 Trash Trooper",
        description: "Scan trash 7 days in a row",
        progress: calculateStreak(days),
        goal: 7,
        rewardPoints: 75,
        claimed: claimedMissions.includes("trashTrooper"),
      },
      {
        id: "streakStarter",
        title: "🔥 Streak Starter",
        description: "Scan trash 3 days in a row",
        progress: calculateStreak(days),
        goal: 3,
        rewardPoints: 30,
        claimed: claimedMissions.includes("streakStarter"),
      },
      {
        id: "diamondRecycler",
        title: "💎 Diamond Recycler",
        description: "Scan 100 trash items",
        progress: scanCount,
        goal: 100,
        rewardPoints: 600,
        claimed: claimedMissions.includes("diamondRecycler"),
      },
      {
        id: "firstScan",
        title: "🧪 First Scan",
        description: "Submit your very first trash scan",
        progress: scanCount,
        goal: 1,
        rewardPoints: 10,
        claimed: claimedMissions.includes("firstScan"),
      },
      {
        id: "weeklyHero",
        title: "📅 Weekly Hero",
        description: "Scan trash on 5 different days in one week",
        progress: days.length,
        goal: 5,
        rewardPoints: 100,
        claimed: claimedMissions.includes("weeklyHero"),
      },
      {
        id: "doubleDigits",
        title: "🔟 Double Digits",
        description: "Reach 10 total trash scans",
        progress: scanCount,
        goal: 10,
        rewardPoints: 20,
        claimed: claimedMissions.includes("doubleDigits"),
      },
      {
        id: "streakMaster",
        title: "🔥🔥🔥 Streak Master",
        description: "Maintain a 10-day scan streak",
        progress: calculateStreak(days),
        goal: 10,
        rewardPoints: 150,
        claimed: claimedMissions.includes("streakMaster"),
      },
      {
        id: "schoolSaver",
        title: "🏫 School Saver",
        description: "Scan trash on 3 Mondays",
        progress: days.filter(d => new Date(d).getDay() === 1).length,
        goal: 3,
        rewardPoints: 75,
        claimed: claimedMissions.includes("schoolSaver"),
      },
      {
        id: "legendaryRecycler",
        title: "🏆 Legendary Recycler",
        description: "Reach 200 total scans",
        progress: scanCount,
        goal: 200,
        rewardPoints: 1000,
        claimed: claimedMissions.includes("legendaryRecycler"),
      }
      
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
          <Tab.Screen name="Missions" component={MissionsTab} />
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
    backgroundColor: "#F9FAFB", // Softer gray card
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#D1D5DB", // light gray border
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  missionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  progressText: {
    fontSize: 13,
    color: "#6B7280",
  },
  rewardText: {
    fontSize: 13,
    fontWeight: "600",
  },
  claimButton: {
    backgroundColor: "#3B82F6", // Blue
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 14,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  
  
  saveButton: {
    backgroundColor: "#4FD1C5",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  
  logoutButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  
  deleteButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: "center",
  },
  
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  claimButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },  
});
const SettingsTab = ({
  name, email, isEditing,
  setName, saveProfile,
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
        style={[styles.input, styles.editable]}
        value={name}
        onChangeText={(text) => {
          setName(text);
          setIsEditing(true);
        }}
        maxLength={20}
        editable={true}
      />
      <Text style={{ alignSelf: "flex-end", marginRight: 10 }}>{name.length}/20</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} />
      <View style={styles.buttonContainer}>
        {isEditing && (
          <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
            <Text style={styles.buttonText}>Save Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.buttonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  </KeyboardAvoidingView>
);