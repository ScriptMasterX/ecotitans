import { View, Text, StyleSheet, Button, Alert } from "react-native";

export default function Profile() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.info}>Name: John Doe</Text>
      <Text style={styles.info}>Email: john.doe@example.com</Text>
      {/* Wrap Button in a View for styling */}
      <View style={styles.buttonContainer}>
        <Button
          title="Edit Profile"
          onPress={() => Alert.alert("Edit Profile Coming Soon!")}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title="Logout"
          onPress={() => Alert.alert("Logged Out!")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  info: { fontSize: 18, marginBottom: 20 },
  buttonContainer: { marginBottom: 10 }, // Style for button wrappers
});
