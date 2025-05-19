import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  limit,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB_QsIxGdzSBGdwhtbNQUV0K4GcJ2amzDo",
  authDomain: "payout-2.firebaseapp.com",
  projectId: "payout-2",
  storageBucket: "payout-2.firebasestorage.app",
  messagingSenderId: "743805068795",
  appId: "1:743805068795:web:187baed199b89e1883975e",
  measurementId: "G-VP50RXPF6Q",
  databaseURL:
    "https://payout-2-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

// Prevent multiple initializations in dev mode / hot reloads
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

// Initialize Firestore with persistent cache configuration
let db;
try {
  db = initializeFirestore(app, {
    cache: persistentLocalCache({
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (err) {
  console.error("Error initializing Firestore with persistent cache:", err);
  // Fallback to default configuration if persistent cache fails
  db = getFirestore(app);
}

const analytics = getAnalytics(app);
const database = getDatabase(app); // Add Realtime Database

// Verify that the audit_logs collection exists and is accessible
const verifyAuditLogsCollection = async () => {
  try {
    // Query the collection to check if it exists and is accessible
    const auditLogsRef = collection(db, "audit_logs");
    const testQuery = query(auditLogsRef, limit(1));
    await getDocs(testQuery);
    return true;
  } catch (error) {
    console.error("Error verifying audit logs collection:", error);
    // The collection will be created automatically when the first document is added
    return false;
  }
};

// Run verification on app startup
verifyAuditLogsCollection();

export { app, auth, db, analytics, database };
