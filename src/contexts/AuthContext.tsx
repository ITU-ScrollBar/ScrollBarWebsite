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
  // uid of the signed-in Firebase Auth user. Known before currentUser, which
  // waits on the users/{uid} doc, so listeners that only need a signed-in
  // user can start one round trip earlier.
  authUid: string | null;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Tender | null>(null);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // The previous user's users/{uid} listener, stopped when the signed-in user changes.
    let unsubscribeUser = () => {};
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribeUser();
      unsubscribeUser = () => {};
      setAuthUid(user?.uid ?? null);
      // If no firebase auth user, clear profile and stop loading
      if (!user) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      // For an authenticated firebase user, fetch the app profile from Firestore
      // and keep loading true until that fetch completes to avoid premature redirects.
      setLoading(true);
      unsubscribeUser = getUser(user.uid, {
        next: (snapshot) => {
          if (snapshot.exists()) {
            const userdata = snapshot.data() as Tender;
            setCurrentUser({ ...userdata, uid: user.uid });
          } else {
            setCurrentUser(null);
          }
          setLoading(false);
        },
        error: (error) => {
          console.error("Error fetching user data:", error);
          setCurrentUser(null);
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
      authUid,
      loading,
      login,
      logout,
      setUser,
      resetPassword,
    }),
    [currentUser, authUid, loading]
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
