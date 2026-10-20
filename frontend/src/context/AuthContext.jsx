import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { AuthContext } from "./authContextInstance";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Track active role: either "user" (student) or "owner" (mess partner)
  const [activeRole, setActiveRoleState] = useState(() => {
    return localStorage.getItem("messta_role") || "user";
  });

  const setActiveRole = (role) => {
    setActiveRoleState(role);
    localStorage.setItem("messta_role", role);
  };

  // Signup accepting email, password, and chosen role
  const signup = async (email, password, role = "user") => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    setActiveRole(role);
    return res;
  };

  // Login accepting email, password, and chosen role
  const login = async (email, password, role = "user") => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    setActiveRole(role);
    return res;
  };

  // Google Sign-In with chosen role
  const loginWithGoogle = async (role = "user") => {
    const res = await signInWithPopup(auth, googleProvider);
    setActiveRole(role);
    return res;
  };

  // Logout function: clears session and stored role
  const logout = () => {
    localStorage.removeItem("messta_role");
    return signOut(auth);
  };

  // Listen to Firebase auth state changes on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    activeRole,
    setActiveRole,
    signup,
    login,
    loginWithGoogle,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export { AuthContext };