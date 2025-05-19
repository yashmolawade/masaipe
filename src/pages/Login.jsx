import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import AuthForm from "../components/auth/AuthForm";
import { useLoading } from "../contexts/LoadingContext";
import micon from "../assets/micon.svg";

const Login = () => {
  const { currentUser, loading, login } = useAuth();
  const { showLoader, hideLoader } = useLoading();
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "masaipe - login";
    const link = document.querySelector("link[rel~='icon']");
    if (link) {
      link.href = micon;
    } else {
      const newLink = document.createElement("link");
      newLink.rel = "shortcut icon";
      newLink.type = "image/svg+xml";
      newLink.href = micon;
      document.head.appendChild(newLink);
    }
  }, []);

  useEffect(() => {
    if (loading) {
      showLoader("Loading login...");
    } else {
      hideLoader();
    }
  }, [loading, showLoader, hideLoader]);

  const handleLogin = useCallback(
    async (email, password) => {
      try {
        setError("");
        await login(email, password);
      } catch (error) {
        setError(error.message || "Failed to login");
      }
    },
    [login]
  );

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="auth-container">
        <AuthForm
          isLogin={true}
          onSubmit={handleLogin}
          error={error}
          loading={loading}
        />
      </div>
    </Layout>
  );
};

export default Login;
