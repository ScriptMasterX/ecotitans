import "dotenv/config";

export default {
  expo: {
    name: "real-app",
    slug: "real-app",
    version: "1.0.0",
    orientation: "portrait",
    owner: "smotheredpumpkin",
    icon: "./assets/images/icon.png",
    extra: {
      eas: {
        projectId: "98c43e46-2016-4d4a-a774-d4ed29c6af35"
      },
      EXPO_PUBLIC_GOOGLE_VISION_KEY: process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY
    },
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.techtitans.realapp",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
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
