import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Get basic client information for audit logging
 * @returns {string} - A string with client information
 */
export const getClientInfo = () => {
  const { userAgent, platform } = window.navigator;
  const hostname = window.location.hostname;

  return `${hostname} | ${platform} | ${userAgent.substring(0, 100)}`;
};

/**
 * Log an action to the audit trail
 * @param {Object} logData - The log data
 * @param {string} logData.userId - The user ID
 * @param {string} logData.userEmail - The user email
 * @param {string} logData.actionType - The type of action (e.g., 'login', 'create_session', 'update_payout')
 * @param {string} logData.targetEntity - The entity being affected (e.g., 'session', 'payout', 'user')
 * @param {string} logData.targetId - The ID of the entity being affected
 * @param {string} logData.details - Additional details about the action
 * @param {Object} [logData.beforeData] - The data before the change (for updates)
 * @param {Object} [logData.afterData] - The data after the change (for updates)
 * @returns {Promise<string>} - The ID of the created log document
 */
export const logAuditTrail = async (logData) => {
  try {
    // Validate required fields
    const requiredFields = ["userId", "actionType"];
    for (const field of requiredFields) {
      if (!logData[field]) {
        console.error(`Audit log missing required field: ${field}`);
        return null;
      }
    }

    // Create the log entry
    const logEntry = {
      userId: logData.userId,
      userEmail: logData.userEmail || "",
      actionType: logData.actionType,
      targetEntity: logData.targetEntity || "",
      targetId: logData.targetId || "",
      details: logData.details || "",
      timestamp: Date.now(),
      // Only include beforeData and afterData if they exist
      ...(logData.beforeData && { beforeData: logData.beforeData }),
      ...(logData.afterData && { afterData: logData.afterData }),
    };

    // Add the log entry to Firestore
    const docRef = await addDoc(collection(db, "audit_logs"), logEntry);
    return docRef.id;
  } catch (error) {
    console.error("Error creating audit log:", error);
    return null;
  }
};

/**
 * Log a user login action
 * @param {string} userId - The user ID
 * @param {string} userEmail - The user email
 * @param {string} [details] - Additional details
 * @param {string} [role] - User role (admin/mentor)
 * @returns {Promise<string>} - The ID of the created log document
 */
export const logLogin = async (
  userId,
  userEmail,
  details = "User logged in",
  role = "user"
) => {
  return logAuditTrail({
    userId,
    userEmail,
    actionType: "login",
    targetEntity: role,
    targetId: userId,
    details,
  });
};

/**
 * Log a user logout action
 * @param {string} userId - The user ID
 * @param {string} userEmail - The user email
 * @param {string} [details] - Additional details
 * @param {string} [role] - User role (admin/mentor)
 * @returns {Promise<string>} - The ID of the created log document
 */
export const logLogout = async (
  userId,
  userEmail,
  details = "User logged out",
  role = "user"
) => {
  return logAuditTrail({
    userId,
    userEmail,
    actionType: "logout",
    targetEntity: role,
    targetId: userId,
    details,
  });
};

/**
 * Log a session creation action
 * @param {string} userId - The user ID creating the session
 * @param {string} userEmail - The user email
 * @param {string} sessionId - The session ID
 * @param {string} mentorEmail - The mentor email
 * @param {Object} sessionData - The session data
 * @returns {Promise<string>} - The ID of the created log document
 */
export const logSessionCreation = async (
  userId,
  userEmail,
  sessionId,
  mentorEmail,
  sessionData
) => {
  return logAuditTrail({
    userId,
    userEmail,
    actionType: "create_session",
    targetEntity: "session",
    targetId: sessionId,
    details: `Created ${sessionData.sessionType} session for ${mentorEmail}`,
    afterData: sessionData,
  });
};

/**
 * Log a session update action
 * @param {string} userId - The user ID updating the session
 * @param {string} userEmail - The user email
 * @param {string} sessionId - The session ID
 * @param {Object} beforeData - The session data before the update
 * @param {Object} afterData - The session data after the update
 * @returns {Promise<string>} - The ID of the created log document
 */
export const logSessionUpdate = async (
  userId,
  userEmail,
  sessionId,
  beforeData,
  afterData
) => {
  return logAuditTrail({
    userId,
    userEmail,
    actionType: "update_session",
    targetEntity: "session",
    targetId: sessionId,
    details: `Updated session for ${
      afterData.mentorEmail || beforeData.mentorEmail
    }`,
    beforeData,
    afterData,
  });
};

/**
 * Log a payout creation action
 * @param {string} userId - The user ID creating the payout
 * @param {string} userEmail - The user email
 * @param {string} payoutId - The payout ID
 * @param {string} mentorEmail - The mentor email
 * @param {Object} payoutData - The payout data
 * @returns {Promise<string>} - The ID of the created log document
 */
export const logPayoutCreation = async (
  userId,
  userEmail,
  payoutId,
  mentorEmail,
  payoutData
) => {
  return logAuditTrail({
    userId,
    userEmail,
    actionType: "create_payout",
    targetEntity: "payout",
    targetId: payoutId,
    details: `Created payout for ${mentorEmail}`,
    afterData: payoutData,
  });
};

/**
 * Log a payout status update action
 * @param {string} userId - The user ID updating the payout
 * @param {string} userEmail - The user email
 * @param {string} payoutId - The payout ID
 * @param {string} oldStatus - The old status
 * @param {string} newStatus - The new status
 * @param {string} mentorEmail - The mentor email
 * @returns {Promise<string>} - The ID of the created log document
 */
export const logPayoutStatusUpdate = async (
  userId,
  userEmail,
  payoutId,
  oldStatus,
  newStatus,
  mentorEmail
) => {
  return logAuditTrail({
    userId,
    userEmail,
    actionType: "update_payout_status",
    targetEntity: "payout",
    targetId: payoutId,
    details: `Updated payout status from ${oldStatus} to ${newStatus} for ${mentorEmail}`,
    beforeData: { status: oldStatus },
    afterData: { status: newStatus },
  });
};

export default {
  logAuditTrail,
  logLogin,
  logLogout,
  logSessionCreation,
  logSessionUpdate,
  logPayoutCreation,
  logPayoutStatusUpdate,
};
