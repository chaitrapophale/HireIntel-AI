import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout — if Firebase auth never responds (e.g. bad API key),
    // unblock the app after 3 seconds so the UI doesn't stay blank forever.
    const timeout = setTimeout(() => setLoading(false), 3000);

    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        clearTimeout(timeout);
        setCurrentUser(user);
        
        if (user) {
          try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setUserProfile(docSnap.data());
            } else {
              setUserProfile(null);
            }
          } catch (error) {
            console.error("Error fetching user profile", error);
          }
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      });
    } catch (err) {
      console.warn("Firebase onAuthStateChanged failed — running in fallback mode.", err);
      clearTimeout(timeout);
      setLoading(false);
    }

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // Firebase unavailable — no-op, store logout handles session clearing
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
