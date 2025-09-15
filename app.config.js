import "dotenv/config";

export default {
  expo: {
    name: "real-app",
    slug: "real-app",
    version: "1.0.0",
    orientation: "portrait",
    owner: "smotheredpumpkin",
    icon: "./assets/images/appIcon.png",
    extra: {
      eas: {
        projectId: "98c43e46-2016-4d4a-a774-d4ed29c6af35"
      },
      EXPO_PUBLIC_GOOGLE_VISION_KEY: process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY,
      EXPO_PUBLIC_REVIEW_MODE: process.env.EXPO_PUBLIC_REVIEW_MODE === "true"
    },
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      buildNumber: "17",
      bundleIdentifier: "com.techtitans.ecotitans",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "This app uses your camera to scan QR codes and verify trash disposal to award you points.",
        NSLocationWhenInUseUsageDescription: "We need your location to verify you're on school grounds before allowing scans."

      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
            useModularHeaders: true
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    }
  }
};
