import { View, Text, StyleSheet, Button } from "react-native";

export default function Rewards() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redeem Rewards</Text>
      <Text style={styles.reward}>- Free Coffee (50 Points)</Text>
      <Button title="Redeem" onPress={() => alert("Reward Redeemed!")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  reward: { fontSize: 18, marginBottom: 20 },
});

