import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Alert, Button, Modal, TouchableOpacity, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { auth, db } from "../../../lib/_firebaseConfig";
import { doc, setDoc, updateDoc, getDoc, onSnapshot, increment } from "firebase/firestore";

import * as Location from "expo-location";
import * as ImageManipulator from "expo-image-manipulator";
import { useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import { Platform, Linking } from "react-native";
import { fetchReviewMode } from "../../../lib/_firebaseConfig";


export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState("start"); // "start", "qr", "trash"
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState(""); // Stores QR scan result
  const [rewardDetails, setRewardDetails] = useState(null);
  const [howItWorksVisible, setHowItWorksVisible] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);
  const [cooldownModalVisible, setCooldownModalVisible] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const cooldownMinutes = 15;
  const [countdown, setCountdown] = useState('');


  const GOOGLE_VISION_KEY = Constants.expoConfig.extra.EXPO_PUBLIC_GOOGLE_VISION_KEY
  const cameraRef = useRef(null);
  const [locationDeniedPermanently, setLocationDeniedPermanently] = useState(false);
  
  const SCHOOL_LOCATION = {
    latitude: 33.6086,  // Replace with your school’s latitude
    longitude: -112.0951, // Replace with your school’s longitude
    radius: 900, // Allowed radius in meters
  };
  const [REVIEW_MODE, setReviewMode] = useState(false);

  useEffect(() => {
    const getReviewMode = async () => {
      const mode = await fetchReviewMode();
      setReviewMode(mode);
    };
    getReviewMode();
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      const checkLocationPermission = async () => {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          setLocationDeniedPermanently(false);
        }
      };
  
      checkLocationPermission();
  
      return () => {
        setStage("start");
        setScanned(false);
      };
    }, [])
  );
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
  
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setLastScanTime(userData.lastScan?.toDate() || null);
      }
    });
  
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (!lastScanTime) return;
  
    const interval = setInterval(() => {
      const now = new Date();
      const diffMs = cooldownMinutes * 60 * 1000 - (now - lastScanTime);
  
      if (diffMs > 0) {
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        setCountdown(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      } else {
        setCountdown('');
      }
    }, 1000);
  
    return () => clearInterval(interval);
  }, [lastScanTime]);
  
  
  const isCooldownOver = () => {
    if (!lastScanTime) return true;
    const now = new Date();
    const diffMs = now - new Date(lastScanTime);
    const diffMins = diffMs / 1000 / 60;
    return diffMins >= cooldownMinutes;
  };
  

  if (permission === null || permission === undefined) {
    return (
      <View style={styles.container}>
        <Text>Loading camera permissions...</Text>
      </View>
    );
  }
  const incrementScanCount = async (userId) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      scanCount: increment(1),
    });
  };
  // Request camera permissions
  // ✅ Request permissions before allowing the scan to start
  const handleStartScan = async () => {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      if (!canAskAgain) {
        setLocationDeniedPermanently(true);
      } else {
        Alert.alert(
          "Location Access Needed",
          "We use your location to confirm you are on school property before submitting trash scans. Please enable location in Settings."
        );
      }
      return;
    }
    
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Permission Denied", "Camera access is required.");
        return;
      }
    }

    setStage("qr"); // Proceed to QR scanning
    setScanned(false);
  };
  if (locationDeniedPermanently) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", marginBottom: 20 }}>
          Location access is required to verify that you're on school grounds. Please enable location permissions in your device settings.
        </Text>
        <Button
          title="Open Settings"
          onPress={() => {
            if (Platform.OS === "ios") {
              Linking.openURL("app-settings:");
            } else {
              Linking.openSettings();
            }
          }}
        />
      </View>
    );
  }
  
  
  // Check if it's a valid school day & time
  const isSchoolDayAndTime = () => {
    if (REVIEW_MODE) {
      console.log("🚨 Apple Review Mode: Skipping school day/time check");
      return true;
    }

    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    return day >= 1 && day <= 6 && hours >= 7 && hours < 23; // 11AM - 1PM
    // return true;
  };

  // Handle QR code scanning
  const handleQRCodeScanned = async ({ data }) => { 
    if (scanned || modalVisible) return; // Prevent multiple scans
  
    setScanned(true); // Disable further scanning
    
    if (data.startsWith("TRASH-")) {
      if (!isCooldownOver()) {
        console.log("🚫 Cooldown active");
        setStage("start");
      
        // Wait until the stage switches back to 'start', then show modal
        setTimeout(() => {
          setCooldownModalVisible(true)
        }, 100); // short delay to let camera close first
        return;
      } else if (Platform.OS === "android") { // If it's a trash can QR code, proceed to trash scanning
        setTimeout(() => {
          setStage("start");
        }, 110); // Small delay before switching
        setTimeout(() => {
          setStage("trash");
        }, 150); // Small delay before switching
      } else {
        setStage("trash")
      }
    } else {
      // ✅ Assume it's a Firestore Order ID and check Firestore
      await verifyRewardQRCode(data);
    }
      
      
    
  };
  // ✅ Verify Reward QR Code in Firestore
  const verifyRewardQRCode = async (orderId) => {
    try {
        console.log(`🔍 Scanning QR Code for order ID: ${orderId}...`);

        const user = auth.currentUser;
        if (!user) return;

        // ✅ Check if the user is an admin
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || !userSnap.data().isAdmin) {
            console.log("🚫 User is NOT an admin. Access denied.");
            setModalMessage("Access Denied: You do not have permission to scan reward QR codes.");
            setModalVisible(true);
            setScanned(false);
            return;
        }

        console.log("✅ User is an admin. Proceeding to check order...");

        // ✅ Fetch latest order details
        const orderRef = doc(db, "orders", orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            console.log("❌ Order does not exist in Firestore.");
            setModalMessage("Invalid QR Code: This reward order does not exist.");
            setModalVisible(true);
            setScanned(false);
            return;
        }

        const orderData = orderSnap.data();
        console.log("📄 Firestore returned order data:", orderData);

        // ✅ Check if order was already redeemed BEFORE setting state
        if (orderData.status === "Redeemed") {
            console.log(`⚠️ Order ${orderId} is already redeemed. Blocking modal.`);
            setModalMessage("Already Redeemed: This reward has already been claimed.");
            setModalVisible(true);
            setScanned(false);
            return;
        }

        console.log("✅ Order is valid and not yet redeemed. Updating state and opening modal...");
        
        // ✅ Only update state if the order is still valid
        setRewardDetails({ orderId, ...orderData });
        setModalVisible(true);

    } catch (error) {
        console.error("❌ Error verifying reward:", error);
        setModalMessage("Error: Could not verify reward.");
        setModalVisible(true);
        setScanned(false);
    }
};


  
// ✅ Mark Order as Redeemed
const confirmRewardRedemption = async () => {
  try {
    console.log("🔄 Starting reward redemption process...");

    const orderRef = doc(db, "orders", rewardDetails.orderId);

    await updateDoc(orderRef, { status: "Redeemed" });

    console.log(`Order ${rewardDetails.orderId} marked as Redeemed in Firestore.`);

    // 🔁 NEW: Update monthly redemption counters
    const rewardKey = getRewardKeyFromName(rewardDetails.rewardName);

    if (rewardKey) {
      const redemptionRef = doc(db, "monthlyRedemptions", "currentMonth");
      await updateDoc(redemptionRef, {
        [rewardKey]: increment(1),
      });
      console.log(`Incremented ${rewardKey} in monthlyRedemptions`);
    } else {
      console.warn("Unrecognized reward name for monthly tracking.");
    }

    Alert.alert(
      "Redemption Confirmed",
      `The reward "${rewardDetails.rewardName}" has been successfully redeemed!`
    );

    setScanned(false);
    setModalVisible(false);
    setStage("start");

    fetchUpdatedOrder(rewardDetails.orderId);

  } catch (error) {
    console.error("Error confirming redemption:", error);
    Alert.alert("Error", "Could not confirm redemption.");
  }
};

const getRewardKeyFromName = (rewardName) => {
  if (rewardName.includes("$20")) return "twenty";
  if (rewardName.includes("$10")) return "ten";
  if (rewardName.includes("$5")) return "five";
  if (rewardName.includes("$3")) return "three";
  if (rewardName.includes("$1")) return "one";
  return null;
};



const fetchUpdatedOrder = async (orderId) => {
  try {
      console.log(`🔄 Fetching updated order data for ID: ${orderId}...`);

      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
          const updatedOrder = orderSnap.data();
          console.log("📄 Firestore returned updated order data:", updatedOrder);

          // ✅ If the order is now redeemed, update local state
          if (updatedOrder.status === "Redeemed") {
              console.log("✅ Order is now Redeemed. Updating local state...");
              setRewardDetails((prevDetails) => ({
                  ...prevDetails,
                  status: "Redeemed",
              }));
          } else {
              console.log("⚠️ Order is NOT marked as Redeemed yet.");
          }
      } else {
          console.log("❌ Order not found in Firestore.");
      }
  } catch (error) {
      console.error("❌ Error fetching updated order:", error);
  }
};


  // Capture and analyze trash image
  const handleCapturePhoto = async () => {
    if (cameraRef.current) {
      setIsProcessing(true); // Disable button while processing
      const photoData = await cameraRef.current.takePictureAsync();

      const isAtSchool = await checkIfAtSchool();
      const isSchoolDay = await isSchoolDayAndTime();
      if (!isAtSchool) {
          Alert.alert("Location Restriction", "You must be at school to take a photo.");
          setStage("start");
          setIsProcessing(false);
          return;
      } else if (!isSchoolDay) {
          Alert.alert("Time Restriction", "You can only take a photo during school days from 11am-1pm.");
          setStage("start");
          setIsProcessing(false);
          return;
      }
      
      const isValidTrash = await verifyTrashImage(photoData.uri);
      setIsProcessing(false); // Re-enable button after processing

      if (isValidTrash) {
          await saveScanData(auth.currentUser?.uid); // Store result, NOT image
          setIsProcessing(false); // Re-enable button
          setStage("start");
          setScanned(false);
      } else {
          Alert.alert("Invalid Image", "This does not appear to be trash. Try again.");
      }

    } if (!cameraRef.current) {
      Alert.alert("Camera not ready", "Please try again.");
      return;
    }    
};

  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c; // Distance in meters
  };
  
  const checkIfAtSchool = async () => {
    if (REVIEW_MODE) {
      console.log("🚨 Review Mode Active: bypassing location check");
      return true;
    }
  
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required.");
        return false;
      }
  
      const location = await Location.getCurrentPositionAsync({});
      const userLatitude = location.coords.latitude;
      const userLongitude = location.coords.longitude;
  
      const distance = getDistanceFromLatLonInMeters(
        userLatitude,
        userLongitude,
        SCHOOL_LOCATION.latitude,
        SCHOOL_LOCATION.longitude
      );
  
      return distance <= SCHOOL_LOCATION.radius;
    } catch (error) {
      console.error("Error getting location:", error);
      return false;
    }
  };
  
  // Google Vision API call to verify trash
  const verifyTrashImage = async (photoUri) => {
    try {
      const base64Image = await convertImageToBase64(photoUri);
  
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64Image },
                features: [
                  { type: "LABEL_DETECTION", maxResults: 10 },  // General tags
                  { type: "OBJECT_LOCALIZATION", maxResults: 10 }, // Objects like trash cans
                ],
              },
            ],
          }),
        }
      );
  
      const result = await response.json();
      console.log("📸 Google Vision API Response:", JSON.stringify(result, null, 2));
  
      // ✅ Extract detected labels (general tags)
      const labels = result.responses[0]?.labelAnnotations || [];
      console.log("📝 Detected Labels:", labels.map((label) => label.description));
  
      // ✅ Trash detection
      const trashKeywords = ["aluminum", "foil", "silver", "waste", "disposable", "debris", "paper", "plastic"];
      const trashDetected = labels.some((label) => trashKeywords.includes(label.description.toLowerCase()));
  
      // ✅ Trash can detection (Check in OBJECT_LOCALIZATION & WEB_DETECTION)
      const trashCanKeywords = ["trash can", "waste bin", "garbage can", "dustbin", "recycle bin", "Waste container", "waste containment" , "Cleanliness", "Lid"];
      const trashCanDetected = labels.some((label) => trashCanKeywords.includes(label.description.toLowerCase()));
      console.log("🗑️ Trash detected:", trashDetected);
      console.log("♻️ Trash Can detected:", trashCanDetected);
  
      // ✅ Must detect BOTH trash AND trash can
      return trashDetected && trashCanDetected;
      // return true
  
    } catch (error) {
      console.error("Error verifying image:", error);
      return false;
    }
  };

  // Convert image to base64 for API
  const convertImageToBase64 = async (uri) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri, [{ resize: { width: 500 } }], { base64: true }
    );
    return manipResult.base64;
  };

  // Save scan data to Firestore (without storing image)
  const saveScanData = async (userId) => {
    if (!userId) return;
  
    try {
      const scanRef = doc(db, "users", userId);
      const docSnap = await getDoc(scanRef);
  
      const today = new Date().toDateString(); // 'Mon Apr 22 2025'
  
      if (docSnap.exists()) {
        const existingScanLog = docSnap.data().scanLog || [];
        const updatedScanLog = existingScanLog.includes(today)
          ? existingScanLog
          : [...existingScanLog, today];
  
        await updateDoc(scanRef, {
          lastScan: new Date(),
          points: (docSnap.data().points || 0) + 20,
          lifetimePoints: (docSnap.data().lifetimePoints || 0) + 20,
          scanCount: increment(1),
          scanLog: updatedScanLog, // 🆕 add/update scanLog
        });
      } else {
        await setDoc(scanRef, {
          email: auth.currentUser?.email,
          lastScan: new Date(),
          points: 20,
          lifetimePoints: 20,
          scanCount: 1,
          scanLog: [today], // 🆕 initialize with today's date
        });
      }
  
      Alert.alert("Success", "Trash detected! You earned 20 points!");
    } catch (error) {
      console.error("Error saving scan data:", error);
    }
  };
  
  
  

  if (!permission?.granted) {
    if (permission?.status === "denied" && !permission?.canAskAgain) {
      return (
        <View style={styles.container}>
          <Text style={{ textAlign: "center", marginBottom: 20 }}>
            Camera access is required to scan QR codes and verify trash disposal. Please enable access in your device settings.
          </Text>
          <Button
            title="Open Settings"
            onPress={() => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            }}
          />
        </View>
      );
    }
  
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", marginBottom: 20 }}>
          This app uses your camera to scan QR codes and detect trash. Please allow access when prompted.
        </Text>
        <Button title="Continue" onPress={requestPermission} />
      </View>
    );
  }
  if (!CameraView || !permission) {
    return (
      <View style={styles.container}>
        <Text>Loading camera module...</Text>
      </View>
    );
  }
  

  return (
    <View style={styles.cameraContainer}>
      <Modal visible={cooldownModalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⏳ Cooldown Active</Text>
            <Text style={{ marginBottom: 10 }}>You can scan again in {countdown}.</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setCooldownModalVisible(false)}>
              <Text style={styles.buttonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {stage === "qr" ? (
        <>
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                {rewardDetails ? (
                  <>
                    <Text style={styles.modalTitle}>
                      {rewardDetails.status === "Redeemed" ? "Already Redeemed" : "Confirm Redemption"}
                    </Text>
                    
                    <Text>Reward: {rewardDetails?.rewardName}</Text>
                    <Text>Cost: {rewardDetails?.cost} Points</Text>

                    {rewardDetails.status === "Redeemed" ? (
                      // ✅ If already redeemed, show a message and only allow closing
                      <>
                        <Text style={{ color: "red", fontWeight: "bold", marginTop: 10 }}>
                          This reward has already been claimed.
                        </Text>
                        <Button 
                          title="Close" 
                          onPress={() => { setModalVisible(false); setScanned(false); }} 
                          color="red" 
                        />
                      </>
                    ) : (
                      // ✅ Otherwise, show confirmation buttons
                      <>
                        <Button title="✅ Confirm" onPress={confirmRewardRedemption} color="green" />
                        <Button title="❌ Cancel" onPress={() => { setModalVisible(false); setScanned(false); }} color="blue" />
                      </>
                    )}
                  </>
                ) : (
                  // ✅ Fallback for general errors
                  <>
                    <Text style={styles.modalTitle}>Error</Text>
                    <Text>{modalMessage}</Text>
                    <Button title="Close" onPress={() => { setModalVisible(false); setScanned(false); }} color="red" />
                  </>
                )}
              </View>
            </View>
          </Modal>
          

          {/* ✅ Ensure Title is Visible on Top */}
          <View style={styles.overlay}>
            <Text style={styles.topTitle}>Scan QR Code</Text>
          </View>
  
          {permission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              onBarcodeScanned={scanned ? undefined : handleQRCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              zoom={0}
            />
          ) : null}


  
          {scanned && <Text style={styles.processingText}>Processing QR Code...</Text>}
  
          {/* ✅ Cancel Button at the Bottom */}
          <TouchableOpacity style={styles.cancelButton} onPress={() => setStage("start")}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : stage === "trash" ? (
        <>
          {/* ✅ Title for Trash Scanning */}
          <View style={styles.overlay}>
            <Text style={styles.topTitle}>Trash Scanning Stage</Text>
          </View>
  
          <CameraView ref={cameraRef} style={styles.camera} zoom={0} />
  
          {/* ✅ Capture Trash Image Button in the Center */}
          <TouchableOpacity
            style={styles.captureButtonContainer}
            onPress={() => {
              if (!isProcessing) handleCapturePhoto();
            }}
            
          >
            <Text
              style={{
                color: isProcessing ? "gray" : "white"
              }}
            >
              {isProcessing ? "Processing image..." : "Capture Trash Image" }
            </Text>
          </TouchableOpacity>
  
          {/* ✅ Cancel Button Below the Capture Button */}
          <TouchableOpacity 
            style={[styles.cancelButton, isProcessing && { opacity: 0.5 }]} 
            onPress={() => !isProcessing && setStage("start")}
            disabled={isProcessing}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

        </>
      ) : (
        <>
          <Text style={styles.title}>Ready to Scan?</Text>
          <Text style={styles.subtitle}>
            Make sure you're near a trash can and ready to scan the QR code!
          </Text>
          <Image 
            source={require("../../../assets/images/QRTemplate.png")}
            style={{ width: 200, height: 200 }} // Adjust the size as needed
          />
          <TouchableOpacity style={styles.ctaButton} onPress={handleStartScan}>
            <Text style={styles.ctaButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoButton} onPress={() => setHowItWorksVisible(true)}>
            <Text style={styles.infoButtonText}>How it works</Text>
          </TouchableOpacity>
          <Modal
            animationType="slide"
            transparent={true}
            visible={howItWorksVisible}
            onRequestClose={() => setHowItWorksVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>How It Works</Text>
                <Text style={{ marginBottom: 10 }}>
                  Scan a trash can QR code, then take a picture of your trash. Make sure both the trash can and the trash are visible in the picture. If our system detects valid trash in the photo, you’ll earn points!
                </Text>
                <Text style={[styles.modalTitle, { fontSize: 16 }]}>What's Allowed</Text>
                <Text>Empty juice boxes</Text>
                <Text>Candy wrappers</Text>
                <Text>Plastic bottles</Text>
                <Text>Napkins</Text>
                <Text>Wrappers</Text>
                <Text>Disposable utensils</Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setHowItWorksVisible(false)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        </>
      )}
    </View>
  );
  
  
  
}  

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%"
  },
  cameraContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  /* ✅ Keeps Title Visible on Top */
  overlay: {
    position: "absolute",
    top: 50, // Keep it at the top of the screen
    width: "100%",
    alignItems: "center",
  },
  topTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    textAlign: "center",
    zIndex: 10
  },
  title: {
    fontSize: 30,
    marginBottom: 15
  },
  /* ✅ Capture Button Positioned Lower */
  captureButtonContainer: {
    position: "absolute",
    bottom: "20%",
    width: "80%",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10
  },
  /* ✅ Cancel Button at the Bottom */
  cancelButton: {
    position: "absolute",
    bottom: 50,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10
  },
  processingText: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 15,
    paddingHorizontal: 40,
    color: "white",
    borderRadius: 10
  },
  cancelButtonText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",

  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Dark overlay background
  },
  modalContent: {
    width: "80%",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
    elevation: 5, // Shadow effect for Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  warningText: {
    fontSize: 14,
    color: "red",
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#007BFF",
    width: "100%",
    alignItems: "center",
  },
  confirmButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "green",
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
    color: "#444",
    width: "75%"
  },
  ctaButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  ctaButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  infoButton: {
    backgroundColor: "transparent",
    padding: 19
  },
  infoButtonText: {
    color: "#5C7FF2",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center"
  },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modalBox: {
      backgroundColor: '#fff',
      padding: 20,
      borderRadius: 10,
      width: '80%'
    },
    modalText: {
      marginBottom: 15,
      fontSize: 16,
      textAlign: 'center'
    }
  
  
});