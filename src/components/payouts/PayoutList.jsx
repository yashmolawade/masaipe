import React, { useState, useEffect } from "react";
import { collection, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { generatePdf } from "../../utils/pdfGenerator";
import { PAYMENT_STATUS } from "../../types/index";
import PaymentModal from "./PaymentModal";
import {
  createActivityLog,
  logPayoutStatusChange,
} from "../../utils/auditTracker";
import "./Payouts.css";
import CryptoJS from "crypto-js";
import { useTheme } from "../../context/ThemeContext";

const PayoutList = ({ payouts, isAdmin, emailSearch, setEmailSearch }) => {
  const { currentUser } = useAuth();
  const { darkMode } = useTheme();
  const [processingId, setProcessingId] = useState(null);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [sendStatus, setSendStatus] = useState({});

  // Add hover effect styles for dark mode
  useEffect(() => {
    if (darkMode) {
      const style = document.createElement("style");
      style.id = "payout-table-hover-style";
      style.textContent = `
        /* Header styles for dark mode */
        [data-theme="dark"] .payout-table th,
        .dark-mode .payout-table th {
          background-color: black !important;
          color: white !important;
          border-bottom: 1px solid #333 !important;
        }
        
        /* Row hover styles */
        [data-theme="dark"] .payout-table tr:hover,
        .dark-mode .payout-table tr:hover {
          background-color: #ff3334 !important;
          color: black !important;
        }
        
        [data-theme="dark"] .payout-table tr:hover td,
        .dark-mode .payout-table tr:hover td {
          color: black !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        const existingStyle = document.getElementById(
          "payout-table-hover-style"
        );
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [darkMode]);

  const handlePayment = (payout) => {
    setSelectedPayout(payout);
  };

  const handleConfirmPayment = async (payoutId, paymentMethod) => {
    if (!isAdmin || !currentUser) {
      return;
    }

    try {
      setProcessingId(payoutId);
      const payoutRef = doc(db, "payouts", payoutId);
      const payout = payouts.find((p) => p.id === payoutId);

      if (!payout) {
        throw new Error("Payout not found");
      }

      const secret = "supersecretkey"; // In production, use a per-user or per-chat key!
      const updateData = {
        status: PAYMENT_STATUS.PAID,
        paidDate: Date.now(),
        paymentMethod: CryptoJS.AES.encrypt(paymentMethod, secret).toString(),
      };

      // Store the previous status for audit log
      const previousStatus = payout.status;

      await updateDoc(payoutRef, updateData);

      // Use our new audit log function
      const updatedPayout = {
        ...payout,
        status: PAYMENT_STATUS.PAID,
        paidDate: Date.now(),
        paymentMethod: CryptoJS.AES.encrypt(paymentMethod, secret).toString(),
      };

      await logPayoutStatusChange(
        {
          uid: currentUser.uid,
          email: currentUser.email,
          role: "admin",
        },
        updatedPayout,
        previousStatus
      );

      // Mark attendance as attended if sessionId exists
      if (payout.sessionId) {
        const sessionRef = doc(db, "sessions", payout.sessionId);
        await updateDoc(sessionRef, {
          isAttended: true,
          isPaid: true,
          uiStatus: "paid",
        });
      }

      setSelectedPayout(null);
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Failed to process payment: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = async (payout, newStatus) => {
    if (!isAdmin || !currentUser) {
      return;
    }

    try {
      setProcessingId(payout.id);
      const payoutRef = doc(db, "payouts", payout.id);

      // Store the previous status for audit log
      const previousStatus = payout.status;

      const secret = "supersecretkey"; // In production, use a per-user or per-chat key!
      const updateData = {
        status: newStatus,
        lastUpdated: Date.now(),
      };

      await updateDoc(payoutRef, updateData);

      // Use our new audit log function
      const updatedPayout = {
        ...payout,
        status: newStatus,
        lastUpdated: Date.now(),
      };

      await logPayoutStatusChange(
        {
          uid: currentUser.uid,
          email: currentUser.email,
          role: "admin",
        },
        updatedPayout,
        previousStatus
      );

      // If moving from under review to pending, update the session status
      if (payout.status === PAYMENT_STATUS.UNDER_REVIEW && payout.sessionId) {
        const sessionRef = doc(db, "sessions", payout.sessionId);

        // If marking it as paid directly from under review, update isPaid as well
        if (newStatus === PAYMENT_STATUS.PAID) {
          await updateDoc(sessionRef, {
            status: "paid",
            reviewedAt: Date.now(),
            reviewedBy: currentUser.email,
            isPaid: true,
            uiStatus: "paid",
          });
        } else {
          await updateDoc(sessionRef, {
            status: "pending",
            reviewedAt: Date.now(),
            reviewedBy: currentUser.email,
            uiStatus: newStatus === PAYMENT_STATUS.PAID ? "paid" : "review",
          });
        }

        await createActivityLog({
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userRole: "admin",
          actionType: "update_session_status",
          actionDetails: `Approved mentor attendance for session ${payout.sessionId}`,
          targetEntity: "session",
          targetId: payout.sessionId,
        });
      }
    } catch (error) {
      console.error("Error changing payout status:", error);
      alert("Failed to update payout status: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleGeneratePdf = (payout) => {
    generatePdf(payout);
  };

  const handleSendGmail = (payout) => {
    const subject = encodeURIComponent("Your Payment Receipt");
    const body = encodeURIComponent(
      `Hi,\n\nPlease find your payment receipt details below.\n\nSession Date: ${new Date(
        payout.createdAt
      ).toLocaleDateString()}\nNet Amount: $${(payout.netAmount || 0).toFixed(
        2
      )}\nStatus: ${
        payout.status
      }\n\nYou can also download the attached PDF from the app.\n\nThank you!`
    );
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      payout.mentorEmail
    )}&su=${subject}&body=${body}`;
    window.open(gmailUrl, "_blank");
  };

  // Calculate total amounts directly from payouts
  const totalPaid = payouts.reduce(
    (sum, payout) =>
      sum + (payout.status === PAYMENT_STATUS.PAID ? payout.netAmount || 0 : 0),
    0
  );
  const totalPending = payouts.reduce(
    (sum, payout) =>
      sum +
      (payout.status === PAYMENT_STATUS.PENDING ? payout.netAmount || 0 : 0),
    0
  );
  const totalUnderReview = payouts.reduce(
    (sum, payout) =>
      sum +
      (payout.status === PAYMENT_STATUS.UNDER_REVIEW
        ? payout.netAmount || 0
        : 0),
    0
  );

  return (
    <div className="payout-list">
      {payouts.length === 0 ? (
        <div className="empty-state">
          <h3>No payouts found</h3>
          <p>
            {isAdmin
              ? "Process payments for completed sessions to see them here."
              : "You have no payments yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="payout-summary">
            <div className="summary-card">
              <h3>Total Paid</h3>
              <div className="amount paid">${totalPaid.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <h3>Total Pending</h3>
              <div className="amount pending">${totalPending.toFixed(2)}</div>
            </div>
            {isAdmin && (
              <div className="summary-card">
                <h3>Under Review</h3>
                <div className="amount review">
                  ${totalUnderReview.toFixed(2)}
                </div>
              </div>
            )}
          </div>
          <div className="payout-table-container">
            <table className="payout-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {isAdmin && <th>Mentor</th>}
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td>{new Date(payout.createdAt).toLocaleDateString()}</td>
                    {isAdmin && <td>{payout.mentorEmail}</td>}
                    <td className="amount">
                      ${(payout.netAmount || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className={`status status-${payout.status}`}>
                        {payout.status === PAYMENT_STATUS.PAID
                          ? "Paid"
                          : payout.status === PAYMENT_STATUS.PENDING
                          ? "Pending"
                          : "Under Review"}
                      </span>
                    </td>
                    <td className="actions">
                      {/* Secondary buttons first */}
                      <button
                        className="action-btn secondary"
                        onClick={() => handleGeneratePdf(payout)}
                        title="Download Receipt"
                      >
                        Download PDF
                      </button>
                      <button
                        className="action-btn secondary"
                        onClick={() => handleSendGmail(payout)}
                        title="Send Receipt via Gmail"
                      >
                        Send Receipt (Gmail)
                      </button>

                      {/* Admin action buttons after secondary buttons */}
                      {isAdmin &&
                        payout.status === PAYMENT_STATUS.UNDER_REVIEW && (
                          <button
                            className="action-btn approve"
                            onClick={() =>
                              handleStatusChange(payout, PAYMENT_STATUS.PENDING)
                            }
                            disabled={processingId === payout.id}
                          >
                            {processingId === payout.id
                              ? "Processing..."
                              : "Approve"}
                          </button>
                        )}
                      {isAdmin && payout.status === PAYMENT_STATUS.PENDING && (
                        <button
                          className="action-btn primary"
                          onClick={() => handlePayment(payout)}
                          disabled={processingId === payout.id}
                        >
                          {processingId === payout.id
                            ? "Processing..."
                            : "Pay Now"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedPayout && (
            <PaymentModal
              payout={selectedPayout}
              onClose={() => setSelectedPayout(null)}
              onConfirmPayment={handleConfirmPayment}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PayoutList;
