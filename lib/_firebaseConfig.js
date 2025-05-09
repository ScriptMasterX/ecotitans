import "react-native-get-random-values";
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, doc, getDoc } from "firebase/firestore"; // ⬅️ Include doc/getDoc

const firebaseConfig = {
  apiKey: "AIzaSyCdwII3wVUJRBcAAna4zhikxjTWTRzHsas",
  authDomain: "trash-incentivizer.firebaseapp.com",
  projectId: "trash-incentivizer",
  storageBucket: "trash-incentivizer.appspot.com",
  messagingSenderId: "133867179822",
  appId: "1:133867179822:web:2905c172e9b00e5fecf4bf",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

// ✅ Utility to dynamically fetch Review Mode
export const fetchReviewMode = async () => {
  try {
    const configDoc = await getDoc(doc(db, "config", "appFlags"));
    return configDoc.exists() && configDoc.data()?.reviewMode === true;
  } catch (error) {
    console.error("🔥 Error checking review mode:", error);
    return false;
  }
};

export { auth, db };
export default app;


