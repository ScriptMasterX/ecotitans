import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, Alert, Button } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { auth, db } from "../../firebaseConfig";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import * as Location from "expo-location";
import * as ImageManipulator from "expo-image-manipulator";
import { EXPO_PUBLIC_GOOGLE_VISION_KEY } from "@env";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState("start"); // "start", "qr", "trash"
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alertShown, setAlertShown] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const cameraRef = useRef(null);

  const SCHOOL_LOCATION = {
    latitude: 33.6086,  // Replace with your school’s latitude
    longitude: -112.0951, // Replace with your school’s longitude
    radius: 500, // Allowed radius in meters
  };
  
  // Request camera permissions
  const handleStartScan = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Permission Denied", "Camera access is required.");
        return;
      }
    }
    setStage("qr");
  };

  // Check if it's a valid school day & time
  const isSchoolDayAndTime = () => {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    return day >= 1 && day <= 5 && hours >= 11 && hours < 23; // 11AM - 1PM
  };

  // Handle QR code scanning
  const handleQRCodeScanned = ({ data }) => {
    if (scanned || alertShown) return; // Prevent multiple scans at once
  
    setScanned(true);
    setAlertShown(true);
  
    if (isSchoolDayAndTime()) {
      Alert.alert("QR Code Valid", `Data: ${data}. Proceeding to trash scanning.`, [
        {
          text: "OK",
          onPress: () => {
            setStage("trash");
            resetScanner();
          },
        },
      ]);
    } else {
      Alert.alert(
        "Invalid QR Code",
        "This QR code is only active during 11AM - 1PM.",
        [
          {
            text: "OK",
            onPress: () => resetScanner(),
          },
        ]
      );
    }
  };
  
  // Reset scanner after a delay to prevent multiple alerts
  const resetScanner = () => {
    setTimeout(() => {
      setScanned(false);
      setAlertShown(false);
    }, 1500); // Delay to prevent multiple scans
  };

  // Capture and analyze trash image
  const handleCapturePhoto = async () => {
    if (cameraRef.current) {
      const photoData = await cameraRef.current.takePictureAsync();
      setIsProcessing(true);
  
      const isAtSchool = await checkIfAtSchool();
      if (!isAtSchool) {
        Alert.alert("Location Restriction", "You must be at school to take a photo.");
        setIsProcessing(false);
        return;
      }
  
      const isValidTrash = await verifyTrashImage(photoData.uri);
      setIsProcessing(false);
  
      if (isValidTrash) {
        await saveScanData(auth.currentUser?.uid); // Store result, NOT image
        Alert.alert("Success", "Trash detected! You earned points.");
  
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
                  { type: "LABEL_DETECTION", maxResults: 10 },
                  { type: "WEB_DETECTION" },
                ],
              },
            ],
          }),
        }
      );

      const result = await response.json();
      console.log("Google Vision API Response:", JSON.stringify(result, null, 2));

      const labels = result.responses[0]?.labelAnnotations || [];
      const webEntities = result.responses[0]?.webDetection?.webEntities || [];

      const detectedWords = [
        ...labels.map((label) => label.description.toLowerCase()),
        ...webEntities.map((entity) => entity.description?.toLowerCase() || ""),
      ];

      console.log("Detected words:", detectedWords);

      const trashKeywords = [
        "garbage", "trash", "litter", "waste", "disposable", "used napkin", "dirty tissue",
        "crumpled paper", "rubbish", "wastebasket", "plastic bag", "debris", "tissue paper", "paper"
      ];

      return detectedWords.some((word) => trashKeywords.includes(word));
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
        <Text>Requesting permissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {stage === "start" ? (
        <>
          <Text style={styles.title}>Ready to Scan?</Text>
          <Button title="Scan QR Code" onPress={handleStartScan} />
        </>
      ) : stage === "qr" ? (
        <>
          <Text style={styles.title}>Scan QR Code</Text>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleQRCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          <Button title="Cancel" onPress={() => setStage("start")} />
        </>
      ) : (
        <>
          <Text style={styles.title}>Trash Scanning Stage</Text>
          <CameraView ref={cameraRef} style={styles.camera} />
          <Button title="Capture Trash Image" onPress={handleCapturePhoto} />
          {isProcessing && <Text>Processing image...</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginVertical: 20 },
  camera: { flex: 1, width: "100%" },
});
