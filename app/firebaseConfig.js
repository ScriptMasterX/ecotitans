import "react-native-get-random-values"; // Ensures compatibility with Firebase
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore"; // Firestore

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdwII3wVUJRBcAAna4zhikxjTWTRzHsas",
  authDomain: "trash-incentivizer.firebaseapp.com",
  projectId: "trash-incentivizer",
  storageBucket: "trash-incentivizer.appspot.com",
  messagingSenderId: "133867179822",
  appId: "1:133867179822:web:2905c172e9b00e5fecf4bf",
};

// Initialize Firebase app (ensure it's not already initialized to avoid errors)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app); // Firestore instance

export { auth, db };
export default app;



