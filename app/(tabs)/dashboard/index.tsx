import { View, Text, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { auth, db } from "../../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

export default function Dashboard() {
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Dashboard!</Text>
      <Text style={styles.subtitle}>Total Points: {points}</Text>
      <Text style={styles.activity}>Recent Activity:</Text>
      <Text>- Scanned QR Code and earned points</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 18, marginBottom: 10 },
  activity: { fontSize: 16, marginTop: 20, marginBottom: 5 },
});
