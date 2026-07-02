import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Firebase client config values are PUBLIC identifiers — not secrets.
// They are safe to commit and are visible to any user of the app anyway.
// See: https://firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyDky60VLsL_uM42-LVHHdTOgs6Iz-a5MKw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "hireintel-ai-aa784.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "hireintel-ai-aa784",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "hireintel-ai-aa784.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "1017888528923",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:1017888528923:web:b8539edd536ef6127e76be",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-6V9MJD4HZL",
};

// Wrap in try/catch so a bad API key never crashes the whole app.
// The app will still work via the backend dev-fallback auth flow.
let app: FirebaseApp | null = null;
let auth: Auth;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.warn("Firebase failed to initialize — running in offline/fallback mode.", err);
  // Provide stub objects so imports don't break
  auth = {} as Auth;
  db = {} as Firestore;
}

export { auth, db };
