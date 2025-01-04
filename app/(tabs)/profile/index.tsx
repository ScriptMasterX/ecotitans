import { View, Text, StyleSheet, Button } from "react-native";

export default function Profile() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.info}>Name: John Doe</Text>
      <Text style={styles.info}>Email: john.doe@example.com</Text>
      <Button title="Edit Profile" onPress={() => alert("Edit Profile Coming Soon!")} />
      <Button title="Logout" onPress={() => alert("Logged Out!")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  info: { fontSize: 18, marginBottom: 20 },
});
