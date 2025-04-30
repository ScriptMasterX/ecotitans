import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Image } from "react-native";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { useFocusEffect } from "expo-router";
import { db, auth } from "../../firebaseConfig";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState([]);
  const [leaderboardUser, setLeaderboardUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const presetAvatars = [
    require("../../../assets/images/avatar1.jpeg"),
    require("../../../assets/images/avatar2.jpeg"),
    require("../../../assets/images/avatar3.jpeg"),
    require("../../../assets/images/avatar4.jpeg"),
    require("../../../assets/images/avatar5.jpeg"),
    require("../../../assets/images/avatar6.jpeg"),
  ];
  

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const usersCollection = collection(db, "users");
      const usersQuery = query(usersCollection, orderBy("lifetimePoints", "desc"));
      const querySnapshot = await getDocs(usersQuery);
  
      const allUsers = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      const currentUser = auth.currentUser;
      const top10 = allUsers.slice(0, 10);
  
      setTopUsers(top10);
  
      if (currentUser) {
        const userIndex = allUsers.findIndex((user) => user.id === currentUser.uid);
        if (userIndex !== -1) {
          setLeaderboardUser({
            ...allUsers[userIndex],
            rank: userIndex + 1,
          });
        }
      }
  
      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching leaderboard:", error);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // ✅ Optional: Refresh leaderboard every time screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchLeaderboard();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rankings 🏆</Text>
      {leaderboardUser && (
        <View style={styles.myStats}>
          <Text style={styles.myStatsText}>You: {leaderboardUser.name}</Text>
          <Text style={styles.myStatsText}>Points: {leaderboardUser.lifetimePoints}</Text>
          <Text style={styles.myStatsText}>Rank: #{leaderboardUser.rank}</Text>
        </View>
      )}

      {loading ? (
        <Text>Loading leaderboard...</Text>
      ) : topUsers.length === 0 ? (
        <Text>No data available yet.</Text>
      ) : (
        <FlatList
          data={topUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const rank = index + 1;
          
            const isTop3 = rank <= 3;
          
            const icon = rank === 1
              ? "crown"
              : rank === 2
              ? "medal"
              : rank === 3
              ? "trophy"
              : null;
          
            const backgroundColor =
              rank === 1 ? "#FFD70020" :
              rank === 2 ? "#C0C0C020" :
              rank === 3 ? "#CD7F3220" : "transparent";
          
            const borderColor =
              rank === 1 ? "#FFD700" :
              rank === 2 ? "#C0C0C0" :
              rank === 3 ? "#CD7F32" : "#eee";
          
            // fallback avatar if none is available
            const avatarUri = item.avatarIndex !== undefined
              ? presetAvatars[item.avatarIndex]
              : require("../../../assets/images/avatar1.jpeg");
          
            return (
              <View style={[styles.rankCard, { backgroundColor, borderColor }]}>
                <View style={styles.rankLeft}>
                  {/* Profile Picture */}
                  <Image
                    source={avatarUri}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 50,
                      marginRight: 10,
                      borderWidth: 2,
                      borderColor: borderColor,
                    }}
                  />
          
                <View>
                  <Text style={styles.username}>{item.name}</Text>
                  <Text style={styles.userTag}>@{item.email?.split("@")[0]}</Text>
                  <Text style={styles.points}>{item.lifetimePoints} Points</Text>
                </View>

                </View>
          
                {/* Rank: icon for top 3, number otherwise */}
                <View style={{ paddingRight: isTop3 ? 20 : 0 }}>
                  {isTop3 ? (
                    <MaterialCommunityIcons
                      name={icon}
                      size={28}
                      color={borderColor}
                    />
                  ) : (
                    <Text style={styles.rank}>#{rank}</Text>
                  )}
                </View>

              </View>
            );
          }}
          
          
          
        />

      )}
    </View>
  );  
};

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    fontWeight: 500
  },
  container: { 
    flex: 1,
    padding: 20, 
    backgroundColor: "#fff",
  },
  rankContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 30,
    marginLeft: 10,
    paddingLeft: 10
  },
  rank: { fontSize: 18, fontWeight: "bold", marginRight: "20" },
  username: { fontSize: 18, textAlign: "left", fontWeight: "500" },
  points: { fontSize: 16 },
  myStats: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#dff0d8",
    borderRadius: 10,
    alignItems: "center",
  },
  myStatsText: {
    fontSize: 16,
    fontWeight: "600",
  },
  gold: {
    backgroundColor: "#ffd70033", // light gold
    borderLeftWidth: 5,
    borderLeftColor: "#FFD700",   // gold
    borderRadius: 10,
  },
  silver: {
    backgroundColor: "#c0c0c033", // light silver
    borderLeftWidth: 5,
    borderLeftColor: "#C0C0C0",   // silver
    borderRadius: 10,
  },
  bronze: {
    backgroundColor: "#cd7f3233", // light bronze
    borderLeftWidth: 5,
    borderLeftColor: "#CD7F32",   // bronze
    borderRadius: 10,
  },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  rankLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  userTag: {
    fontSize: 14,
    color: "#666",
  },
  
});
