import React, { useState, useRef, useEffect } from "react";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { SESSION_TYPE } from "../../types/index";
import { logSessionCreation } from "../../utils/auditTracker";
import Papa from "papaparse";
import "./Sessions.css";

const CsvSessionUploader = () => {
  const { currentUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [results, setResults] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const fileInputRef = useRef(null);
  const [currentPreviewPage, setCurrentPreviewPage] = useState(1);
  const entriesPerPage = 5;

  const handleFileChange = (e) => {
    setError(""); // Clear previous errors
    setSuccess(""); // Clear previous success messages
    setResults(null); // Clear previous results

    try {
      const file = e.target.files[0];
      if (!file) {
        setCsvFile(null);
        return;
      }

      // Check if it's a CSV file
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        setError(
          "Please upload a CSV file. Only .csv file extensions are accepted."
        );
        setCsvFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // Check file size (max 5MB for example)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB. Please upload a smaller file.");
        setCsvFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // Update state with the selected file
      setCsvFile(file);
    } catch (error) {
      console.error("Error handling file selection:", error);
      setError(`Error selecting file: ${error.message}`);
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const validateRow = (row, rowIndex) => {
    const errors = [];

    // Required fields
    if (!row.mentorEmail) {
      errors.push(`Row ${rowIndex + 1}: Mentor email is required`);
    } else if (!/\S+@\S+\.\S+/.test(row.mentorEmail)) {
      errors.push(`Row ${rowIndex + 1}: Invalid email format`);
    }

    // Session type
    if (!row.sessionType) {
      errors.push(`Row ${rowIndex + 1}: Session type is required`);
    } else {
      // Get the actual values, not the enum keys
      const validTypes = Object.values(SESSION_TYPE);
      if (!validTypes.includes(row.sessionType)) {
        errors.push(
          `Row ${rowIndex + 1}: Invalid session type '${
            row.sessionType
          }'. Valid types are: ${validTypes.join(", ")}`
        );
      }
    }

    // Date - validate and parse dd-mm-yyyy format
    if (!row.date) {
      errors.push(`Row ${rowIndex + 1}: Date is required`);
    } else {
      // Check for dd-mm-yyyy format using regex
      const dateRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
      const match = row.date.match(dateRegex);

      if (!match) {
        errors.push(
          `Row ${rowIndex + 1}: Invalid date format. Use DD-MM-YYYY format.`
        );
      } else {
        // Extract day, month, year from regex match
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
        const year = parseInt(match[3], 10);

        // Create date object and validate
        const parsedDate = new Date(year, month, day);

        // Check if date is valid (e.g., not 31-02-2023)
        const isValidDate =
          parsedDate.getFullYear() === year &&
          parsedDate.getMonth() === month &&
          parsedDate.getDate() === day;

        if (!isValidDate) {
          errors.push(
            `Row ${rowIndex + 1}: Invalid date. The date does not exist.`
          );
        } else {
          // Compare with today to check if it's in the future
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          parsedDate.setHours(0, 0, 0, 0);

          if (parsedDate < today) {
            errors.push(
              `Row ${rowIndex + 1}: Session date cannot be in the past`
            );
          }
        }
      }
    }

    // Duration
    if (!row.duration) {
      errors.push(`Row ${rowIndex + 1}: Duration is required`);
    } else {
      const duration = Number(row.duration);
      if (isNaN(duration) || duration < 15) {
        errors.push(
          `Row ${
            rowIndex + 1
          }: Duration must be a number and at least 15 minutes`
        );
      }
    }

    // Rate
    if (!row.ratePerHour) {
      errors.push(`Row ${rowIndex + 1}: Hourly rate is required`);
    } else {
      const rate = Number(row.ratePerHour);
      if (isNaN(rate) || rate <= 0) {
        errors.push(
          `Row ${rowIndex + 1}: Hourly rate must be a positive number`
        );
      }
    }

    return errors;
  };

  const parseCSV = () => {
    if (!csvFile) {
      setError("Please select a CSV file first");
      return;
    }

    try {
      // Create a FileReader to safely read the file
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const csvData = e.target.result;

          Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            trimHeaders: true,
            transform: (value) => (value ? value.trim() : value), // Trim all values safely
            complete: (results) => {
              // Validate all rows
              let allErrors = [];
              results.data.forEach((row, index) => {
                const rowErrors = validateRow(row, index);
                allErrors = [...allErrors, ...rowErrors];
              });

              if (allErrors.length > 0) {
                setError(allErrors.join("\n"));
                setResults(null);
              } else {
                setResults(results);
                setError("");
                setSuccess(
                  `CSV validated successfully. Found ${results.data.length} sessions.`
                );
              }
            },
            error: (error) => {
              console.error("PapaParse error:", error);
              setError(`Error parsing CSV data: ${error.message}`);
              setResults(null);
            },
          });
        } catch (parseError) {
          console.error("Parse error:", parseError);
          setError(`Error processing CSV: ${parseError.message}`);
          setResults(null);
        }
      };

      reader.onerror = (e) => {
        console.error("FileReader error:", e);
        setError(
          "Error reading file: The file could not be read. Please try again with a different file."
        );
        setResults(null);
      };

      reader.readAsText(csvFile);
    } catch (fileError) {
      console.error("File access error:", fileError);
      setError(
        `Error accessing file: ${fileError.message}. Please try selecting the file again.`
      );
      setResults(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      setError("Please log in to create sessions");
      return;
    }

    if (!results || results.data.length === 0) {
      setError("Please upload and validate a CSV file first");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      let successCount = 0;
      let failureCount = 0;
      const failures = [];

      // Process each row
      for (let i = 0; i < results.data.length; i++) {
        const row = results.data[i];
        try {
          // Validate that the session type is valid before proceeding
          const sessionType = row.sessionType.trim();
          if (!Object.values(SESSION_TYPE).includes(sessionType)) {
            failures.push(
              `Row ${i + 1}: Invalid session type '${sessionType}'`
            );
            failureCount++;
            continue;
          }

          // Fetch mentor UID by email
          const usersQuery = query(
            collection(db, "users"),
            where("email", "==", row.mentorEmail)
          );
          const userSnapshot = await getDocs(usersQuery);

          if (userSnapshot.empty) {
            failures.push(
              `Row ${i + 1}: No mentor found with email ${row.mentorEmail}`
            );
            failureCount++;
            continue;
          }

          const mentorDoc = userSnapshot.docs[0];
          const mentorData = mentorDoc.data();

          // Check if the user is a mentor
          if (mentorData.role !== "mentor") {
            failures.push(
              `Row ${i + 1}: User ${row.mentorEmail} is not a mentor`
            );
            failureCount++;
            continue;
          }

          const mentorId = mentorDoc.id;

          // Parse date from dd-mm-yyyy format
          const dateParts = row.date.split("-");
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
          const year = parseInt(dateParts[2], 10);
          const sessionDate = new Date(year, month, day);

          // Create session document
          const sessionData = {
            mentorId: mentorId,
            mentorEmail: row.mentorEmail,
            sessionType: sessionType, // use validated session type
            date: sessionDate.getTime(),
            duration: Number(row.duration),
            ratePerHour: Number(row.ratePerHour),
            notes: row.notes || "",
            createdAt: Date.now(),
            createdBy: currentUser.uid,
            isPaid: false,
            status: "pending",
            isAttended: false,
          };

          // Save the session to Firestore
          const docRef = await addDoc(collection(db, "sessions"), sessionData);

          // Add the document ID to the session data for logging
          const sessionWithId = { ...sessionData, id: docRef.id };

          // Log session creation
          await logSessionCreation(
            {
              uid: currentUser.uid,
              email: currentUser.email,
              role: currentUser.email.includes("admin") ? "admin" : "user",
            },
            sessionWithId
          );

          successCount++;
        } catch (error) {
          failures.push(`Row ${i + 1}: ${error.message}`);
          failureCount++;
        }
      }

      // Show results
      if (failures.length > 0) {
        setError(
          `Failed to create ${failureCount} sessions:\n${failures.join("\n")}`
        );
      }

      if (successCount > 0) {
        setSuccess(
          `Successfully created ${successCount} sessions out of ${results.data.length}.`
        );
      } else {
        setSuccess("");
      }

      // Reset form if everything was successful
      if (successCount === results.data.length) {
        setCsvFile(null);
        setResults(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error) {
      setError(`Error uploading sessions: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Calculate paginated preview data
  const getPaginatedPreviewData = () => {
    if (!results || !results.data) return [];
    const startIndex = (currentPreviewPage - 1) * entriesPerPage;
    return results.data.slice(startIndex, startIndex + entriesPerPage);
  };

  // Handle page navigation
  const goToNextPreviewPage = () => {
    if (
      results &&
      currentPreviewPage < Math.ceil(results.data.length / entriesPerPage)
    ) {
      setCurrentPreviewPage(currentPreviewPage + 1);
    }
  };

  const goToPrevPreviewPage = () => {
    if (currentPreviewPage > 1) {
      setCurrentPreviewPage(currentPreviewPage - 1);
    }
  };

  // Reset preview page when new results come in
  useEffect(() => {
    setCurrentPreviewPage(1);
  }, [results]);

  return (
    <div className="session-form-container csv-uploader">
      <h3>Bulk Upload Sessions from CSV</h3>

      {error && (
        <div className="form-error">
          {error}
          {error.includes("permission") || error.includes("not be read") ? (
            <div className="error-troubleshooting">
              <p>
                <strong>Troubleshooting tips:</strong>
              </p>
              <ul>
                <li>Try selecting the file again</li>
                <li>Make sure the file is not open in another program</li>
                <li>Try saving a copy of the file and upload that instead</li>
                <li>
                  If using Excel, save the file explicitly as CSV (Comma
                  delimited)
                </li>
                <li>Make sure your browser has permission to access files</li>
              </ul>
            </div>
          ) : null}
        </div>
      )}
      {success && <div className="form-success">{success}</div>}

      <form onSubmit={handleSubmit} className="session-form">
        <div className="form-group">
          <label htmlFor="csvFile">
            CSV File <span className="required">*</span>
          </label>
          <div className="file-upload-container">
            <input
              type="file"
              id="csvFile"
              accept=".csv"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="file-input"
            />
          </div>
          <div className="help-text">
            <p>
              CSV must include these exact column names:
              <br />
              <code>
                mentorEmail,sessionType,date,duration,ratePerHour,notes
              </code>
            </p>
            <p>
              <strong>Valid session types:</strong>{" "}
              {Object.values(SESSION_TYPE).join(", ")}
            </p>
            <p>
              <strong>Example:</strong>
              <br />
              <code>
                mentor@example.com,oneOnOne,25-12-2023,60,50,Session notes
              </code>
            </p>
            <a href="/session_template.csv" download className="template-link">
              Download template CSV
            </a>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={parseCSV}
            disabled={!csvFile || uploading}
            className="secondary-button"
          >
            {csvFile ? "Validate CSV" : "Select a file first"}
          </button>
          <button type="submit" disabled={!results || uploading}>
            {uploading ? "Uploading..." : "Upload Sessions"}
          </button>
        </div>
      </form>

      {results && (
        <div className="csv-preview">
          <h4>CSV Preview ({results.data.length} sessions)</h4>
          <div className="csv-table-container">
            <table className="csv-table">
              <thead>
                <tr>
                  {results.meta.fields.map((field) => (
                    <th key={field}>{field}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getPaginatedPreviewData().map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {results.meta.fields.map((field) => (
                      <td key={field}>{row[field] || "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {results.data.length > entriesPerPage && (
              <div className="preview-pagination">
                <button
                  onClick={goToPrevPreviewPage}
                  disabled={currentPreviewPage === 1}
                  className="preview-pagination-btn"
                >
                  Previous
                </button>
                <span className="preview-pagination-info">
                  Page {currentPreviewPage} of{" "}
                  {Math.ceil(results.data.length / entriesPerPage)}
                </span>
                <button
                  onClick={goToNextPreviewPage}
                  disabled={
                    currentPreviewPage >=
                    Math.ceil(results.data.length / entriesPerPage)
                  }
                  className="preview-pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvSessionUploader;
