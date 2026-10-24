import { createContext, useContext, useEffect, useState } from "react";

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
} from "firebase/auth";

import { auth } from "../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
        setLoading(false);
      },
      (error) => {
        console.error("Authentication state error:", error);
        setCurrentUser(null);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  async function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();

    return signInWithPopup(auth, provider);
  }

  async function logout() {
    return signOut(auth);
  }

  const value = {
    currentUser,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
