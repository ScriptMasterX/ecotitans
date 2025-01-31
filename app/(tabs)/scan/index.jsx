import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Alert, Button, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera"; // Correct usage
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db } from "../../firebaseConfig";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import * as ImageManipulator from "expo-image-manipulator"; // For compressing images before upload
import { EXPO_PUBLIC_GOOGLE_VISION_KEY } from "@env";

// const GOOGLE_VISION_KEY = "AIzaSyCOSDBcgbMezGHjsm5liRy30TVVtDg4rtk"; // Hardcoded key

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [stage, setStage] = useState("qr");
  const [cameraActive, setCameraActive] = useState(true);
  const [photo, setPhoto] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef(null);
  const storage = getStorage();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const isSchoolDayAndTime = () => {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    return day >= 1 && day <= 5 && hours >= 1 && hours < 24; // Temporary test window: 11PM - 12AM
  };

  const handleQRCodeScanned = ({ data }) => {
    if (!scanned && cameraActive) {
      setCameraActive(false);
      setScanned(true);

      if (isSchoolDayAndTime()) {
        Alert.alert("QR Code Valid", `Data: ${data}. Proceeding to trash scanning.`);
        setStage("trash");
      } else {
        Alert.alert("Invalid QR Code", "The QR code is only active during lunch hours.");
        setScanned(false);
        setCameraActive(true);
      }
    }
  };

  const handleCapturePhoto = async () => {
    if (cameraRef.current) {
      const photoData = await cameraRef.current.takePictureAsync();
      setPhoto(photoData.uri);

      setIsProcessing(true);
      const isValidTrash = await verifyTrashImage(photoData.uri);
      setIsProcessing(false);

      if (isValidTrash) {
        await uploadTrashPhoto(photoData.uri);
      } else {
        Alert.alert("Invalid Image", "This does not appear to be trash. Try again.");
        setStage("qr");
        setScanned(false);
        setCameraActive(true);
      }
    }
  };

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
                features: [{ type: "LABEL_DETECTION", maxResults: 5 }],
              },
            ],
          }),
        }
      );

      const result = await response.json();
      const labels = result.responses[0]?.labelAnnotations || [];

      console.log("Detected labels:", labels.map((label) => label.description));

      const trashKeywords = [
        "garbage",
        "trash",
        "litter",
        "waste",
        "recycling",
        "disposable",
        "paper waste",
        "used napkin",
        "dirty tissue",
        "crumpled paper",
        "rubbish",
        "wastebasket",
        "plastic bag",
        "debris",
        "tissue box"
      ];

      return labels.some((label) => trashKeywords.includes(label.description.toLowerCase()));
    } catch (error) {
      console.error("Error verifying image:", error);
      return false;
    }
  };

  const convertImageToBase64 = async (uri) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 500 } }],
      { base64: true }
    );
    return manipResult.base64;
  };

  const uploadTrashPhoto = async (photoUri) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      const response = await fetch(photoUri);
      const blob = await response.blob();
      const photoRef = ref(storage, `trash_images/${user.uid}_${Date.now()}.jpg`);

      await uploadBytes(photoRef, blob);
      const downloadURL = await getDownloadURL(photoRef);
      await saveScanData(user.uid, downloadURL);

      Alert.alert("Success", "Trash image verified and uploaded!");
      setStage("qr");
      setScanned(false);
      setCameraActive(true);
    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert("Error", "Failed to upload trash image.");
    }
  };

  const saveScanData = async (userId, photoUrl) => {
    try {
      const scanRef = doc(db, "users", userId);
      const docSnap = await getDoc(scanRef);

      if (docSnap.exists()) {
        await updateDoc(scanRef, {
          lastScan: new Date(),
          lastTrashPhoto: photoUrl,
          points: (docSnap.data().points || 0) + 10, // Reward points
        });
      } else {
        await setDoc(scanRef, {
          email: auth.currentUser?.email,
          lastScan: new Date(),
          lastTrashPhoto: photoUrl,
          points: 10,
        });
      }
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
      {stage === "qr" ? (
        <>
          <Text style={styles.title}>Scan QR Code</Text>
          {cameraActive && (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              onBarcodeScanned={scanned ? undefined : handleQRCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            />
          )}
          {scanned && (
            <Button
              title="Scan Again"
              onPress={() => {
                setScanned(false);
                setCameraActive(true);
              }}
            />
          )}
        </>
      ) : (
        <>
          <Text style={styles.title}>Trash Scanning Stage</Text>
          <CameraView ref={cameraRef} style={styles.camera} />
          <Button title="Capture Trash Image" onPress={handleCapturePhoto} />
          {isProcessing && <Text>Processing image...</Text>}
          {photo && <Image source={{ uri: photo }} style={styles.preview} />}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginVertical: 20 },
  camera: { flex: 1, width: "100%" },
  preview: { width: 200, height: 200, marginTop: 20 },
});
