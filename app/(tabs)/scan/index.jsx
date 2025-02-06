import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, Alert, Button, Modal, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { auth, db } from "../../firebaseConfig";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import * as Location from "expo-location";
import * as ImageManipulator from "expo-image-manipulator";
import { useFocusEffect } from "expo-router";
// import { EXPO_PUBLIC_GOOGLE_VISION_KEY } from "@env";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState("start"); // "start", "qr", "trash"
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alertShown, setAlertShown] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState(""); // Stores QR scan result
  EXPO_PUBLIC_GOOGLE_VISION_KEY = "AIzaSyCOSDBcgbMezGHjsm5liRy30TVVtDg4rtk"
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
    setScanned(false)
    setAlertShown(false)
  };
  
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
  
    setTimeout(() => {
      setStage("start");
    }, 10); // Small delay before switching
    setTimeout(() => {
      setStage("trash");
    }, 15); // Small delay before switching
  };
  


  // Capture and analyze trash image
  const handleCapturePhoto = async () => {
    if (cameraRef.current) {
      const photoData = await cameraRef.current.takePictureAsync();
      setIsProcessing(true);
  
      const isAtSchool = await checkIfAtSchool();
      if (!isAtSchool) {
        Alert.alert("Location Restriction", "You must be at school to take a photo.");
        setStage("start");
        setIsProcessing(false);
        return;
      }
  
      const isValidTrash = await verifyTrashImage(photoData.uri);
      setIsProcessing(false);
  
      if (isValidTrash) {
        await saveScanData(auth.currentUser?.uid); // Store result, NOT image
        Alert.alert("Success", "Trash detected! You earned points.");
        setStage("start");
        // Reset state and return to QR scanning
        setStage("qr");
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
        `https://vision.googleapis.com/v1/images:annotate?key=${EXPO_PUBLIC_GOOGLE_VISION_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64Image },
                features: [
                  { type: "LABEL_DETECTION", maxResults: 10 }, // Detects trash
                  { type: "OBJECT_LOCALIZATION", maxResults: 10 }, // Detects objects like trash cans
                ],
              },
            ],
          }),
        }
      );
  
      const result = await response.json();
      console.log("Google Vision API Response:", JSON.stringify(result, null, 2));
  
      // Extract detected labels
      const labels = result.responses[0]?.labelAnnotations || [];
      const localizedObjects = result.responses[0]?.localizedObjectAnnotations || [];
  
      // ✅ Check if trash exists
      const trashKeywords = [
        "garbage", "trash", "litter", "waste", "disposable", "used napkin", 
        "dirty tissue", "crumpled paper", "rubbish", "plastic bag", "debris", 
        "tissue paper", "paper"
      ];
      const trashDetected = labels.some((label) => trashKeywords.includes(label.description.toLowerCase()));
  
      // ✅ Check if a trash can is detected
      const trashCanKeywords = ["trash can", "waste bin", "garbage can", "dustbin", "silver"];
      const trashCanDetected = localizedObjects.some((obj) =>
        trashCanKeywords.includes(obj.name.toLowerCase())
      );
  
      console.log("Trash detected:", trashDetected);
      console.log("Trash Can detected:", trashCanDetected);
  
      // ✅ Final condition: Both trash and a trash can must be present
      // return trashDetected && trashCanDetected;
      return trashDetected
  
    } catch (error) {
      console.error("Error verifying image:", error);
      console.log("Google Vision API Response:", JSON.stringify(result, null, 2));
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
    <View style={styles.container}>
      {stage === "qr" ? (
        <>
          <Text style={styles.title}>Scan QR Code</Text>
          <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(false);
              setScanned(false);
            }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>{modalMessage}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setModalVisible(false);
                    setScanned(false); // Re-enable scanning after closing modal
                  }}
                >
                  <Text style={styles.buttonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <CameraView
            ref={cameraRef}
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleQRCodeScanned} // ✅ Disable scanning if `scanned` is true
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          {console.log(scanned)}
          {scanned && <Text style={styles.processingText}>Processing QR Code...</Text>}
          <Button title="Cancel" onPress={() => setStage("start")} />
        </>
      ) : stage === "trash" ? (
        <>
          <Text style={styles.title}>Trash Scanning Stage</Text>
          <CameraView ref={cameraRef} style={styles.camera} />
          <Button title="Capture Trash Image" onPress={handleCapturePhoto} />
          {isProcessing && <Text>Processing image...</Text>}
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
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginVertical: 20 },
  camera: { flex: 1, width: "100%" },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Dark transparent background
  },
  modalContent: {
    width: "80%",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
  },
  modalText: {
    fontSize: 18,
    marginBottom: 15,
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  
});
