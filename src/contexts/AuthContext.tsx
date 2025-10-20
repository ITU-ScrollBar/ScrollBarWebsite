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
import { UserProfile } from "../types/types-file";

// Define and export AuthContextType and AuthProviderProps
export interface AuthContextType {
  currentUser: UserProfile | null;
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        getUser(user!.uid, {
          next: (snapshot) => {
            if (snapshot.exists()) {
              var userdata = snapshot.data() as UserProfile;
              setCurrentUser({...userdata, uid: user.uid});
              setLoading(false);
            }
          },
          error: (error) => {
            console.error("Error fetching user data:", error);
            setCurrentUser(null);
            setLoading(false);
          },
        });
      }
      console.log("Auth State Changed:", user ? `User ${user.uid}` : "No user");
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
    setCurrentUser(user as UserProfile | null);
  };



  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
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
