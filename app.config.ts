import { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? "LockedIn FIT (Dev)" : "LockedIn FIT",
  slug: "lockedinfit",
  owner: "johenilh",
  version: "2.1.0",
  orientation: "portrait",
  icon: "./assets/icons/icon_default.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#050D12",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV
      ? "com.johenilhernandez.LockedInFit.dev"
      : "com.johenilhernandez.LockedInFit",
    icon: "./assets/icons/icon_default.png",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSUserTrackingUsageDescription:
        "LockedInFIT uses your advertising identifier to show relevant ads and measure ad performance. You can change this anytime in Settings.",
      NSHealthShareUsageDescription:
        "LockedIn FIT reads your body weight, workouts, heart rate, resting heart rate, HRV, step count, active energy, and sleep data from Apple Health to improve your readiness scoring, detect external workouts, and provide personalized recovery insights.",
      NSHealthUpdateUsageDescription:
        "LockedIn FIT saves your completed workouts to Apple Health so all your training is tracked in one place.",
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            "com.googleusercontent.apps.177992048804-gukij19ltkpa66qkao4j5d8ud0lkds46",
          ],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/icons/icon_default.png",
      backgroundColor: "#050D12",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: IS_DEV
      ? "com.johenilhernandez.lockedinfit.dev"
      : "com.johenilhernandez.lockedinfit",
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png",
  },
  scheme: IS_DEV ? "lockedinfit-dev" : "lockedinfit",
  plugins: [
    "expo-router",
    [
      "expo-custom-assets",
      {
        assetsPaths: ["./assets/locke"],
      },
    ],
    [
      "react-native-health",
      {
        isClinicalDataEnabled: false,
      },
    ],
    [
      "expo-alternate-app-icons",
      [
        "./assets/icons/icon_disappointed.png",
        "./assets/icons/icon_focused.png",
        "./assets/icons/icon_mischievous.png",
        "./assets/icons/icon_motivated.png",
      ],
    ],
    "expo-tracking-transparency",
    "expo-asset",
    "expo-font",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-5004436293909047~9486645456",
        iosAppId: "ca-app-pub-5004436293909047~9486645456",
      },
    ],
  ],
  extra: {
    router: {},
    eas: {
      projectId: "b77f6e04-866a-463f-9585-28e3ee7063ee",
    },
  },
});
