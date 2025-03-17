import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { auth, db } from "../../firebaseConfig";
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

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 🔄 Listen for real-time updates from Firestore (User Data)
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setPoints(userData.points || 0);
        setLifetimePoints(userData.lifetimePoints || 0);
        setLastScan(userData.lastScan?.toDate() || null);

        // ✅ Update rank and progress
        updateRankProgress(userData.lifetimePoints || 0);
      }
    });

    return () => unsubscribe(); // Cleanup listener on unmount
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
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Your Dashboard</Text>
      
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
        <FlatList
          data={recentActivity}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.activityItem}>
              <Text style={styles.activityText}>🎁 Redeemed: {item.rewardName}</Text>
              <Text style={styles.activityTimestamp}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 15, textAlign: "center" },

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
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007BFF",
  },
  rankLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  rankValue: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
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
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E0E0E0",
    marginTop: 5,
  },

  // 🔄 Last Scan
  lastScan: { fontSize: 16, marginBottom: 15, textAlign: "center", fontStyle: "italic" },

  // 📝 Recent Activity Section
  activityTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  noActivity: { fontSize: 16, fontStyle: "italic", textAlign: "center" },

  activityItem: { padding: 10, marginBottom: 10, backgroundColor: "#f4f4f4", borderRadius: 10 },
  activityText: { fontSize: 16, fontWeight: "bold" },
  activityTimestamp: { fontSize: 14, color: "gray", marginTop: 5 },
});
