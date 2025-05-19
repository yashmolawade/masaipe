import React, { useState } from "react";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { SESSION_TYPE } from "../../types/index";
import { logSessionCreation } from "../../utils/auditTracker";
import CsvSessionUploader from "./CsvSessionUploader";
import "./Sessions.css";

const SessionForm = () => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    mentorEmail: "",
    sessionType: SESSION_TYPE.ONE_ON_ONE,
    date: "",
    duration: 60,
    ratePerHour: 50,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "duration" || name === "ratePerHour" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      setError("Please log in to create a session");
      return;
    }

    if (!formData.mentorEmail || !formData.date) {
      setError("Please fill all required fields");
      return;
    }

    // Validate that selected date is not in the past
    const selectedDate = new Date(formData.date);
    selectedDate.setHours(0, 0, 0, 0); // Reset time to start of day

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    if (selectedDate < today) {
      setError("Session date cannot be in the past");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Fetch mentor UID by email
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", formData.mentorEmail)
      );
      const userSnapshot = await getDocs(usersQuery);

      if (userSnapshot.empty) {
        setError("No mentor found with this email");
        setLoading(false);
        return;
      }

      const mentorDoc = userSnapshot.docs[0];
      const mentorData = mentorDoc.data();

      // Check if the user is a mentor
      if (mentorData.role !== "mentor") {
        setError("Sessions can only be created for mentors");
        setLoading(false);
        return;
      }

      const mentorId = mentorDoc.id; // Get mentor's UID

      // Create session document
      const sessionData = {
        mentorId: mentorId,
        mentorEmail: formData.mentorEmail,
        sessionType: formData.sessionType,
        date: selectedDate.getTime(),
        duration: formData.duration,
        ratePerHour: formData.ratePerHour,
        notes: formData.notes,
        createdAt: Date.now(),
        createdBy: currentUser.uid,
        isPaid: false,
        status: "pending", // Add status field
        isAttended: false, // Initialize isAttended as false
        uiStatus: "unpaid", // Add uiStatus field to ensure it appears in the correct tab
      };

      // Save the session to Firestore
      const docRef = await addDoc(collection(db, "sessions"), sessionData);

      // Add the document ID to the session data for logging
      const sessionWithId = { ...sessionData, id: docRef.id };

      // Use the new audit tracking function for session creation
      await logSessionCreation(
        {
          uid: currentUser.uid,
          email: currentUser.email,
          role: currentUser.email.includes("admin") ? "admin" : "user",
        },
        sessionWithId
      );

      // Reset form and show success message
      setFormData({
        mentorEmail: "",
        sessionType: SESSION_TYPE.ONE_ON_ONE,
        date: "",
        duration: 60,
        ratePerHour: 50,
        notes: "",
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error("Error creating session:", error);
      setError("Failed to create session: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="session-forms-container">
      <CsvSessionUploader />

      <div className="session-form-container">
        <h3>Add New Session</h3>

        {error && <div className="form-error">{error}</div>}
        {success && (
          <div className="form-success">Session added successfully!</div>
        )}

        <form onSubmit={handleSubmit} className="session-form">
          <div className="form-group">
            <label htmlFor="mentorEmail">
              Mentor Email <span className="required">*</span>
            </label>
            <input
              type="email"
              id="mentorEmail"
              name="mentorEmail"
              value={formData.mentorEmail}
              onChange={handleChange}
              placeholder="mentor@example.com"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sessionType">
                Session Type <span className="required">*</span>
              </label>
              <select
                id="sessionType"
                name="sessionType"
                value={formData.sessionType}
                onChange={handleChange}
                required
              >
                <option value={SESSION_TYPE.ONE_ON_ONE}>One on One</option>
                <option value={SESSION_TYPE.GROUP}>Group Session</option>
                <option value={SESSION_TYPE.WORKSHOP}>Workshop</option>
                <option value={SESSION_TYPE.REVIEW}>Code Review</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">
                Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="date"
                name="date"
                className="filter-date"
                value={formData.date}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="duration">
                Duration (minutes) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="15"
                step="15"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ratePerHour">
                Hourly Rate ($) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="ratePerHour"
                name="ratePerHour"
                value={formData.ratePerHour}
                onChange={handleChange}
                min="1"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional information about the session"
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionForm;
