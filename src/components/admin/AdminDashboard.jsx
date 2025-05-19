import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
  limit,
  startAfter,
  endBefore,
  limitToLast,
} from "firebase/firestore";
import { ref, onValue, update } from "firebase/database";
import { db, database } from "../../firebase/config";
import SessionList from "../sessions/SessionList";
import PayoutListWithIndex from "./PayoutListWithIndex";
import SessionForm from "../sessions/SessionForm";
import ChatSection from "../chat/ChatSection";
import { PAYMENT_STATUS } from "../../types/index";
import "./Dashboard.css";
import { createActivityLog } from "../../utils/auditTracker";
import AuditLogsList from "./AuditLogsList";

useEffect(() => {
  setLoading(true);
  // Reset pagination when search changes
  setFirstVisible(null);
  setLastVisible(null);
  setCurrentPage(1);

  let auditLogsQuery;

  if (actionType !== "all" && searchTerm) {
    // Filter by both action type and search term
    auditLogsQuery = query(
      collection(db, "audit_logs"),
      where("actionType", "==", actionType),
      where("userEmail", ">=", searchTerm),
      where("userEmail", "<=", searchTerm + "\uf8ff"),
      orderBy("userEmail"),
      orderBy("timestamp", "desc"),
      limit(LOGS_PER_PAGE + 1)
    );
  } else if (actionType !== "all") {
    // Filter by action type only
    auditLogsQuery = query(
      collection(db, "audit_logs"),
      where("actionType", "==", actionType),
      orderBy("timestamp", "desc"),
      limit(LOGS_PER_PAGE + 1)
    );
  } else if (searchTerm) {
    // Filter by search term only (in userEmail or targetEntity)
    auditLogsQuery = query(
      collection(db, "audit_logs"),
      where("userEmail", ">=", searchTerm),
      where("userEmail", "<=", searchTerm + "\uf8ff"),
      orderBy("userEmail"),
      orderBy("timestamp", "desc"),
      limit(LOGS_PER_PAGE + 1)
    );
  } else {
    // No filters
    auditLogsQuery = query(
      collection(db, "audit_logs"),
      orderBy("timestamp", "desc"),
      limit(LOGS_PER_PAGE + 1)
    );
  }

  const unsubscribe = onSnapshot(
    auditLogsQuery,
    (snapshot) => {
      if (!snapshot.empty) {
        const fetchedLogs = [];
        snapshot.forEach((doc) => {
          fetchedLogs.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        // Check if there are more logs
        setHasMore(fetchedLogs.length > LOGS_PER_PAGE);
        // Remove the extra log we fetched to check if there are more
        const logsToDisplay = fetchedLogs.slice(0, LOGS_PER_PAGE);

        setLogs(logsToDisplay);
        setFirstVisible(snapshot.docs[0]);
        setLastVisible(
          snapshot.docs[
            snapshot.docs.length > LOGS_PER_PAGE
              ? LOGS_PER_PAGE - 1
              : snapshot.docs.length - 1
          ]
        );
      } else {
        setLogs([]);
        setHasMore(false);
      }
      setLoading(false);
    },
    (error) => {
      console.error("Error fetching audit logs:", error);
      setError("Failed to load audit logs: " + error.message);
      setLoading(false);
    }
  );

  return () => unsubscribe();
}, [searchTerm, actionType]);

const loadNextPage = async () => {
  if (!lastVisible) return;

  setLoading(true);
  let nextQuery;

  if (actionType !== "all" && searchTerm) {
    nextQuery = query(
      collection(db, "audit_logs"),
      where("actionType", "==", actionType),
      where("userEmail", ">=", searchTerm),
      where("userEmail", "<=", searchTerm + "\uf8ff"),
      orderBy("userEmail"),
      orderBy("timestamp", "desc"),
      startAfter(lastVisible),
      limit(LOGS_PER_PAGE + 1)
    );
  } else if (actionType !== "all") {
    nextQuery = query(
      collection(db, "audit_logs"),
      where("actionType", "==", actionType),
      orderBy("timestamp", "desc"),
      startAfter(lastVisible),
      limit(LOGS_PER_PAGE + 1)
    );
  } else if (searchTerm) {
    nextQuery = query(
      collection(db, "audit_logs"),
      where("userEmail", ">=", searchTerm),
      where("userEmail", "<=", searchTerm + "\uf8ff"),
      orderBy("userEmail"),
      orderBy("timestamp", "desc"),
      startAfter(lastVisible),
      limit(LOGS_PER_PAGE + 1)
    );
  } else {
    nextQuery = query(
      collection(db, "audit_logs"),
      orderBy("timestamp", "desc"),
      startAfter(lastVisible),
      limit(LOGS_PER_PAGE + 1)
    );
  }

  try {
    const snapshot = await getDocs(nextQuery);
    if (!snapshot.empty) {
      const fetchedLogs = [];
      snapshot.forEach((doc) => {
        fetchedLogs.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setHasMore(fetchedLogs.length > LOGS_PER_PAGE);
      const logsToDisplay = fetchedLogs.slice(0, LOGS_PER_PAGE);

      setLogs(logsToDisplay);
      setFirstVisible(snapshot.docs[0]);
      setLastVisible(
        snapshot.docs[
          snapshot.docs.length > LOGS_PER_PAGE
            ? LOGS_PER_PAGE - 1
            : snapshot.docs.length - 1
        ]
      );
      setHasPrevious(true);
      setCurrentPage((prevPage) => prevPage + 1);
    } else {
      setHasMore(false);
    }
  } catch (error) {
    console.error("Error loading next page:", error);
    setError("Failed to load more logs: " + error.message);
  } finally {
    setLoading(false);
  }
};

const loadPreviousPage = async () => {
  if (!firstVisible) return;

  setLoading(true);
  let prevQuery;

  if (actionType !== "all" && searchTerm) {
    prevQuery = query(
      collection(db, "audit_logs"),
      where("actionType", "==", actionType),
      where("userEmail", ">=", searchTerm),
      where("userEmail", "<=", searchTerm + "\uf8ff"),
      orderBy("userEmail"),
      orderBy("timestamp", "desc"),
      endBefore(firstVisible),
      limitToLast(LOGS_PER_PAGE + 1)
    );
  } else if (actionType !== "all") {
    prevQuery = query(
      collection(db, "audit_logs"),
      where("actionType", "==", actionType),
      orderBy("timestamp", "desc"),
      endBefore(firstVisible),
      limitToLast(LOGS_PER_PAGE + 1)
    );
  } else if (searchTerm) {
    prevQuery = query(
      collection(db, "audit_logs"),
      where("userEmail", ">=", searchTerm),
      where("userEmail", "<=", searchTerm + "\uf8ff"),
      orderBy("userEmail"),
      orderBy("timestamp", "desc"),
      endBefore(firstVisible),
      limitToLast(LOGS_PER_PAGE + 1)
    );
  } else {
    prevQuery = query(
      collection(db, "audit_logs"),
      orderBy("timestamp", "desc"),
      endBefore(firstVisible),
      limitToLast(LOGS_PER_PAGE + 1)
    );
  }

  try {
    const snapshot = await getDocs(prevQuery);
    if (!snapshot.empty) {
      const fetchedLogs = [];
      snapshot.forEach((doc) => {
        fetchedLogs.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      const logsToDisplay = fetchedLogs.slice(
        fetchedLogs.length > LOGS_PER_PAGE ? 1 : 0,
        fetchedLogs.length
      );
      setHasPrevious(currentPage > 2);

      setLogs(logsToDisplay);
      setFirstVisible(
        snapshot.docs[fetchedLogs.length > LOGS_PER_PAGE ? 1 : 0]
      );
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setCurrentPage((prevPage) => prevPage - 1);
    } else {
      setHasPrevious(false);
    }
  } catch (error) {
    console.error("Error loading previous page:", error);
    setError("Failed to load previous logs: " + error.message);
  } finally {
    setLoading(false);
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp);
  return date.toLocaleString();
};

if (loading && logs.length === 0) {
  return <div className="loading">Loading audit logs...</div>;
}

if (error) {
  return <div className="error-message">{error}</div>;
}

if (logs.length === 0) {
  return (
    <div className="empty-state">
      <h3>No Audit Logs Found</h3>
      <p>There are no logs matching your search criteria.</p>
    </div>
  );
}

return (
  <div className="audit-logs-container">
    <div className="audit-logs-table-container">
      <table className="audit-logs-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Target</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td data-label="Timestamp">{formatDate(log.timestamp)}</td>
              <td data-label="User">
                {log.userEmail || log.userId || "Unknown"}
              </td>
              <td data-label="Action">{log.actionType}</td>
              <td data-label="Target">{log.targetEntity || "N/A"}</td>
              <td data-label="Details">
                {log.details ? (
                  <div className="log-details">
                    <p>{log.details}</p>
                    {log.beforeData && log.afterData && (
                      <button
                        className="view-changes-btn"
                        onClick={() =>
                          alert(
                            JSON.stringify(
                              {
                                before: log.beforeData,
                                after: log.afterData,
                              },
                              null,
                              2
                            )
                          )
                        }
                      >
                        View Changes
                      </button>
                    )}
                  </div>
                ) : (
                  "No details available"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="pagination-controls">
      <button
        className="pagination-btn"
        onClick={loadPreviousPage}
        disabled={!hasPrevious || loading}
      >
        Previous
      </button>
      <span className="pagination-info">Page {currentPage}</span>
      <button
        className="pagination-btn"
        onClick={loadNextPage}
        disabled={!hasMore || loading}
      >
        Next
      </button>
    </div>
  </div>
);

// New component for Admin Dashboard
const AdminDashboard = () => {
  // State variables
  const [activeTab, setActiveTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddSession, setShowAddSession] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionType, setActionType] = useState("all");
  const [availableActionTypes, setAvailableActionTypes] = useState([]);
  const [mentorSearch, setMentorSearch] = useState("");
  const [mentors, setMentors] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pendingQueries, setPendingQueries] = useState([]);

  // Handler for changing payment status
  const handleChangePaymentStatus = async (payoutId, newStatus) => {
    try {
      // Get the reference to the payout in Realtime Database
      const payoutRef = ref(database, `payouts/${payoutId}`);

      // Update the status
      await update(payoutRef, {
        status: newStatus,
        lastUpdated: Date.now(),
      });

      // Log the status change to audit trail
      await createActivityLog({
        actionType: "status_change",
        actionDetails: `Changed payout status to ${newStatus}`,
        targetId: payoutId,
        targetEntity: "payouts",
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      setError("Failed to update payment status: " + error.message);
    }
  };

  // Handler for query resolution
  const handleQueryResolution = async (queryId, resolved) => {
    try {
      // Get the reference to the query in Realtime Database
      const queryRef = ref(database, `chat_queries/${queryId}`);

      // Update the status
      await update(queryRef, {
        status: resolved ? "Contacted" : "Not Contacted",
        resolvedAt: resolved ? Date.now() : null,
      });

      // Log the resolution to audit trail
      await createActivityLog({
        actionType: "query_update",
        actionDetails: `Marked query as ${
          resolved ? "contacted" : "not contacted"
        }`,
        targetId: queryId,
        targetEntity: "chat_queries",
      });
    } catch (error) {
      console.error("Error updating query status:", error);
      setError("Failed to update query status: " + error.message);
    }
  };

  useEffect(() => {
    // Fetch Sessions (Firestore)
    const sessionsQuery = query(
      collection(db, "sessions"),
      orderBy("date", "desc")
    );

    const unsubscribeSessions = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const sessionsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          uiStatus: doc.data().isPaid ? "paid" : "unpaid",
        }));
        setSessions(sessionsData);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error("Error fetching sessions:", error);
        setError("Failed to load sessions: " + error.message);
        setLoading(false);
      }
    );

    // Fetch Chat Queries from Realtime Database
    const queriesRef = ref(database, "chat_queries");

    const unsubscribeQueries = onValue(
      queriesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const queriesData = snapshot.val();
          const queriesList = Object.entries(queriesData).map(
            ([id, query]) => ({
              id,
              ...query,
            })
          );
          setPendingQueries(queriesList);
        } else {
          setPendingQueries([]);
        }
      },
      (error) => {
        console.error("Error fetching pending queries:", error);
        setError("Failed to load pending queries: " + error.message);
      }
    );

    return () => {
      unsubscribeSessions();
      unsubscribeQueries();
    };
  }, []);

  useEffect(() => {
    if (!mentorSearch) {
      setMentors([]);
      return;
    }

    const searchMentors = async () => {
      try {
        setSearchLoading(true);
        const mentorsQuery = query(
          collection(db, "users"),
          where("role", "==", "mentor"),
          where("email", ">=", mentorSearch.toLowerCase()),
          where("email", "<=", mentorSearch.toLowerCase() + "\uf8ff"),
          orderBy("email"),
          limit(5)
        );

        const snapshot = await getDocs(mentorsQuery);
        const mentorsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMentors(mentorsData);
      } catch (error) {
        console.error("Error searching mentors:", error);
        setError("Failed to search mentors: " + error.message);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchMentors, 300);
    return () => clearTimeout(debounceTimeout);
  }, [mentorSearch]);

  // Add effect to fetch available action types for audit log filtering
  useEffect(() => {
    const fetchActionTypes = async () => {
      try {
        const typeQuery = query(
          collection(db, "audit_logs"),
          orderBy("actionType"),
          limit(100)
        );
        const snapshot = await getDocs(typeQuery);

        // Extract unique action types
        const types = new Set();
        snapshot.forEach((doc) => {
          const actionType = doc.data().actionType;
          if (actionType) {
            types.add(actionType);
          }
        });

        setAvailableActionTypes(Array.from(types));
      } catch (error) {
        console.error("Error fetching action types:", error);
      }
    };

    fetchActionTypes();
  }, []);

  // Handlers for session form
  const handleAddSession = () => {
    setShowAddSession(true);
  };

  const handleCloseSessionForm = () => {
    setShowAddSession(false);
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <div className="tab-buttons">
        <button
          className={`tab-button ${activeTab === "sessions" ? "active" : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          Sessions
        </button>
        <button
          className={`tab-button ${activeTab === "payouts" ? "active" : ""}`}
          onClick={() => setActiveTab("payouts")}
        >
          Payouts
        </button>
        <button
          className={`tab-button ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          Audit Logs
        </button>
        <button
          className={`tab-button ${activeTab === "queries" ? "active" : ""}`}
          onClick={() => setActiveTab("queries")}
        >
          Chat Queries
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="tab-content">
        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="sessions-content">
            <div className="actions-bar">
              <button className="add-button" onClick={handleAddSession}>
                Add Session
              </button>
            </div>
            {loading ? (
              <div className="loading">Loading sessions...</div>
            ) : (
              <SessionList sessions={sessions} isAdmin={true} />
            )}
            {showAddSession && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <button
                    className="close-button"
                    onClick={handleCloseSessionForm}
                  >
                    &times;
                  </button>
                  <SessionForm onClose={handleCloseSessionForm} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === "payouts" && (
          <div className="payouts-content">
            <h2>Pending Payouts</h2>
            <div className="mentor-search">
              <input
                type="text"
                placeholder="Search mentors by email..."
                value={mentorSearch}
                onChange={(e) => setMentorSearch(e.target.value)}
              />
              {searchLoading && (
                <div className="search-loading">Loading...</div>
              )}
              {mentors.length > 0 && (
                <div className="mentor-results">
                  {mentors.map((mentor) => (
                    <div key={mentor.id} className="mentor-result-item">
                      {mentor.email} ({mentor.name})
                    </div>
                  ))}
                </div>
              )}
            </div>
            <PayoutListWithIndex
              onChangeStatus={handleChangePaymentStatus}
              filterMentorId={null} // No filtering by default
            />
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === "audit" && (
          <div className="audit-content">
            <h2>Audit Logs</h2>
            <div className="audit-filters">
              <div className="filter-group">
                <label>Filter by action:</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                >
                  <option value="all">All Actions</option>
                  {availableActionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Search by email:</label>
                <input
                  type="text"
                  placeholder="Enter email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <AuditLogsList searchTerm={searchTerm} actionType={actionType} />
          </div>
        )}

        {/* Chat Queries Tab */}
        {activeTab === "queries" && (
          <div className="queries-content">
            <h2>Customer Inquiries</h2>
            <div className="queries-list">
              {pendingQueries.length === 0 ? (
                <div className="no-data">No pending inquiries</div>
              ) : (
                <table className="queries-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingQueries.map((query) => (
                      <tr key={query.id}>
                        <td>{query.name}</td>
                        <td>{query.email}</td>
                        <td>
                          {new Date(query.timestamp).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              query.status === "Contacted"
                                ? "contacted"
                                : "not-contacted"
                            }`}
                          >
                            {query.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`resolve-button ${
                              query.status === "Contacted" ? "contacted" : ""
                            }`}
                            onClick={() =>
                              handleQueryResolution(
                                query.id,
                                query.status !== "Contacted"
                              )
                            }
                          >
                            {query.status === "Contacted"
                              ? "Mark as Not Contacted"
                              : "Mark as Contacted"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
