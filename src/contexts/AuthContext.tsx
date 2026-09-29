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
import { getUser, sendResetPasswordEmailToUser } from "../firebase/api/authentication";
import { Tender } from "../types/types-file";
import { message } from "antd";

// Define and export AuthContextType and AuthProviderProps
export interface AuthContextType {
  currentUser: Tender | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  resetPassword: (email: string) => Promise<void>;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The signed-in member's users/{uid} doc from their last visit, so member pages render right
// away instead of after Firebase Auth and Firestore answer. Cleared when no one is signed in.
const CACHE_KEY = "currentUser";

const readCachedUser = (): Tender | null => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
  } catch {
    return null;
  }
};

const writeCachedUser = (user: Tender | null) => {
  try {
    if (user) localStorage.setItem(CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // Storage can be full or blocked; the cache is only a speed-up.
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Tender | null>(readCachedUser);
  const [loading, setLoading] = useState<boolean>(() => currentUser === null);

  useEffect(() => {
    // The previous user's users/{uid} listener, stopped when the signed-in user changes.
    let unsubscribeUser = () => {};
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribeUser();
      unsubscribeUser = () => {};
      // If no firebase auth user, clear profile and stop loading
      if (!user) {
        setCurrentUser(null);
        writeCachedUser(null);
        setLoading(false);
        return;
      }

      // For an authenticated firebase user, fetch the app profile from Firestore
      // and keep loading true until that fetch completes to avoid premature redirects,
      // unless their cached profile is already showing.
      if (readCachedUser()?.uid !== user.uid) {
        setCurrentUser(null);
        setLoading(true);
      }
      unsubscribeUser = getUser(user.uid, {
        next: (snapshot) => {
          const userdata = snapshot.exists() ? { ...(snapshot.data() as Tender), uid: user.uid } : null;
          setCurrentUser(userdata);
          // Inactive members aren't cached: their saved profile would send them to /deletedUser
          // before the fresh one could say they were made active again.
          writeCachedUser(userdata?.active ? userdata : null);
          setLoading(false);
        },
        error: (error) => {
          console.error("Error fetching user data:", error);
          setCurrentUser(null);
          writeCachedUser(null);
          setLoading(false);
        },
      });
    });

    return () => {
      unsubscribe();
      unsubscribeUser();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
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
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendResetPasswordEmailToUser({email});
    message.success('Password reset email sent successfully');
  };

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      login,
      logout,
      setUser,
      resetPassword,
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
