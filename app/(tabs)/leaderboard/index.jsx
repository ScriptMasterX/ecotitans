import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { useFocusEffect } from "expo-router";
import { db } from "../../firebaseConfig";

export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const usersCollection = collection(db, "users");
      const usersQuery = query(usersCollection, orderBy("lifetimePoints", "desc"), limit(10));

      const querySnapshot = await getDocs(usersQuery);
      const users = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTopUsers(users);
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
      <Text style={styles.title}>Leaderboard</Text>
      {loading ? (
        <Text>Loading leaderboard...</Text>
      ) : topUsers.length === 0 ? (
        <Text>No data available yet.</Text>
      ) : (
        topUsers.map((user, index) => (
          <View key={user.id} style={styles.rankContainer}>
            <Text style={styles.rank}>{index + 1}.</Text>
            <Text style={styles.username}>{user.name}</Text>
            <Text style={styles.points}>{user.lifetimePoints} Points</Text>
          </View>
        ))
      )}
    </View>
  );  
};

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 20
  },
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  rankContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rank: { fontSize: 18, fontWeight: "bold" },
  username: { fontSize: 18, flex: 1, marginLeft: 10, textAlign: "left" },
  points: { fontSize: 16, fontWeight: "600" },
});
