import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth, db, firebaseReady } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
  currentUser: User | null;
  userProfile: any | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(firebaseReady); // only show loading if Firebase is up

  useEffect(() => {
    // If Firebase failed to initialize, skip — app uses backend JWT auth only
    if (!firebaseReady || !auth) {
      setLoading(false);
      return;
    }

    // Safety timeout — if Firebase auth never responds within 3s, unblock the UI
    const timeout = setTimeout(() => setLoading(false), 3000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      setCurrentUser(user);

      if (user && db) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          setUserProfile(docSnap.exists() ? docSnap.data() : null);
        } catch (error) {
          console.error("Error fetching user profile", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    if (firebaseReady && auth) {
      try {
        await firebaseSignOut(auth);
      } catch {
        // Firebase unavailable — backend store logout handles session clearing
      }
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
