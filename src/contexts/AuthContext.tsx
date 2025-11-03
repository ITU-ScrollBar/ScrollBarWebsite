// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from "firebase/auth";
import { auth } from "../firebase/index";
import { getUser } from "../firebase/api/authentication";
import { Tender } from "../types/types-file";

// Define and export AuthContextType and AuthProviderProps
export interface AuthContextType {
  currentUser: Tender | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Tender | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If no firebase auth user, clear profile and stop loading
      if (!user) {
        setCurrentUser(null);
        setLoading(false);
        console.log("Auth State Changed: No user");
        return;
      }

      // For an authenticated firebase user, fetch the app profile from Firestore
      // and keep loading true until that fetch completes to avoid premature redirects.
      setLoading(true);
      getUser(user.uid, {
        next: (snapshot) => {
          if (snapshot.exists()) {
            const userdata = snapshot.data() as Tender;
            setCurrentUser({ ...userdata, uid: user.uid });
            console.log("Fetched new current user");
          } else {
            setCurrentUser(null);
            console.log("No user profile found in Firestore for", user.uid);
          }
          setLoading(false);
        },
        error: (error) => {
          console.error("Error fetching user data:", error);
          setCurrentUser(null);
          setLoading(false);
        },
      });
      console.log("Auth State Changed: User", user.uid);
    });

    return () => {
      console.log("Unsubscribing Auth Listener");
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      console.log("Login successful");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const setUser = (user: User | null): void => {
    setCurrentUser(user as Tender | null);
  };



  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      login,
      logout,
      setUser,
    }),
    [currentUser, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook for easy consumption
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
