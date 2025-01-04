import { View, Text, StyleSheet } from "react-native";

export default function Leaderboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.rank}>1. Alice - 500 Points</Text>
      <Text style={styles.rank}>2. Bob - 450 Points</Text>
      <Text style={styles.rank}>3. You - 400 Points</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  rank: { fontSize: 18, marginBottom: 5 },
});
