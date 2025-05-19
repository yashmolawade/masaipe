import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import "./Layout.css";
import { MdDarkMode, MdLightMode } from "react-icons/md";

const Navbar = () => {
  const { currentUser, userData, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showUserPopup, setShowUserPopup] = useState(false);
  const popupRef = useRef(null);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      // Silently handle error
    }
  }, [logout, navigate]);

  const handleClickOutside = useCallback((event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      setShowUserPopup(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const getFirstLetter = useCallback((email) => {
    return email ? email[0].toUpperCase() : "U";
  }, []);

  const userAvatar = useMemo(
    () => (
      <div
        className="user-avatar"
        onClick={() => setShowUserPopup(!showUserPopup)}
      >
        {getFirstLetter(userData?.email)}
      </div>
    ),
    [userData?.email, showUserPopup, getFirstLetter]
  );

  const userPopup = useMemo(
    () =>
      showUserPopup && (
        <div className="user-popup">
          <div className="user-popup-header">
            <div className="user-popup-email">{userData?.email}</div>
            <div className="user-popup-role">{userData?.role}</div>
          </div>
          <div className="user-popup-actions">
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      ),
    [showUserPopup, userData?.email, userData?.role, handleLogout]
  );

  const themeToggleButton = useMemo(
    () => (
      <button
        className="theme-toggle"
        onClick={toggleDarkMode}
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? <MdLightMode /> : <MdDarkMode />}
      </button>
    ),
    [darkMode, toggleDarkMode]
  );

  const authLinks = useMemo(
    () => (
      <div className="auth-links">
        {pathname === "/register" ? (
          <Link to="/login" className="nav-link">
            Login
          </Link>
        ) : (
          <Link to="/register" className="nav-link">
            Register
          </Link>
        )}
        {themeToggleButton}
      </div>
    ),
    [pathname, themeToggleButton]
  );

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <div className="logo">
          <Link to="/">
            <span className="logo-text">
              masa<span className="gradient-letter-navbar">i</span>pe
            </span>
            <span className="registered">®</span>
          </Link>
        </div>

        <div className="navbar-menu">
          {currentUser ? (
            <>
              <Link to="/" className="nav-link">
                Home
              </Link>
              {themeToggleButton}
              <div className="navbar-user-container" ref={popupRef}>
                {userAvatar}
                {userPopup}
              </div>
            </>
          ) : (
            authLinks
          )}
        </div>
      </div>
    </nav>
  );
};

export default React.memo(Navbar);
