import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Firebase client config values are PUBLIC identifiers — not secrets.
// They are safe to commit and are visible to any user of the app anyway.
// See: https://firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyC_XXWAXxbZ2KgsofqlnVqW3lYAaCBC8Rw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "hireintel-ai-4d2a3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "hireintel-ai-4d2a3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "hireintel-ai-4d2a3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "730266733727",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:730266733727:web:036adec95af8c22ad266aa",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-EX25010GY0",
};

// Whether Firebase initialized successfully. Exported so AuthContext can skip
// Firebase-specific calls (onAuthStateChanged, signOut) gracefully.
export let firebaseReady = false;

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

try {
  _app = initializeApp(firebaseConfig);
  _auth = getAuth(_app);
  _db = getFirestore(_app);
  firebaseReady = true;
} catch (err) {
  console.warn(
    "Firebase failed to initialize — running in backend-only fallback mode.\n" +
    "To fix: verify your API key is valid in the Firebase Console.",
    err
  );
}

// Export nullable refs. Callers must guard with `if (auth)` or check `firebaseReady`.
export const auth = _auth;
export const db = _db;
