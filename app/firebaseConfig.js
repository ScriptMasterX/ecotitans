// Import the functions you need from the SDKs you need
import 'react-native-get-random-values'; // Ensures compatibility with Firebase

// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdwII3wVUJRBcAAna4zhikxjTWTRzHsas",
  authDomain: "trash-incentivizer.firebaseapp.com",
  projectId: "trash-incentivizer",
  storageBucket: "trash-incentivizer.appspot.com", // Corrected storageBucket URL
  messagingSenderId: "133867179822",
  appId: "1:133867179822:web:2905c172e9b00e5fecf4bf",
  measurementId: "G-P03BZ4MQGZ", // Optional, not needed for React Native
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export default app;
