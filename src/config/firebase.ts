import { initializeApp, getApps } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Exported at runtime by the Firebase RN build but missing from the umbrella
// type definitions, so we reach for it dynamically.
const getReactNativePersistence = (firebaseAuth as any).getReactNativePersistence;

// Firebase config is read from environment variables (see .env, which is
// gitignored). Copy .env.example → .env and fill in your project's values.
// NOTE: the Firebase *web* config is not a secret — Google ships it inside
// client apps by design; it only identifies the project. Real protection comes
// from the Firestore/Storage security rules. We still keep it out of source so
// nothing project-specific is committed to the repo.
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // Surfaced clearly instead of a cryptic Firebase error if .env is missing.
  console.warn(
    '[firebase] Missing EXPO_PUBLIC_FIREBASE_* env vars. ' +
    'Copy .env.example to .env and fill in your Firebase config, then restart with `npx expo start -c`.'
  );
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Persist the signed-in user across app restarts via AsyncStorage.
// initializeAuth must run exactly once; fall back to getAuth on hot-reload
// (already-initialized) or if RN persistence is unavailable in this runtime.
let _auth: Auth;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  _auth = getAuth(app);
}

export const auth    = _auth;
export const db      = getFirestore(app);
export const storage = getStorage(app);
