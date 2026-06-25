import { auth, db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  setDoc
} from "firebase/firestore";

const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Unauthenticated user cannot access database.");
  return user.uid;
};

const getAuditFields = () => {
  const now = new Date().toISOString();
  return {
    userId: getUserId(),
    createdAt: now,
    updatedAt: now,
  };
};

export const firestoreService = {
  async create<T extends Record<string, any>>(colName: string, data: T, customId?: string): Promise<T & { id: string }> {
    const enrichedData = {
      ...data,
      ...getAuditFields(),
    };

    if (customId) {
      const docRef = doc(db, colName, customId);
      await setDoc(docRef, enrichedData);
      return { ...enrichedData, id: customId } as unknown as T & { id: string };
    } else {
      const docRef = await addDoc(collection(db, colName), enrichedData);
      return { ...enrichedData, id: docRef.id } as unknown as T & { id: string };
    }
  },

  async list<T>(colName: string): Promise<(T & { id: string })[]> {
    const q = query(collection(db, colName), where("userId", "==", getUserId()));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as T & { id: string }));
  },

  async get<T>(colName: string, id: string): Promise<(T & { id: string }) | null> {
    const docRef = doc(db, colName, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    if (data.userId !== getUserId()) {
      throw new Error("Unauthorized access");
    }
    
    return { ...data, id: docSnap.id } as unknown as T & { id: string };
  },

  async update<T extends Record<string, any>>(colName: string, id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, colName, id);
    
    // Check permission first
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== getUserId()) {
      throw new Error("Unauthorized access or document not found");
    }

    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    await updateDoc(docRef, updatedData);
  },

  async remove(colName: string, id: string): Promise<void> {
    const docRef = doc(db, colName, id);
    
    // Check permission first
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== getUserId()) {
      throw new Error("Unauthorized access or document not found");
    }

    await deleteDoc(docRef);
  }
};
