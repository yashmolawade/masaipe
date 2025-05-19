import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { logUserLogin, logUserLogout } from "../utils/auditTracker";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isDirectLogin, setIsDirectLogin] = useState(false);

  const handleAuthError = useCallback((error, context) => {
    let errorMessage = "An error occurred. Please try again.";

    if (error.code) {
      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Invalid email address.";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled.";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password.";
          break;
        case "auth/email-already-in-use":
          errorMessage = "This email is already registered.";
          break;
        case "auth/weak-password":
          errorMessage = "Password is too weak.";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "This operation is not allowed.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your connection.";
          break;
        default:
          errorMessage = error.message || "Authentication failed.";
      }
    }

    setAuthError(`${context}: ${errorMessage}`);
    setLoading(false);
  }, []);

  const fetchUserData = useCallback(
    async (user) => {
      if (!user) {
        setUserData(null);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          const newUserData = {
            email: user.email,
            role: "user",
            createdAt: new Date().toISOString(),
            darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
          };
          await setDoc(doc(db, "users", user.uid), newUserData);
          setUserData(newUserData);
        }
      } catch (error) {
        handleAuthError(error, "Error fetching user data");
        setUserData(null);
      }
    },
    [handleAuthError]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await fetchUserData(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserData]);

  const login = useCallback(
    async (email, password) => {
      try {
        setLoading(true);
        setAuthError(null);
        setIsDirectLogin(true);

        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        await fetchUserData(userCredential.user);

        await logUserLogin({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          role: userData?.role || "user",
        });

        return userCredential.user;
      } catch (error) {
        handleAuthError(error, "Login failed");
        throw error;
      } finally {
        setIsDirectLogin(false);
      }
    },
    [fetchUserData, userData, handleAuthError]
  );

  const register = useCallback(
    async (email, password, role, name) => {
      try {
        setLoading(true);
        setAuthError(null);

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const newUserData = {
          email: userCredential.user.email,
          name: name,
          role: role,
          createdAt: new Date().toISOString(),
          darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
        };

        await setDoc(doc(db, "users", userCredential.user.uid), newUserData);
        setUserData(newUserData);

        return userCredential.user;
      } catch (error) {
        handleAuthError(error, "Registration failed");
        throw error;
      }
    },
    [handleAuthError]
  );

  const logout = useCallback(async () => {
    try {
      if (currentUser && userData) {
        await logUserLogout({
          uid: currentUser.uid,
          email: currentUser.email,
          role: userData.role || "user",
        });
      }

      setLoading(true);
      await signOut(auth);
      setUserData(null);
    } catch (error) {
      handleAuthError(error, "Logout failed");
      throw error;
    }
  }, [currentUser, userData, handleAuthError]);

  const updateUserData = useCallback(
    async (updates) => {
      if (!currentUser) return;

      try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, updates);
        setUserData((prev) => ({ ...prev, ...updates }));
      } catch (error) {
        handleAuthError(error, "Error updating user data");
        throw error;
      }
    },
    [currentUser, handleAuthError]
  );

  const value = useMemo(
    () => ({
      currentUser,
      userData,
      loading,
      authError,
      login,
      register,
      logout,
      updateUserData,
    }),
    [
      currentUser,
      userData,
      loading,
      authError,
      login,
      register,
      logout,
      updateUserData,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
