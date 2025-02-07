import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { auth } from "../firebaseConfig";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail 
} from "firebase/auth";
import * as SecureStore from "expo-secure-store";

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState<boolean>(true); // Toggle between Login and Sign Up
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false); // Toggle for Reset Password

  const handleSignUp = async (): Promise<void> => {
    try {
      // const schoolDomain = "@student.guhsdaz.org";
      // if (!email.endsWith(schoolDomain)) {
      //   Alert.alert("Invalid Email", "Please use your school email to sign up.");
      //   return;
      // }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      if (user) {
        await sendEmailVerification(user);
        Alert.alert(
          "Verify Your Email",
          "A verification email has been sent to your school email. Please verify it before logging in."
        );
        setIsLogin(true); // Switch to Login after successful sign-up
      }
    } catch (error: any) {
      console.error("Sign-up error:", error.message);
      Alert.alert("Sign-Up Error", error.message);
    }
  };

  const handleLogin = async (): Promise<void> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        await auth.signOut(); // Immediately sign the user out
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before logging in. Check your inbox for the verification email."
        );
        return;
      }

      const token = await user.getIdToken();
      await SecureStore.setItemAsync("authToken", token);
      router.replace("/(tabs)/dashboard");
    } catch (error: any) {
      console.error("Login error:", error.message);
      Alert.alert("Login Error", error.message);
    }
  };

  const resendVerificationEmail = async () => {
    const user = auth.currentUser;

    if (user) {
      try {
        await sendEmailVerification(user);
        Alert.alert(
          "Verification Email Sent",
          "A new verification email has been sent to your email address. Please check your inbox."
        );
      } catch (error: any) {
        console.error("Error resending verification email:", error.message);
        Alert.alert("Error", "Failed to resend verification email.");
      }
    } else {
      Alert.alert("Error", "No user is signed in.");
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!email) {
        Alert.alert("Error", "Please enter your email address to reset your password.");
        return;
      }

      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Reset Email Sent",
        "A password reset email has been sent to your email. Please check your inbox."
      );
      setShowResetPassword(false); // Hide reset password view
    } catch (error: any) {
      console.error("Password reset error:", error.message);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      {showResetPassword ? (
        <>
          <Text style={styles.title}>Reset Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={"grey"}
            value={email}
            onChangeText={(text) => setEmail(text)}
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
            placeholderTextColor={"grey"}
            value={email}
            onChangeText={(text) => setEmail(text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={"grey"}
            value={password}
            onChangeText={(text) => setPassword(text)}
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
            <Text style={styles.switchLink} onPress={() => setIsLogin((prev) => !prev)}>
              {isLogin ? "Sign Up" : "Login"}
            </Text>
          </Text>
        </>
      )}
    </View>
  );
}

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
