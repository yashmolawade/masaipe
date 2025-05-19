import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const { userData, currentUser, updateUserData } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    if (userData?.darkMode !== undefined) {
      return userData.darkMode;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (userData?.darkMode !== undefined) {
      setDarkMode(userData.darkMode);
    }
  }, [userData]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(async () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    if (currentUser) {
      try {
        await updateUserData({ darkMode: newDarkMode });
      } catch (error) {
        setDarkMode(!newDarkMode); // Revert on error
      }
    }
  }, [darkMode, currentUser, updateUserData]);

  const value = useMemo(
    () => ({
      darkMode,
      toggleDarkMode,
    }),
    [darkMode, toggleDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
