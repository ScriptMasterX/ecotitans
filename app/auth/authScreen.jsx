import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../../lib/_firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import * as SecureStore from "expo-secure-store";
import { doc, setDoc } from "firebase/firestore";

export default function AuthScreen() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);          // <-- no generics
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const getRandomNumber = () => Math.floor(Math.random() * 9);

  /* --------------------------- sign‑up --------------------------- */
  const handleSignUp = async () => {
    if (!email.endsWith("guhsdaz.org")) {
      Alert.alert(
        "Restricted Email",
        "You must use a @guhsdaz.org email to sign up."
      );
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (user) {
        await sendEmailVerification(user);

        Alert.alert(
          "Verify Your Email",
          "A verification email has been sent. Please verify before logging in."
        );

        await setDoc(doc(db, "users", user.uid), {
          name: `Guest ${Math.floor(100000 + Math.random() * 900000)}`,
          email: user.email,
          points: 0,
          lifetimePoints: 0,
          lastScan: null,
          isAdmin: false,
          scanCount: 0,
          avatarIndex: getRandomNumber(),
          scanLog: [],
          claimedMissions: [],
        });

        console.log("✅ Firestore document created for new user");
        await auth.signOut();
        setIsLogin(true);
      }
    } catch (error) {
      console.error("Sign‑up error:", error.message);
      Alert.alert("Sign‑Up Error", error.message);
    }
  };

  /* --------------------------- login --------------------------- */
  const handleLogin = async () => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      if (!user.emailVerified) {
        await auth.signOut();
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before logging in."
        );
        return;
      }

      const token = await user.getIdToken();
      await SecureStore.setItemAsync("authToken", token);
      router.replace("/(tabs)/dashboard");
    } catch (error) {
      console.error("Login error:", error.message);
      Alert.alert("Login Error", error.message);
    }
  };

  /* --------------------- verification / reset -------------------- */
  const resendVerificationEmail = async () => {
    const user = auth.currentUser;
    if (!user) return Alert.alert("Error", "No user is signed in.");

    try {
      await sendEmailVerification(user);
      Alert.alert(
        "Verification Email Sent",
        "A new verification email has been sent. Please check your inbox."
      );
    } catch (error) {
      console.error("Resend verification error:", error.message);
      Alert.alert("Error", "Failed to resend verification email.");
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Reset Email Sent",
        "A password‑reset email has been sent. Please check your inbox."
      );
      setShowResetPassword(false);
    } catch (error) {
      console.error("Password reset error:", error.message);
      Alert.alert("Error", error.message);
    }
  };

  /* ------------------------------ UI ----------------------------- */
  return (
    <View style={styles.container}>
      {showResetPassword ? (
        <>
          <Text style={styles.title}>Reset Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="grey"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button title="Send Reset Email" onPress={handleResetPassword} />
          <Text style={styles.switchText}>
            Remembered your password?{" "}
            <Text style={styles.switchLink} onPress={() => setShowResetPassword(false)}>
              Login
            </Text>
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>{isLogin ? "Login" : "Sign Up"}</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="grey"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="grey"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title={isLogin ? "Login" : "Sign Up"}
            onPress={isLogin ? handleLogin : handleSignUp}
          />

          {isLogin && (
            <Text style={styles.switchText}>
              Forgot your password?{" "}
              <Text style={styles.switchLink} onPress={() => setShowResetPassword(true)}>
                Reset Password
              </Text>
            </Text>
          )}

          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <Text style={styles.switchLink} onPress={() => setIsLogin(!isLogin)}>
              {isLogin ? "Sign Up" : "Login"}
            </Text>
          </Text>
        </>
      )}
    </View>
  );
}

/* ---------------------------- styles ---------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  switchText: {
    marginTop: 15,
    textAlign: "center",
  },
  switchLink: {
    color: "blue",
    fontWeight: "bold",
  },
});
