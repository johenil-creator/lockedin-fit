import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  type Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// getReactNativePersistence is exported from @firebase/auth's RN entry point
// (resolved automatically by Metro via the "react-native" field in package.json)
// but not re-exported by the firebase/auth wrapper — import directly.
// @ts-ignore — Metro resolves this correctly at runtime via the RN entry
import { getReactNativePersistence } from "@firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

/** True when real Firebase credentials are configured in .env */
export const isFirebaseConfigured =
  firebaseConfig.apiKey.length > 0 &&
  !firebaseConfig.apiKey.includes("your-") &&
  firebaseConfig.projectId.length > 0 &&
  !firebaseConfig.projectId.includes("your-");

// Initialize Firebase app (singleton — safe to call multiple times)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage persistence for React Native
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Already initialized (hot reload) — fall back to getAuth
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
