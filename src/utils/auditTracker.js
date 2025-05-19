import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Create a user activity log in Firestore
 * @param {Object} logData - Data to log
 * @returns {Promise<string>} - ID of the created document
 */
export const createActivityLog = async (logData) => {
  try {
    // Create a complete log object with required fields
    const logEntry = {
      userId: logData.userId || "unknown",
      userEmail: logData.userEmail || "unknown",
      userRole: logData.userRole || "unknown",
      actionType: logData.actionType || "unknown",
      actionDetails: logData.actionDetails || "",
      ipAddress: logData.ipAddress || "unknown",
      userAgent: logData.userAgent || "unknown",
      timestamp: serverTimestamp(), // Use Firestore server timestamp
      createdAt: new Date().toISOString(), // Also include ISO string for compatibility
    };

    // Add optional fields if they exist
    if (logData.targetId) logEntry.targetId = logData.targetId;
    if (logData.targetEntity) logEntry.targetEntity = logData.targetEntity;
    if (logData.beforeData) logEntry.beforeData = logData.beforeData;
    if (logData.afterData) logEntry.afterData = logData.afterData;

    // Add document to the audit_logs collection
    const docRef = await addDoc(collection(db, "audit_logs"), logEntry);
    return docRef.id;
  } catch (error) {
    console.error("Error creating activity log:", error);
    return null;
  }
};

/**
 * Log a user login event
 * @param {Object} userData - User data
 * @returns {Promise<string>} - ID of the created document
 */
export const logUserLogin = async (userData) => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  return createActivityLog({
    userId: userData.uid,
    userEmail: userData.email,
    userRole: userData.role,
    actionType: "login",
    actionDetails: `User logged in | Platform: ${platform}`,
    userAgent: userAgent,
  });
};

/**
 * Log a user logout event
 * @param {Object} userData - User data
 * @returns {Promise<string>} - ID of the created document
 */
export const logUserLogout = async (userData) => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  return createActivityLog({
    userId: userData.uid,
    userEmail: userData.email,
    userRole: userData.role,
    actionType: "logout",
    actionDetails: `User logged out | Platform: ${platform}`,
    userAgent: userAgent,
  });
};

/**
 * Log session creation
 * @param {Object} userData - User data of who created the session
 * @param {Object} sessionData - Session data
 * @returns {Promise<string>} - ID of the created document
 */
export const logSessionCreation = async (userData, sessionData) => {
  return createActivityLog({
    userId: userData.uid,
    userEmail: userData.email,
    userRole: userData.role || "admin",
    actionType: "create_session",
    actionDetails: `Created ${sessionData.sessionType} session for ${sessionData.mentorEmail}`,
    targetEntity: "session",
    targetId: sessionData.id,
    afterData: sessionData,
  });
};

/**
 * Log session update/edit
 * @param {Object} userData - User data of who updated the session
 * @param {Object} sessionData - Session data after update
 * @param {Object} previousData - Session data before update
 * @returns {Promise<string>} - ID of the created document
 */
export const logSessionUpdate = async (userData, sessionData, previousData) => {
  return createActivityLog({
    userId: userData.uid,
    userEmail: userData.email,
    userRole: userData.role || "admin",
    actionType: "update_session",
    actionDetails: `Updated session ${sessionData.id} for ${sessionData.mentorEmail}`,
    targetEntity: "session",
    targetId: sessionData.id,
    beforeData: previousData,
    afterData: sessionData,
  });
};

/**
 * Log session deletion
 * @param {Object} userData - User data of who deleted the session
 * @param {Object} sessionData - Session data that was deleted
 * @returns {Promise<string>} - ID of the created document
 */
export const logSessionDeletion = async (userData, sessionData) => {
  return createActivityLog({
    userId: userData.uid,
    userEmail: userData.email,
    userRole: userData.role || "admin",
    actionType: "delete_session",
    actionDetails: `Deleted session ${sessionData.id} for ${sessionData.mentorEmail}`,
    targetEntity: "session",
    targetId: sessionData.id,
    beforeData: sessionData,
  });
};

/**
 * Log session attendance marking
 * @param {Object} userData - User data of who marked the attendance
 * @param {Object} sessionData - Session data
 * @returns {Promise<string>} - ID of the created document
 */
export const logSessionAttendance = async (userData, sessionData) => {
  return createActivityLog({
    userId: userData.uid,
    userEmail: userData.email,
    userRole: userData.role || "mentor",
    actionType: "mark_attendance",
    actionDetails: `Marked session ${sessionData.id} as attended`,
    targetEntity: "session",
    targetId: sessionData.id,
    beforeData: { isAttended: false },
    afterData: { isAttended: true, attendedAt: new Date().toISOString() },
  });
};

/**
 * Log payout creation
 * @param {Object} userData - User data of who created the payout
 * @param {Object} payoutData - Payout data
 * @returns {Promise<string>} - ID of the created document
 */
export const logPayoutCreation = async (userData, payoutData) => {
  return createActivityLog({
    userId: userData.uid,
    userEmail: userData.email,
    userRole: userData.role || "admin",
    actionType: "create_payout",
    actionDetails: `Created payout for ${
      payoutData.mentorEmail
    } - Amount: $${payoutData.netAmount.toFixed(2)}`,
    targetEntity: "payout",
    targetId: payoutData.id,
    afterData: payoutData,
  });
};

/**
 * Log payout status change
 * @param {Object} userData - User data of who changed the payout
 * @param {Object} payoutData - Updated payout data
 * @param {string} previousStatus - Previous status
 * @returns {Promise<string>} - ID of the created document
 */
export const logPayoutStatusChange = async (
  userData,
  payoutData,
  previousStatus
) => {
  return createActivityLog({
    userId: userData.uid,
    userEmail: userData.email,
    userRole: userData.role || "admin",
    actionType: "update_payout_status",
    actionDetails: `Updated payout status from ${previousStatus} to ${payoutData.status} for ${payoutData.mentorEmail}`,
    targetEntity: "payout",
    targetId: payoutData.id,
    beforeData: { status: previousStatus },
    afterData: { status: payoutData.status },
  });
};

/**
 * Create a test log entry to verify Firestore connection
 * @returns {Promise<string>} - ID of the created document
 */
export const createTestLog = async () => {
  return createActivityLog({
    userId: "test-user",
    userEmail: "system-test@" + window.location.hostname,
    userRole: "system",
    actionType: "test",
    actionDetails: "Test log entry",
    userAgent: navigator.userAgent,
  });
};
