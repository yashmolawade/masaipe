import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import SessionList from "../sessions/SessionList";
import PayoutList from "../payouts/PayoutList";
import ChatSection from "../chat/ChatSection";
import { SESSION_TYPE } from "../../types/index";
import "./Dashboard.css";
import { useLoading } from "../../contexts/LoadingContext";
import { useTheme } from "../../context/ThemeContext";

const PAYMENTS_PER_PAGE = 10;

const MentorDashboard = () => {
  const { currentUser, loading: authLoading, userData } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("sessions");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Add filter states
  const [sessionTypeFilter, setSessionTypeFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  // Calculate total pages for payments
  const totalPages = useMemo(
    () => Math.ceil(payouts.length / PAYMENTS_PER_PAGE),
    [payouts.length]
  );

  // Get current payments for the page
  const currentPayouts = useMemo(
    () =>
      payouts.slice(
        (currentPage - 1) * PAYMENTS_PER_PAGE,
        currentPage * PAYMENTS_PER_PAGE
      ),
    [payouts, currentPage]
  );

  // Change page
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  // Reset page when switching tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Auto-switch to chat tab when there are new messages
  useEffect(() => {
    if (unreadMessages > 0 && activeTab !== "chat") {
      try {
        const notification = new Notification("New Admin Message", {
          body: "You have new messages from admin",
          icon: "/logo.png",
        });

        notification.onclick = () => {
          setActiveTab("chat");
          window.focus();
        };
      } catch (error) {
        // Silently handle notification permission errors
        console.warn("Could not show notification:", error);
      }
    }
  }, [unreadMessages, activeTab]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setError("Please log in to view your dashboard");
      setLoading(false);
      return;
    }

    let unsubscribeSessions = null;
    let unsubscribePayouts = null;

    try {
      // Fetch mentor's sessions
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("mentorId", "==", currentUser.uid),
        orderBy("date", "desc")
      );

      unsubscribeSessions = onSnapshot(
        sessionsQuery,
        (snapshot) => {
          try {
            const sessionsData = snapshot.docs.map((doc) => {
              const data = doc.data();
              // Ensure we have a valid status based on isPaid field
              const status =
                typeof data.isPaid === "boolean"
                  ? data.isPaid
                    ? "paid"
                    : "unpaid"
                  : "unpaid"; // Default to unpaid if isPaid is not a boolean

              return {
                id: doc.id,
                ...data,
                status: status,
              };
            });

            setSessions(sessionsData);
            setLoading(false);
            setError(null);
          } catch (error) {
            setError("Failed to process sessions data: " + error.message);
            setLoading(false);
          }
        },
        (error) => {
          setError("Failed to load sessions: " + error.message);
          setLoading(false);
        }
      );

      // Fetch mentor's payouts
      const payoutsQuery = query(
        collection(db, "payouts"),
        where("mentorId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      unsubscribePayouts = onSnapshot(
        payoutsQuery,
        (snapshot) => {
          try {
            const payoutsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            setPayouts(payoutsData);
            setError(null);
          } catch (error) {
            setError("Failed to process payouts data: " + error.message);
          }
        },
        (error) => {
          setError("Failed to load payouts: " + error.message);
        }
      );
    } catch (error) {
      setError("Failed to initialize dashboard: " + error.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribeSessions) unsubscribeSessions();
      if (unsubscribePayouts) unsubscribePayouts();
    };
  }, [currentUser, authLoading]);

  // Stats calculation
  const { totalEarnings, pendingPayments, completedSessions } = useMemo(
    () => ({
      totalEarnings: payouts.reduce(
        (sum, payout) => sum + (payout.netAmount || 0),
        0
      ),
      pendingPayments: payouts.filter((p) => p.status === "pending").length,
      completedSessions: sessions.length,
    }),
    [payouts, sessions.length]
  );

  // Filter sessions based on type, date, and payment status
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesType =
        sessionTypeFilter === "all" ||
        session.sessionType === sessionTypeFilter;

      // Updated date range filtering
      const matchesDate = (() => {
        try {
          const sessionDate = new Date(session.date);
          sessionDate.setHours(0, 0, 0, 0);

          // If no date filters are set, show all sessions
          if (!startDateFilter && !endDateFilter) {
            return true;
          }

          // If only start date is set
          if (startDateFilter && !endDateFilter) {
            const startDate = new Date(startDateFilter);
            startDate.setHours(0, 0, 0, 0);
            return sessionDate >= startDate;
          }

          // If only end date is set
          if (!startDateFilter && endDateFilter) {
            const endDate = new Date(endDateFilter);
            endDate.setHours(23, 59, 59, 999);
            return sessionDate <= endDate;
          }

          // If both dates are set
          if (startDateFilter && endDateFilter) {
            const startDate = new Date(startDateFilter);
            const endDate = new Date(endDateFilter);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            return sessionDate >= startDate && sessionDate <= endDate;
          }

          return true;
        } catch (error) {
          console.warn("Error comparing dates:", error);
          return false;
        }
      })();

      // Ensure case-insensitive comparison for payment status
      const matchesPaymentStatus =
        paymentStatusFilter === "all" ||
        (paymentStatusFilter === "paid" && session.isPaid === true) ||
        (paymentStatusFilter === "unpaid" &&
          session.isPaid === false &&
          session.status !== "review") ||
        (paymentStatusFilter === "review" && session.status === "review");

      return matchesType && matchesDate && matchesPaymentStatus;
    });
  }, [
    sessions,
    sessionTypeFilter,
    startDateFilter,
    endDateFilter,
    paymentStatusFilter,
  ]);

  const handleUnreadCountChange = useCallback((count) => {
    setUnreadMessages(count);
    document.title =
      count > 0 ? `(${count}) MentorPay - Dashboard` : "MentorPay - Dashboard";
  }, []);

  const { showLoader, hideLoader } = useLoading();
  const { darkMode } = useTheme();

  useEffect(() => {
    if (loading) {
      showLoader("Loading mentor profile...");
    } else {
      hideLoader();
    }
  }, [loading]);

  return (
    <div className="dashboard mentor-dashboard fade-in">
      <div className="dashboard-header">
        <h2
          className="dashboard-title"
          style={{ color: darkMode ? "#fff" : "#2d3748" }}
        >
          Mentor Dashboard
        </h2>
        <p
          className="dashboard-subtitle"
          style={{ color: darkMode ? "#fff" : "#718096" }}
        >
          View your sessions, payouts, and chat with admin
        </p>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Earnings</h3>
          <p className="stat-value">${totalEarnings.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Payments</h3>
          <p className="stat-value">{pendingPayments}</p>
        </div>
        <div className="stat-card">
          <h3>Sessions Completed</h3>
          <p className="stat-value">{completedSessions}</p>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === "sessions" ? "active" : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          My Sessions
        </button>
        <button
          className={`tab-button ${activeTab === "payouts" ? "active" : ""}`}
          onClick={() => setActiveTab("payouts")}
        >
          My Payments
        </button>
        <button
          className={`tab-button ${activeTab === "chat" ? "active" : ""} ${
            unreadMessages > 0 ? "has-notification" : ""
          }`}
          onClick={() => setActiveTab("chat")}
        >
          Chat with Admin
          {unreadMessages > 0 && (
            <span className="tab-notification">{unreadMessages}</span>
          )}
        </button>
      </div>

      {activeTab === "sessions" && (
        <div className="session-filters filter-box">
          <div className="filter-group">
            <select
              value={sessionTypeFilter}
              onChange={(e) => setSessionTypeFilter(e.target.value)}
              className="filter-select"
              style={{
                backgroundColor: darkMode ? "#000" : "#fff",
                color: darkMode ? "#fff" : "#2d3748",
              }}
            >
              <option
                style={{
                  backgroundColor: darkMode ? "black" : "white",
                  color: darkMode ? "white" : "black",
                }}
                value="all"
              >
                All Types
              </option>
              <option
                style={{
                  backgroundColor: darkMode ? "black" : "white",
                  color: darkMode ? "white" : "black",
                }}
                value="oneOnOne"
              >
                One on One
              </option>
              <option
                style={{
                  backgroundColor: darkMode ? "black" : "white",
                  color: darkMode ? "white" : "black",
                }}
                value="group"
              >
                Group Session
              </option>
              <option
                style={{
                  backgroundColor: darkMode ? "black" : "white",
                  color: darkMode ? "white" : "black",
                }}
                value="workshop"
              >
                Workshop
              </option>
              <option
                style={{
                  backgroundColor: darkMode ? "black" : "white",
                  color: darkMode ? "white" : "black",
                }}
                value="review"
              >
                Code Review
              </option>
            </select>
            <div className="date-range-filter">
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="filter-date"
                placeholder="Start Date"
                style={{
                  marginRight: "10px",
                  backgroundColor: darkMode ? "#000" : "#fff",
                  color: darkMode ? "#fff" : "#2d3748",
                }}
              />
              <span className="date-separator" style={{ margin: "0 10px" }}>
                to
              </span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="filter-date"
                placeholder="End Date"
                style={{
                  marginLeft: 0,
                  backgroundColor: darkMode ? "#000" : "#fff",
                  color: darkMode ? "#fff" : "#2d3748",
                }}
              />
            </div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="filter-select"
              style={{
                backgroundColor: darkMode ? "#000" : "#fff",
                color: darkMode ? "#fff" : "#2d3748",
              }}
            >
              <option
                style={{
                  backgroundColor: darkMode ? "black" : "white",
                  color: darkMode ? "white" : "black",
                }}
                value="all"
              >
                All Payment Status
              </option>
              <option
                style={{
                  backgroundColor: darkMode ? "black" : "white",
                  color: darkMode ? "white" : "black",
                }}
                value="paid"
              >
                Paid
              </option>
              <option
                style={{
                  backgroundColor: darkMode ? "black" : "white",
                  color: darkMode ? "white" : "black",
                }}
                value="unpaid"
              >
                Unpaid
              </option>
              <option
                style={{
                  backgroundColor: darkMode ? "black" : "white",
                  color: darkMode ? "white" : "black",
                }}
                value="review"
              >
                Under Review
              </option>
            </select>
            <button
              className="clear-filters-btn"
              onClick={() => {
                setSessionTypeFilter("all");
                setStartDateFilter("");
                setEndDateFilter("");
                setPaymentStatusFilter("all");
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-content">
        {loading ? null : (
          <>
            {activeTab === "sessions" && (
              <SessionList
                sessions={filteredSessions}
                isAdmin={false}
                payouts={payouts}
              />
            )}
            {activeTab === "payouts" && (
              <>
                <PayoutList payouts={currentPayouts} isAdmin={false} />
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="pagination-button"
                    >
                      Previous
                    </button>
                    <span className="pagination-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="pagination-button"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
            {activeTab === "chat" && (
              <ChatSection onUnreadCountChange={handleUnreadCountChange} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MentorDashboard;
