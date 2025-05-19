import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import MentorDashboard from "../components/dashboard/MentorDashboard";
import { useLoading } from "../contexts/LoadingContext";

const Home = () => {
  const { userData, loading } = useAuth();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    document.title = "masaipe - dashboard";
    showLoader("Loading Dashboard...");
    return () => hideLoader();
  }, []);

  if (loading) {
    return null;
  }

  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      {userData.role === "admin" ? <AdminDashboard /> : <MentorDashboard />}
    </Layout>
  );
};

export default Home;
