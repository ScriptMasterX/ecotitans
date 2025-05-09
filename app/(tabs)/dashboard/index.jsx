import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Image, ScrollView } from "react-native";
import { auth, db } from "../../../lib/_firebaseConfig";
import { doc, onSnapshot, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { ProgressBar } from "react-native-paper";

export default function Dashboard() {
  const [points, setPoints] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [rank, setRank] = useState("Bronze");
  const [nextRank, setNextRank] = useState("Silver");
  const [progress, setProgress] = useState(0);
  const [pointsToNextRank, setPointsToNextRank] = useState(500);
  const [recentActivity, setRecentActivity] = useState([]);
  const [lastScan, setLastScan] = useState(null);
  const [name, setName] = useState("");
  
  const presetAvatars = [
    require("../../../assets/images/avatar1.jpeg"),
    require("../../../assets/images/avatar2.jpeg"),
    require("../../../assets/images/avatar3.jpeg"),
    require("../../../assets/images/avatar4.jpeg"),
    require("../../../assets/images/avatar5.jpeg"),
    require("../../../assets/images/avatar6.jpeg"),
  ];
  const [avatar, setAvatar] = useState(presetAvatars[0]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
  
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setName(userData.name || "");
        setPoints(userData.points || 0);
        setLifetimePoints(userData.lifetimePoints || 0);
        setLastScan(userData.lastScan?.toDate() || null);
        updateRankProgress(userData.lifetimePoints || 0);
        setAvatar(presetAvatars[userData.avatarIndex ?? 0]);

      }
    });
  
    return () => unsubscribe();
  }, []);
  

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
  
    const activityQuery = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
    );
  
    const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
      const activities = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      setRecentActivity(activities.slice(0, 5)); // Get latest 5 activities
    });
  
    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);
  


  // 🎖 Rank Progression Logic
  const updateRankProgress = (lifetimePoints) => {
    const ranks = [
      { name: "Bronze", min: 0, max: 499 },
      { name: "Silver", min: 500, max: 999 },
      { name: "Gold", min: 1000, max: 1999 },
      { name: "Platinum", min: 2000, max: 4999 },
      { name: "Diamond", min: 5000, max: Infinity },
    ];

    let currentRank = ranks[0];
    let nextRank = ranks[1];

    for (let i = 0; i < ranks.length; i++) {
      if (lifetimePoints >= ranks[i].min && lifetimePoints <= ranks[i].max) {
        currentRank = ranks[i];
        nextRank = ranks[i + 1] || ranks[i]; // If max rank, next rank remains the same
        break;
      }
    }

    let progress = 0;
    const range = nextRank.min - currentRank.min;

    if (range > 0) {
      progress = (lifetimePoints - currentRank.min) / range;

      if (!Number.isFinite(progress) || Number.isNaN(progress)) {
        progress = 0;
      } else {
        progress = Math.min(Math.max(progress, 0), 1);
      }
    } else {
      progress = 1; // when next rank is the same as current rank
    }

    
    

    setRank(currentRank.name);
    setNextRank(nextRank.name);
    setProgress(progress);
    setPointsToNextRank(nextRank.min - lifetimePoints);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.welcomeWrapper}>
        {avatar !== null && (
          <Image source={avatar} style={styles.welcomeAvatar} />
        )}
        <Text style={styles.title}>Welcome, {name}!</Text>
      </View>

      
      {/* 🔥 Points & Rank Section - Clean & Minimal */}
      <View style={styles.pointsContainer}>
        <View style={styles.pointsRow}>
          <Text style={styles.pointsLabel}>Current Points:</Text>
          <Text style={styles.pointsValue}>{points}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.pointsRow}>
          <Text style={styles.pointsLabel}>Lifetime Points:</Text>
          <Text style={styles.pointsValue}>{lifetimePoints}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.pointsRow}>
          <Text style={styles.rankLabel}>Rank:</Text>
          <Text style={[styles.rankValue, styles[rank.toLowerCase()]]}>{rank}</Text>
        </View>

        {/* 🎖 Progress Bar for Next Rank */}
        <Text style={styles.nextRankText}>Next Rank: {nextRank} ({pointsToNextRank} more points)</Text>
        <ProgressBar progress={progress} color="#007BFF" style={styles.progressBar} />
      </View>

      {/* 🔄 Last Scan Info */}
      <Text style={styles.lastScan}>
        Last Scan: {lastScan ? new Date(lastScan).toLocaleString() : "No scans yet"}
      </Text>

      {/* 📝 Recent Activity Section */}
      <Text style={styles.activityTitle}>Recent Activity</Text>
      {recentActivity.length === 0 ? (
        <Text style={styles.noActivity}>No recent activity.</Text>
      ) : (
        recentActivity.map((item) => (
          <View key={item.id} style={styles.activityItem}>
            <Text style={styles.activityText}>🎁 Redeemed: {item.rewardName}</Text>
            <Text style={styles.activityTimestamp}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    backgroundColor: "#fff" 
  }, 
  title: { 
    fontSize: 24, 
    fontWeight: "500", 
    marginTop: 15,
    marginBottom: 30, 
    textAlign: "center" 
  },

  // 🔥 Points & Rank Section - Simple & Clean
  pointsContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  pointsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  pointsLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    padding: 10
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007BFF",
    padding: 10
  },
  rankLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    padding: 10
  },
  rankValue: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    padding: 10
  },

  // 🎖 Rank Colors
  bronze: { color: "#CD7F32" },
  silver: { color: "#C0C0C0" },
  gold: { color: "#FFD700" },
  platinum: { color: "#E5E4E2" },
  diamond: { color: "#00FFFF" },

  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 5,
  },

  // 🔥 Rank Progress Bar
  nextRankText: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 10
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E0E0E0",
    marginTop: 5,
  },

  // 🔄 Last Scan
  lastScan: { 
    fontSize: 16, 
    paddingTop: 15,
    paddingBottom: 20,
    textAlign: "center", 
    fontStyle: "italic" 
  },

  // 📝 Recent Activity Section
  activityTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginBottom: 20 
  },
  noActivity: { fontSize: 16, fontStyle: "italic", textAlign: "center" },

  activityItem: { padding: 10, marginBottom: 10, backgroundColor: "#f4f4f4", borderRadius: 10 },
  activityText: { fontSize: 16, fontWeight: "bold" },
  activityTimestamp: { fontSize: 14, color: "gray", marginTop: 5 },
  welcomeWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  welcomeAvatar: {
    width: 140,
    height: 140,
    borderRadius: "50%",
    marginRight: 10,
    borderColor: "#84CC16",
    borderWidth: 4

  },
  
});
