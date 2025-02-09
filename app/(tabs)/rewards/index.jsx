import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Button, Alert, FlatList } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";

export default function Rewards() {
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserPoints();
    fetchRewards();
  }, []);

  // ✅ Fetch User's Current Points
  const fetchUserPoints = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setPoints(userSnap.data().points || 0);
      }
    } catch (error) {
      console.error("Error fetching user points:", error);
    }
  };

  // ✅ Fetch Available Rewards from Firestore
  const fetchRewards = async () => {
    try {
      const rewardsCollection = collection(db, "rewards");
      const rewardsSnapshot = await getDocs(rewardsCollection);
      const rewardsList = rewardsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRewards(rewardsList);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      setLoading(false);
    }
  };

  // ✅ Handle Reward Redemption
  const redeemReward = async (reward) => {
    try {
      if (points < reward.cost) {
        Alert.alert("Not Enough Points", "You need more points to redeem this reward.");
        return;
      }

      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { points: points - reward.cost });

      Alert.alert("🎉 Reward Redeemed!", `You have redeemed: ${reward.name}`);

      // ✅ Refresh User Points After Redemption
      fetchUserPoints();
    } catch (error) {
      console.error("Error redeeming reward:", error);
      Alert.alert("Error", "Could not redeem reward.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redeem Rewards</Text>
      <Text style={styles.points}>Your Points: {points}</Text>

      {loading ? (
        <Text>Loading rewards...</Text>
      ) : (
        <FlatList
          data={rewards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.rewardContainer}>
              <Text style={styles.rewardText}>
                {item.name} ({item.cost} Points)
              </Text>
              <Text>{item.description}</Text>
              <Button title="Redeem" onPress={() => redeemReward(item)} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  points: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  rewardContainer: {
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
  rewardText: { fontSize: 18, marginBottom: 10 },
});
