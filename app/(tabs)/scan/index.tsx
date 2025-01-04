import { View, Text, StyleSheet, Button } from "react-native";

export default function Scan() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan QR Code</Text>
      <Button title="Open Camera" onPress={() => alert("Camera feature coming soon!")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
});
