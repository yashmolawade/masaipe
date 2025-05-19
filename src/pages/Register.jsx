import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import AuthForm from "../components/auth/AuthForm";
import { useLoading } from "../contexts/LoadingContext";
import micon from "../assets/micon.svg";

const Register = () => {
  const { currentUser, loading, register } = useAuth();
  const { showLoader, hideLoader } = useLoading();
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "masaipe - register";
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
      showLoader("Loading registration...");
    } else {
      hideLoader();
    }
  }, [loading, showLoader, hideLoader]);

  const handleRegister = useCallback(
    async (email, password, role, name) => {
      try {
        setError("");
        await register(email, password, role, name);
      } catch (error) {
        setError(error.message || "Failed to register");
      }
    },
    [register]
  );

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="auth-container">
        <AuthForm
          isLogin={false}
          onSubmit={handleRegister}
          error={error}
          loading={loading}
        />
      </div>
    </Layout>
  );
};

export default Register;
