import 'react-native-get-random-values'; // Ensures compatibility with Firebase
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore

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

// Initialize Firebase services
export const auth = getAuth(app); // Authentication
export const db = getFirestore(app); // Firestore
export default app;
