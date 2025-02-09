import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, Alert, Button, Modal, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { auth, db } from "../../firebaseConfig";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import * as Location from "expo-location";
import * as ImageManipulator from "expo-image-manipulator";
import { useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import { Platform } from "react-native";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState("start"); // "start", "qr", "trash"
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alertShown, setAlertShown] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState(""); // Stores QR scan result
  GOOGLE_VISION_KEY = Constants.expoConfig.extra.EXPO_PUBLIC_GOOGLE_VISION_KEY
  const cameraRef = useRef(null);

  const SCHOOL_LOCATION = {
    latitude: 33.6086,  // Replace with your school’s latitude
    longitude: -112.0951, // Replace with your school’s longitude
    radius: 3500, // Allowed radius in meters
  };
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // When the screen loses focus, reset scanning state
        setStage("start");
        setScanned(false);
      };
    }, [])
  );
  // Request camera permissions
  // ✅ Request permissions before allowing the scan to start
  const handleStartScan = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location access is required.");
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
    setAlertShown(false);
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text>Please enable camera permissions in your settings.</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }
  
  // Check if it's a valid school day & time
  const isSchoolDayAndTime = () => {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    // return day >= 1 && day <= 6 && hours >= 7 && hours < 23; // 11AM - 1PM
    return true;
  };

  // Handle QR code scanning
  const handleQRCodeScanned = ({ data }) => {
    if (scanned || modalVisible) return; // Prevent multiple scans
  
    setScanned(true); // Disable further scanning
    if (Platform.OS === "android") {
      setTimeout(() => {
        setStage("start");
      }, 110); // Small delay before switching
      setTimeout(() => {
        setStage("trash");
      }, 150); // Small delay before switching
    } else {
      setStage("trash")
    }
  };
  


  // Capture and analyze trash image
  const handleCapturePhoto = async () => {
    if (cameraRef.current) {
      setIsProcessing(true); // Disable button while processing
      const photoData = await cameraRef.current.takePictureAsync();

      const isAtSchool = await checkIfAtSchool();
      if (!isAtSchool) {
          Alert.alert("Location Restriction", "You must be at school to take a photo.");
          setStage("start");
          return;
      }

      const isValidTrash = await verifyTrashImage(photoData.uri);
      setIsProcessing(false); // Re-enable button after processing

      if (isValidTrash) {
          await saveScanData(auth.currentUser?.uid); // Store result, NOT image
          Alert.alert("Success", "Trash detected! You earned points.");
          setIsProcessing(false); // Re-enable button
          setStage("start");
          setScanned(false);
          setCameraActive(true);
      } else {
          Alert.alert("Invalid Image", "This does not appear to be trash. Try again.");
      }

      setPhoto(null); // Clear the image
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
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required.");
        return false;
      }
  
      const location = await Location.getCurrentPositionAsync({});
      const userLatitude = location.coords.latitude;
      const userLongitude = location.coords.longitude;
  
      // Calculate distance to school
      const distance = getDistanceFromLatLonInMeters(
        userLatitude,
        userLongitude,
        SCHOOL_LOCATION.latitude,
        SCHOOL_LOCATION.longitude
      );
  
      console.log(`User distance from school: ${distance} meters`);
  
      return distance <= SCHOOL_LOCATION.radius; // Returns true if within allowed radius
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
                  { type: "WEB_DETECTION", maxResults: 10 },  // Finds similar objects online
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
  
      // ✅ Extract localized objects (specific objects)
      const localizedObjects = result.responses[0]?.localizedObjectAnnotations || [];
      console.log("📍 Detected Objects:", localizedObjects.map((obj) => obj.name));
  
      // ✅ Extract web detection results (online reference)
      const webEntities = result.responses[0]?.webDetection?.webEntities || [];
      console.log("🌐 Web Entities:", webEntities.map((entity) => entity.description));
  
      // ✅ Trash detection
      const trashKeywords = ["garbage", "trash", "litter", "waste", "disposable", "debris", "paper", "plastic"];
      const trashDetected = labels.some((label) => trashKeywords.includes(label.description.toLowerCase()));
  
      // ✅ Trash can detection (Check in OBJECT_LOCALIZATION & WEB_DETECTION)
      const trashCanKeywords = ["trash can", "waste bin", "garbage can", "dustbin", "recycle bin", "waste container"];
      const trashCanDetected =
        localizedObjects.some((obj) => trashCanKeywords.includes(obj.name.toLowerCase())) ||
        webEntities.some((entity) => trashCanKeywords.includes(entity.description?.toLowerCase()));
  
      console.log("🗑️ Trash detected:", trashDetected);
      console.log("♻️ Trash Can detected:", trashCanDetected);
  
      // ✅ Must detect BOTH trash AND trash can
      // return trashDetected && trashCanDetected;
      return trashDetected;
  
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
  
      if (docSnap.exists()) {
        await updateDoc(scanRef, {
          lastScan: new Date(),
          points: (docSnap.data().points || 0) + 10, // Add points
        });
      } else {
        await setDoc(scanRef, {
          email: auth.currentUser?.email,
          lastScan: new Date(),
          points: 10,
        });
      }
  
      // ✅ Show success message & refresh dashboard
      Alert.alert("Success", "Trash detected! Points updated.");
  
    } catch (error) {
      console.error("Error saving scan data:", error);
    }
  };
  

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text>Please Enable Camera Permissions</Text>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      {stage === "qr" ? (
        <>
          {/* ✅ Ensure Title is Visible on Top */}
          <View style={styles.overlay}>
            <Text style={styles.topTitle}>Scan QR Code</Text>
          </View>
  
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleQRCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
  
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
  
          <CameraView ref={cameraRef} style={styles.camera} />
  
          {/* ✅ Capture Trash Image Button in the Center */}
          <View style={styles.captureButtonContainer}>
            <Button 
              title={isProcessing ? "Processing image..." : "Capture Trash Image" }
              onPress={handleCapturePhoto} 
              disabled={isProcessing} 
              color={isProcessing ? "gray" : "white"} 
            />
          </View>
  
          {/* ✅ Cancel Button Below the Capture Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={() => setStage("start")}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.title}>Ready to Scan?</Text>
          <Button title="Scan QR Code" onPress={handleStartScan} />
        </>
      )}
    </View>
  );
  
  
  
}  

const styles = StyleSheet.create({
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
    zIndex: "10"
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
  cancelButtonText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
  },
});
