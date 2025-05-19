import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLoading } from "../../contexts/LoadingContext";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, userData, loading } = useAuth();
  const location = useLocation();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    showLoader("Authenticating...");
    return () => hideLoader();
  }, []);

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && userData?.role !== requiredRole) {
    const redirectPath = userData?.role === "admin" ? "/admin" : "/mentor";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
