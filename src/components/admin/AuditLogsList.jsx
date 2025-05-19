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
import { db } from "../../firebase/config";
import withFirebaseIndexHandling from "../../utils/withFirebaseIndexHandling";
import Loader3D from "../common/Loader3D";

const AuditLogsList = ({
  searchTerm = "",
  actionType = "all",
  executeQueryWithIndexHandling,
  isCreatingIndex,
}) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const LOGS_PER_PAGE = 10;

  useEffect(() => {
    setLoading(true);
    // Reset pagination when search changes
    setFirstVisible(null);
    setLastVisible(null);
    setCurrentPage(1);

    const createQuery = () => {
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

      return auditLogsQuery;
    };

    // Using our index handling utility
    const fetchQueryWithIndexHandling = async () => {
      return new Promise((resolve, reject) => {
        const unsubscribe = onSnapshot(
          createQuery(),
          (snapshot) => {
            unsubscribe();
            resolve(snapshot);
          },
          (error) => {
            unsubscribe();
            reject(error);
          }
        );
      });
    };

    executeQueryWithIndexHandling(
      fetchQueryWithIndexHandling,
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

    return () => {}; // No cleanup needed as we're handling it in executeQueryWithIndexHandling
  }, [searchTerm, actionType, executeQueryWithIndexHandling]);

  const loadNextPage = async () => {
    if (!lastVisible) return;

    setLoading(true);

    const createNextQuery = () => {
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

      return nextQuery;
    };

    const fetchNextPage = async () => {
      return await getDocs(createNextQuery());
    };

    executeQueryWithIndexHandling(
      fetchNextPage,
      (snapshot) => {
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
        setLoading(false);
      },
      (error) => {
        console.error("Error loading next page:", error);
        setError("Failed to load more logs: " + error.message);
        setLoading(false);
      }
    );
  };

  const loadPreviousPage = async () => {
    if (!firstVisible) return;

    setLoading(true);

    const createPrevQuery = () => {
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

      return prevQuery;
    };

    const fetchPrevPage = async () => {
      return await getDocs(createPrevQuery());
    };

    executeQueryWithIndexHandling(
      fetchPrevPage,
      (snapshot) => {
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
        setLoading(false);
      },
      (error) => {
        console.error("Error loading previous page:", error);
        setError("Failed to load previous logs: " + error.message);
        setLoading(false);
      }
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    // Handle different timestamp formats
    try {
      let date;

      // Check if timestamp is a Firestore server timestamp
      if (
        timestamp &&
        timestamp.toDate &&
        typeof timestamp.toDate === "function"
      ) {
        date = timestamp.toDate();
      }
      // Check if timestamp is a Firebase timestamp with seconds field
      else if (timestamp && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      // Check if timestamp is a number (milliseconds since epoch)
      else if (typeof timestamp === "number") {
        date = new Date(timestamp);
      }
      // Check if timestamp is already a Date object
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Check if timestamp is an ISO string date
      else if (typeof timestamp === "string") {
        date = new Date(timestamp);
      } else {
        return "Invalid date";
      }

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      // Format date as a readable string
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error, timestamp);
      return "Error formatting date";
    }
  };

  if (loading && logs.length === 0) {
    return (
      <Loader3D
        text={
          isCreatingIndex
            ? "Creating necessary indexes..."
            : "Loading audit logs..."
        }
      />
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="audit-logs-container">
      {logs.length === 0 ? (
        <div className="no-data">No audit logs found</div>
      ) : (
        <>
          <div className="audit-logs-table">
            <div className="audit-logs-header">
              <div className="audit-logs-cell">User</div>
              <div className="audit-logs-cell">Action</div>
              <div className="audit-logs-cell">Details</div>
              <div className="audit-logs-cell">Time</div>
            </div>
            {logs.map((log) => (
              <div key={log.id} className="audit-logs-row">
                <div className="audit-logs-cell user-cell">
                  <div>{log.userEmail || "N/A"}</div>
                  <div className="role-badge">{log.userRole || "unknown"}</div>
                </div>
                <div className="audit-logs-cell action-cell">
                  <span
                    className={`action-type ${log.actionType || "unknown"}`}
                  >
                    {log.actionType || "unknown"}
                  </span>
                </div>
                <div className="audit-logs-cell details-cell">
                  {log.actionDetails || "No details provided"}
                  {log.targetEntity ? (
                    <span className="target-entity">
                      {" "}
                      in <strong>{log.targetEntity}</strong>
                    </span>
                  ) : null}
                </div>
                <div className="audit-logs-cell time-cell">
                  {formatDate(log.timestamp)}
                </div>
              </div>
            ))}
          </div>
          <div className="pagination-controls">
            <button
              onClick={loadPreviousPage}
              disabled={!hasPrevious || loading}
              className={`pagination-button ${
                !hasPrevious || loading ? "disabled" : ""
              }`}
            >
              Previous
            </button>
            <span className="page-indicator">Page {currentPage}</span>
            <button
              onClick={loadNextPage}
              disabled={!hasMore || loading}
              className={`pagination-button ${
                !hasMore || loading ? "disabled" : ""
              }`}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default withFirebaseIndexHandling(AuditLogsList);
