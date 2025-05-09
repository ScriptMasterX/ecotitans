import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Button, FlatList, Modal, TouchableOpacity, Alert } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { auth, db } from "../../../lib/_firebaseConfig";
import { collection, doc, getDoc, getDocs, updateDoc, addDoc, query, where, orderBy, onSnapshot } from "firebase/firestore";
import QRCode from "react-native-qrcode-svg";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

// ✅ Create Tab Navigator
const Tab = createMaterialTopTabNavigator();

// ✅ Rewards Page (Tab)
const RewardsTab = ({ points, fetchUserPoints }) => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRewards();
  }, []);

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
      console.error("❌ Error fetching rewards:", error);
      setLoading(false);
    }
  };

  const redeemReward = async (reward) => {
    try {
      if (points < reward.cost) {
        Alert.alert("Not Enough Points", "You need more points to redeem this reward.");
        return;
      }
  
      Alert.alert(
        "Confirm Redemption",
        `Are you sure you want to redeem "${reward.name}" for ${reward.cost} points?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: async () => {
              const user = auth.currentUser;
              if (!user) return;
  
              const userRef = doc(db, "users", user.uid);
              const ordersCollection = collection(db, "orders");
  
              const orderData = {
                userId: user.uid,
                rewardName: reward.name,
                cost: reward.cost,
                status: "Pending",
                timestamp: new Date().toISOString(),
              };
  
              // ✅ Store order in Firestore
              await addDoc(ordersCollection, orderData);
  
              // ✅ Deduct points from Firestore
              await updateDoc(userRef, { points: points - reward.cost });
  
              Alert.alert("🎉 Reward Redeemed!", `You have redeemed: ${reward.name}`);
  
              // ✅ Refresh user points & order history to reflect changes
              fetchUserPoints();
              fetchOrderHistory(); // <-- Force refresh of the order history
            },
          },
        ]
      );
    } catch (error) {
      console.error("❌ Error redeeming reward:", error);
      Alert.alert("Error", "Could not redeem reward.");
    }
  };
  
  
  
  

  return (
    <View style={styles.pageContainer}>
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
              <TouchableOpacity style={styles.redeemButton} onPress={() => redeemReward(item)}>
                <Text style={styles.buttonText}>Redeem</Text>
              </TouchableOpacity>

            </View>
          )}
        />
      )}
    </View>
  );
};

// ✅ Order History Page (Tab)
const OrderHistoryTab = () => {
  const [orderHistory, setOrderHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrderHistory();
  }, []);
  useFocusEffect(
    useCallback(() => {
      fetchOrderHistory();
    }, [])
  );
  const fetchOrderHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const ordersCollection = collection(db, "orders");
      const userOrdersQuery = query(
        ordersCollection,
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc")
      );

      const querySnapshot = await getDocs(userOrdersQuery);
      const userOrders = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setOrderHistory(userOrders); // ✅ Update local state
      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching order history:", error);
      setLoading(false);
    }
  };
  
  

  const openQRCodeModal = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };
  
  
  

  return (
    <View style={styles.tabContainer}>
      {loading ? (
        <Text>Loading order history...</Text>
      ) : orderHistory.length === 0 ? (
        <Text>No order history yet.</Text>
      ) : (
        <FlatList
          data={orderHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.orderContainer}>
              <Text style={styles.orderText}>🎁 {item.rewardName}</Text>
              <Text>Cost: {item.cost} Points</Text>
              <Text>Status: {item.status}</Text>
              <Text>Date: {item.timestamp ? new Date(item.timestamp).toLocaleString() : "N/A"}</Text>

              {/* ✅ View QR Code Button */}
              <TouchableOpacity style={styles.viewQRButton} onPress={() => openQRCodeModal(item)}>
                <Text style={styles.buttonText}>View QR Code</Text>
              </TouchableOpacity>

            </View>
          )}
        />
      )}

      {/* ✅ QR Code Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Your QR Code</Text>

            {/* ✅ Generate QR Code (Unique per order) */}
            {selectedOrder ? (
              <View style={{ padding: 20, backgroundColor: "#fff", borderRadius: 10 }}>
                <QRCode
                  value={selectedOrder.id}
                  size={200}
                />
              </View>
            ) : (
              <Text>Loading QR Code...</Text>
            )}


            {/* ✅ Warning Message */}
            <Text style={styles.warningText}>⚠️ Keep this code safe! It's one-time use only. Redeem it in the Thundershack.</Text>

            {/* ✅ Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ✅ Main Rewards Screen with Tabs
export default function Rewards() {
  const [points, setPoints] = useState(0);

  useEffect(() => {
      const user = auth.currentUser;
      if (!user) return;
  
      // Listen for real-time updates from Firestore
      const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
        if (doc.exists()) {
          setPoints(doc.data().points || 0);
        }
      });
  
      return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

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
      console.error("❌ Error fetching user points:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.points}>Your Points: {points}</Text>
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: { fontSize: 14, fontWeight: "bold" },
          tabBarStyle: { backgroundColor: "#007BFF" },
          tabBarIndicatorStyle: { backgroundColor: "white" },
        }}
      >
        <Tab.Screen name="Rewards">
          {() => <RewardsTab points={points} fetchUserPoints={fetchUserPoints} />}
        </Tab.Screen>
        <Tab.Screen name="Order History" component={OrderHistoryTab} />
      </Tab.Navigator>
    </View>
  );
}

// ✅ Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 50 },
  points: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  pageContainer: { flex: 1, padding: 20 },
  rewardContainer: {
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
  rewardText: { fontSize: 18, marginBottom: 10 },
  orderContainer: {
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#e6f7ff",
  },
  orderText: { fontSize: 18, fontWeight: "bold" },

  tabContainer: { flex: 1, padding: 20 },
  orderContainer: {
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#e6f7ff",
  },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" },
  modalContent: { width: "80%", padding: 20, backgroundColor: "white", borderRadius: 10, alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  warningText: { fontSize: 14, color: "red", textAlign: "center", marginTop: 10 },
  closeButton: { backgroundColor: "#007BFF", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5, marginTop: 15 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  redeemButton: {
    backgroundColor: "#007BFF", // same blue as Logout
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },  
  viewQRButton: {
    backgroundColor: "#6366F1", // indigo
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  
  
});