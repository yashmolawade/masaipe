import React, { useState, useEffect, useRef } from "react";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import {
  SESSION_TYPE,
  SESSION_STATUS,
  PAYMENT_STATUS,
} from "../../types/index";
import MessageBox from "../common/MessageBox";
import PayoutPDF from "../common/PayoutPDF";
import { PDFDownloadLink } from "@react-pdf/renderer";
import "./Sessions.css";
import {
  logSessionUpdate,
  logSessionDeletion,
  logSessionAttendance,
  logPayoutCreation,
} from "../../utils/auditTracker";

// Constants for payout calculations
const GST_PERCENTAGE = 8.75;
const TAX_PERCENTAGE = 15;
const FEES_PERCENTAGE = 5;

const SessionCard = ({ session, isAdmin, payouts }) => {
  const { currentUser } = useAuth();
  const [isCreatingPayout, setIsCreatingPayout] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMarkingAttended, setIsMarkingAttended] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [messageBox, setMessageBox] = useState({
    show: false,
    message: "",
    type: "info",
    isConfirmation: false,
  });
  const modalRef = useRef(null);

  // Get payout status for this session
  const sessionPayout = payouts?.find(
    (payout) => payout.sessionId === session.id
  );
  const payoutStatus = sessionPayout?.status || "unpaid";

  const showMessage = (message, type = "info") => {
    setMessageBox({ show: true, message, type, isConfirmation: false });
  };

  const showConfirmation = (message, onConfirm) => {
    setMessageBox({
      show: true,
      message,
      type: "warning",
      isConfirmation: true,
      onConfirm: () => {
        onConfirm();
        hideMessage();
      },
      onCancel: hideMessage,
    });
  };

  const hideMessage = () => {
    setMessageBox({
      show: false,
      message: "",
      type: "info",
      isConfirmation: false,
    });
  };

  // Handle body scroll when modal opens/closes
  useEffect(() => {
    if (isEditing) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isEditing]);

  // Handle click outside modal
  const handleClickOutside = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setIsEditing(false);
    }
  };

  const sessionTypeLabels = {
    [SESSION_TYPE.ONE_ON_ONE]: "One on One",
    [SESSION_TYPE.GROUP]: "Group Session",
    [SESSION_TYPE.WORKSHOP]: "Workshop",
    [SESSION_TYPE.REVIEW]: "Code Review",
  };

  // Format the initial date for the edit form
  const formatDateForInput = (timestamp) => {
    if (!timestamp) return new Date().toISOString().split("T")[0];
    const date = new Date(timestamp);
    return date.toISOString().split("T")[0];
  };

  const [editedSession, setEditedSession] = useState({
    sessionType: session.sessionType || SESSION_TYPE.ONE_ON_ONE,
    date: formatDateForInput(session.date),
    duration: session.duration || 0,
    ratePerHour: session.ratePerHour || 0,
    notes: session.notes || "",
  });

  // Format session date for display
  const sessionDate = session.date
    ? new Date(session.date).toLocaleDateString()
    : "N/A";

  const durationHours = session.duration ? session.duration / 60 : 0;

  // Calculate gross amount
  const grossAmount = session.ratePerHour
    ? session.ratePerHour * durationHours
    : 0;

  // Calculate GST (8.75%)
  const gst = grossAmount * (GST_PERCENTAGE / 100);

  // Calculate taxes (15%)
  const taxes = grossAmount * (TAX_PERCENTAGE / 100);

  // Calculate platform fee (5%)
  const platformFee = grossAmount * (FEES_PERCENTAGE / 100);

  // Calculate net payable amount
  const netPayableAmount = grossAmount - taxes - platformFee - gst;

  // Use the uiStatus field for consistent display
  const displayStatusMap = {
    paid: "Paid",
    unpaid: "Unpaid",
    review: "Under Review",
  };

  const displayStatus = displayStatusMap[session.uiStatus] || "Unpaid";
  const statusClass = session.uiStatus || "unpaid";

  const isPaid = payoutStatus === "paid";
  const isPending = payoutStatus === "pending";
  const isUnderReview = payoutStatus === "underReview";
  const isAttended = session.isAttended || false;

  const handleDelete = async () => {
    if (isPaid) {
      showMessage("Cannot delete a paid session", "error");
      return;
    }

    showConfirmation(
      "Are you sure you want to delete this session?",
      async () => {
        try {
          setIsDeleting(true);
          const sessionRef = doc(db, "sessions", session.id);
          await deleteDoc(sessionRef);

          // Log the deletion with our new audit tracking function
          await logSessionDeletion(
            {
              uid: currentUser.uid,
              email: currentUser.email,
              role: "admin",
            },
            session
          );

          showMessage("Session deleted successfully", "success");
        } catch (error) {
          console.error("Error deleting session:", error);
          showMessage("Failed to delete session: " + error.message, "error");
        } finally {
          setIsDeleting(false);
        }
      }
    );
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditedSession((prev) => ({
      ...prev,
      [name]:
        name === "notes" || name === "date" || name === "sessionType"
          ? value
          : Number(value),
    }));
  };

  const handleEdit = async () => {
    if (isPaid) {
      alert("Cannot edit a paid session");
      return;
    }

    try {
      setIsEditing(false);
      setIsUpdating(true);
      const sessionRef = doc(db, "sessions", session.id);

      // Save previous session data for audit log
      const previousData = { ...session };

      // Format the updated session data
      const updatedSessionData = {
        ...editedSession,
        date: new Date(editedSession.date + "T00:00:00").getTime(),
        updatedAt: Date.now(),
      };

      await updateDoc(sessionRef, updatedSessionData);

      // Log the update with our new audit tracking function
      await logSessionUpdate(
        {
          uid: currentUser.uid,
          email: currentUser.email,
          role: "admin",
        },
        { id: session.id, ...updatedSessionData },
        previousData
      );

      showMessage("Session updated successfully", "success");
    } catch (error) {
      console.error("Error updating session:", error);
      showMessage("Failed to update session: " + error.message, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreatePayout = async () => {
    if (isPaid || isPending) {
      showMessage("Payout already processed", "info");
      return;
    }

    const payoutDetailsTable = `
      <table class="payout-calculation-table">
        <tr>
          <th>Item</th>
          <th class="amount-column">Amount</th>
        </tr>
        <tr>
          <td>Gross Payout</td>
          <td>$${grossAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td>GST (${GST_PERCENTAGE}%)</td>
          <td>$${gst.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Taxes (${TAX_PERCENTAGE}%)</td>
          <td>$${taxes.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Platform Fee (${FEES_PERCENTAGE}%)</td>
          <td>$${platformFee.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Net Payable Amount</strong></td>
          <td><strong>$${netPayableAmount.toFixed(2)}</strong></td>
        </tr>
      </table>
      <p>Do you want to proceed with this payout?</p>`;

    showConfirmation(payoutDetailsTable, async () => {
      try {
        setIsCreatingPayout(true);

        // Create a new payout document
        const payoutData = {
          sessionId: session.id,
          mentorId: session.mentorId,
          mentorEmail: session.mentorEmail,
          grossAmount,
          gst,
          taxes,
          platformFee,
          netAmount: netPayableAmount,
          status: PAYMENT_STATUS.PENDING,
          createdAt: Date.now(),
          sessionDate: session.date,
          sessionType: session.sessionType,
        };

        const payoutRef = await addDoc(collection(db, "payouts"), payoutData);
        const payoutWithId = { ...payoutData, id: payoutRef.id };

        // Log the payout creation with our new audit tracking function
        await logPayoutCreation(
          {
            uid: currentUser.uid,
            email: currentUser.email,
            role: "admin",
          },
          payoutWithId
        );

        showMessage("Payout created successfully", "success");
      } catch (error) {
        console.error("Error creating payout:", error);
        showMessage("Failed to create payout: " + error.message, "error");
      } finally {
        setIsCreatingPayout(false);
      }
    });
  };

  const handleMarkAttended = async () => {
    if (isAttended) {
      showMessage("Session already marked as attended", "info");
      return;
    }

    showConfirmation(
      "Are you confirming that you have attended this session?",
      async () => {
        try {
          setIsMarkingAttended(true);

          // Update the session to mark as attended
          const sessionRef = doc(db, "sessions", session.id);

          // Track what we're updating for audit logs
          const updatedSessionData = {
            id: session.id,
            isAttended: true,
            attendedAt: Date.now(),
            status: SESSION_STATUS.REVIEW,
            uiStatus: "review",
          };

          await updateDoc(sessionRef, {
            isAttended: true,
            attendedAt: Date.now(),
            status: SESSION_STATUS.REVIEW,
            uiStatus: "review",
          });

          // Log the attendance marking with our new audit tracking function
          await logSessionAttendance(
            {
              uid: currentUser.uid,
              email: currentUser.email,
              role: "mentor",
            },
            { ...session, ...updatedSessionData }
          );

          // Create a new payout document with status under review
          const payoutData = {
            sessionId: session.id,
            mentorId: session.mentorId,
            mentorEmail: session.mentorEmail,
            grossAmount,
            gst,
            taxes,
            platformFee,
            netAmount: netPayableAmount,
            status: PAYMENT_STATUS.UNDER_REVIEW,
            createdAt: Date.now(),
            sessionDate: session.date,
            sessionType: session.sessionType,
          };

          const payoutRef = await addDoc(collection(db, "payouts"), payoutData);
          const payoutWithId = { ...payoutData, id: payoutRef.id };

          // Log the payout creation with our new audit tracking function
          await logPayoutCreation(
            {
              uid: currentUser.uid,
              email: currentUser.email,
              role: "mentor",
            },
            payoutWithId
          );

          showMessage(
            "Session marked as attended and submitted for review",
            "success"
          );
        } catch (error) {
          console.error("Error marking session as attended:", error);
          showMessage(
            "Failed to mark session as attended: " + error.message,
            "error"
          );
        } finally {
          setIsMarkingAttended(false);
        }
      }
    );
  };

  return (
    <>
      <div className="session-card">
        <div className="session-details">
          <p className="detail-row">
            <strong>Mentor:</strong>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {session.mentorEmail}
              <span className={`status-badge ${statusClass}`}>
                {displayStatus}
              </span>
            </span>
          </p>
          <p className="detail-row">
            <strong>Type:</strong>{" "}
            <span>{sessionTypeLabels[session.sessionType]}</span>
          </p>
          <p className="detail-row">
            <strong>Date:</strong> <span>{sessionDate}</span>
          </p>
          <p className="detail-row">
            <strong>Duration:</strong> <span>{session.duration} minutes</span>
          </p>
          <p className="detail-row">
            <strong>Rate:</strong> <span>${session.ratePerHour}/hour</span>
          </p>
          {session.notes && (
            <p className="detail-row notes">
              <strong>Notes:</strong> <span>{session.notes}</span>
            </p>
          )}
          {session.isAttended && (
            <p className="detail-row attendance">
              <strong>Attendance:</strong>{" "}
              <span className="attended">Attended ✓</span>
            </p>
          )}

          <div className="session-amount net-amount">
            <div className="amount-label">Net Payable:</div>
            <div className="amount-value">${netPayableAmount.toFixed(2)}</div>
          </div>
        </div>

        {isAdmin && (
          <div className="session-actions">
            <div className="session-action-buttons">
              <div className="action-buttons-left">
                {!isPaid && (
                  <>
                    <button
                      className="symbol-button edit"
                      onClick={() => setIsEditing(true)}
                      disabled={isCreatingPayout || isDeleting || isPending}
                      title="Edit Session"
                    >
                      ✎
                    </button>
                    <button
                      className="symbol-button delete"
                      onClick={handleDelete}
                      disabled={isCreatingPayout || isDeleting || isPending}
                      title="Delete Session"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
              <div className="action-buttons-right">
                {(isPaid || isPending) && (
                  <PDFDownloadLink
                    document={
                      <PayoutPDF
                        session={session}
                        payoutDetails={{
                          grossAmount,
                          gst,
                          taxes,
                          platformFee,
                          netAmount: netPayableAmount,
                        }}
                      />
                    }
                    style={{ backgroundColor: "black", color: "white" }}
                    fileName={`payout-${session.id}-${
                      new Date().toISOString().split("T")[0]
                    }.pdf`}
                    className="download-pdf-button"
                  >
                    {({ blob, url, loading, error }) =>
                      loading ? "Generating PDF..." : "Download PDF"
                    }
                  </PDFDownloadLink>
                )}
                {!isPaid && !isPending && (
                  <div className="button-row">
                    <button
                      style={{ backgroundColor: "black", color: "white" }}
                      className="payout-button"
                      onClick={handleCreatePayout}
                      disabled={isCreatingPayout || isDeleting}
                    >
                      {isCreatingPayout ? (
                        <span>Processing...</span>
                      ) : (
                        <span>Payout</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!isAdmin &&
          currentUser &&
          currentUser.uid === session.mentorId &&
          !isPaid &&
          !isPending &&
          !isUnderReview &&
          !isAttended && (
            <div className="session-actions">
              <div className="session-action-buttons">
                <div className="action-buttons-right">
                  <button
                    style={{ backgroundColor: "green", color: "white" }}
                    className="attendance-button"
                    onClick={handleMarkAttended}
                    disabled={isMarkingAttended}
                  >
                    {isMarkingAttended ? (
                      <span>Submitting...</span>
                    ) : (
                      <span>Session Attended</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>

      {messageBox.show && (
        <MessageBox
          message={messageBox.message}
          type={messageBox.type}
          onClose={hideMessage}
          isConfirmation={messageBox.isConfirmation}
          onConfirm={messageBox.onConfirm}
          onCancel={messageBox.onCancel}
        />
      )}

      {isEditing && (
        <div className="modal-overlay" onClick={handleClickOutside}>
          <div className="modal-content" ref={modalRef}>
            <div className="modal-header">
              <h2>Edit Session</h2>
              <button
                className="modal-close"
                onClick={() => setIsEditing(false)}
              >
                ×
              </button>
            </div>
            <div className="session-edit-form">
              <div className="form-group">
                <label htmlFor="sessionType">Session Type</label>
                <select
                  id="sessionType"
                  name="sessionType"
                  value={editedSession.sessionType}
                  onChange={handleEditChange}
                >
                  {Object.entries(sessionTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  className="filter-date"
                  value={editedSession.date}
                  onChange={handleEditChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="duration">Duration (minutes)</label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={editedSession.duration}
                  onChange={handleEditChange}
                  min="15"
                  step="15"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ratePerHour">Rate per Hour ($)</label>
                <input
                  type="number"
                  id="ratePerHour"
                  name="ratePerHour"
                  value={editedSession.ratePerHour}
                  onChange={handleEditChange}
                  min="1"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={editedSession.notes}
                  onChange={handleEditChange}
                  rows="4"
                />
              </div>

              <div className="form-actions">
                <button
                  className="secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary"
                  onClick={handleEdit}
                  disabled={isCreatingPayout || isDeleting}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SessionCard;
