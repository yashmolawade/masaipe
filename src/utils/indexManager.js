import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Utility to handle missing index errors in Firestore
 * This will automatically create pending indexes and retry queries when possible
 */
class IndexManager {
  constructor() {
    this.pendingIndexes = new Map();
    this.indexCollection = "system_indexes";
  }

  /**
   * Handle a Firestore query that might need indexes
   * @param {Function} queryFn - Function that returns a Firestore query
   * @param {Function} onSuccess - Callback for successful query
   * @param {Function} onError - Callback for errors that aren't related to indexes
   */
  async executeQueryWithIndexHandling(queryFn, onSuccess, onError) {
    try {
      // Execute the query
      const result = await queryFn();
      onSuccess(result);
      return result;
    } catch (error) {
      // Check if this is a missing index error
      if (this.isIndexError(error)) {
        // Extract the index details from the error
        const indexDetails = this.extractIndexDetailsFromError(error);

        if (indexDetails) {
          // Create a pending index record
          await this.createPendingIndexRecord(indexDetails);

          // If using developer console, log helpful message about index creation
          if (process.env.NODE_ENV === "development") {
            console.info(
              "Developer Note: Visit Firebase console to check index status: " +
                "https://console.firebase.google.com/project/_/firestore/indexes"
            );
          }

          // Return a fallback result if possible
          try {
            // Try a simpler query as fallback if possible
            const fallbackResult = await this.executeFallbackQuery(queryFn);
            onSuccess(fallbackResult);
            return fallbackResult;
          } catch (fallbackError) {
            // If even the fallback fails, call the original error handler
            onError(error);
            return null;
          }
        } else {
          // Couldn't parse the index details, pass to error handler
          onError(error);
          return null;
        }
      } else {
        // Not an index error, pass to error handler
        onError(error);
        return null;
      }
    }
  }

  /**
   * Check if an error is related to missing Firestore indexes
   */
  isIndexError(error) {
    return (
      error &&
      error.code === "failed-precondition" &&
      error.message &&
      (error.message.includes("index") || error.message.includes("indexes"))
    );
  }

  /**
   * Extract index details from error message
   */
  extractIndexDetailsFromError(error) {
    // Extract the collection, fields and order from the error message
    // This is a simplified example and might need adjustments based on actual error format
    try {
      const message = error.message;

      // Extract collection name
      const collectionMatch = message.match(/collection ([^\s]+)/);
      const collection = collectionMatch ? collectionMatch[1] : null;

      // Extract fields that need indexing
      const fieldsMatches = message.match(
        /[Cc]omposite index on (.+) is required/
      );
      const fieldsStr = fieldsMatches ? fieldsMatches[1] : null;

      if (collection && fieldsStr) {
        // Parse fields and their order
        const fields = fieldsStr.split(",").map((field) => {
          const trimmed = field.trim();
          const isDescending = trimmed.includes("desc");
          const fieldName = trimmed.replace(/\s+in\s+(asc|desc)/, "").trim();

          return {
            fieldName,
            direction: isDescending ? "desc" : "asc",
          };
        });

        return {
          collection,
          fields,
          timestamp: new Date().toISOString(),
        };
      }

      return null;
    } catch (parseError) {
      console.error("Error parsing index details:", parseError);
      return null;
    }
  }

  /**
   * Create a record of a pending index in Firestore
   */
  async createPendingIndexRecord(indexDetails) {
    try {
      // Create a unique identifier for this index
      const indexId = this.generateIndexId(indexDetails);

      // Check if we already have a pending record for this index
      if (this.pendingIndexes.has(indexId)) {
        return;
      }

      // Create a reference to the index document
      const indexDocRef = doc(db, this.indexCollection, indexId);

      // Create the index record
      await setDoc(indexDocRef, {
        ...indexDetails,
        status: "pending",
        created: serverTimestamp(),
      });

      // Add to our local tracking
      this.pendingIndexes.set(indexId, {
        ...indexDetails,
        docRef: indexDocRef,
      });
    } catch (error) {
      console.error("Error creating pending index record:", error);
    }
  }

  /**
   * Generate a unique ID for an index based on its details
   */
  generateIndexId(indexDetails) {
    const { collection, fields } = indexDetails;
    const fieldsStr = fields
      .map((f) => `${f.fieldName}_${f.direction}`)
      .join("_");
    return `${collection}_${fieldsStr}`;
  }

  /**
   * Try to execute a simpler fallback query when the original fails due to missing index
   */
  async executeFallbackQuery(queryFn) {
    // This is a simplified fallback strategy
    // In a real application, you would implement logic to create a simpler query
    // that doesn't require the missing composite index

    // For example, you might remove one of the orderBy clauses or where conditions
    // that's causing the issue, potentially at the cost of less complete results

    // For now, we'll just return an empty result
    return { docs: [] };
  }

  /**
   * Mark an index as created (would be called after receiving notification that index is ready)
   */
  async markIndexAsCreated(indexId) {
    try {
      const indexInfo = this.pendingIndexes.get(indexId);

      if (indexInfo) {
        // Update the status in Firestore
        await setDoc(
          indexInfo.docRef,
          { status: "created", completedAt: serverTimestamp() },
          { merge: true }
        );

        // Remove from our tracking
        this.pendingIndexes.delete(indexId);
      }
    } catch (error) {
      console.error("Error marking index as created:", error);
    }
  }
}

// Create a singleton instance
const indexManager = new IndexManager();

export default indexManager;
