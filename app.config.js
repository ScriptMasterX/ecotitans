import "dotenv/config";

export default {
  expo: {
    name: "real-app",
    slug: "real-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    extra: {
      EXPO_PUBLIC_GOOGLE_VISION_KEY: process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY
    },
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.techtitans.realapp"
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
      "expo-secure-store"
    ],
    experiments: {
      typedRoutes: true
    }
  }
};
