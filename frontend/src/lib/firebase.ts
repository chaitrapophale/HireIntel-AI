import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
