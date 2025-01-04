import { View, Text, StyleSheet } from "react-native";

export default function Dashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Dashboard!</Text>
      <Text style={styles.subtitle}>Total Points: 120</Text>
      <Text style={styles.activity}>Recent Activity:</Text>
      <Text>- Scanned QR Code at 2:30 PM</Text>
      <Text>- Redeemed: Free Coffee</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 18, marginBottom: 10 },
  activity: { fontSize: 16, marginTop: 20, marginBottom: 5 },
});
