import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { PAYMENT_STATUS } from "../../types/index";
import PayoutList from "../payouts/PayoutList";
import withFirebaseIndexHandling from "../../utils/withFirebaseIndexHandling";
import Loader3D from "../common/Loader3D";

const PayoutListWithIndex = ({
  onChangeStatus,
  filterMentorId = null,
  executeQueryWithIndexHandling,
  isCreatingIndex,
}) => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);

    const createQuery = () => {
      const payoutsQuery = query(
        collection(db, "payouts"),
        orderBy("createdAt", "desc")
      );
      return payoutsQuery;
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
        const payoutsData = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Basic validation for required fields
          if (!data.mentorId || !data.amount) {
            console.warn(`Payout ${doc.id} is missing required fields`);
          }

          // Set the status
          let status = data.status || PAYMENT_STATUS.PENDING;

          return {
            id: doc.id,
            ...data,
            status,
          };
        });

        setPayouts(payoutsData);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error("Error fetching payouts:", error);
        setError("Failed to load payouts: " + error.message);
        setLoading(false);
      }
    );

    return () => {}; // No cleanup needed as we're handling it in executeQueryWithIndexHandling
  }, [executeQueryWithIndexHandling]);

  if (loading && payouts.length === 0) {
    return (
      <Loader3D
        text={
          isCreatingIndex
            ? "Creating necessary payout indexes..."
            : "Loading payouts..."
        }
      />
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  // Filter payouts by mentor ID if specified
  const filteredPayouts = filterMentorId
    ? payouts.filter((payout) => payout.mentorId === filterMentorId)
    : payouts;

  return (
    <PayoutList
      payouts={filteredPayouts}
      onChangeStatus={onChangeStatus}
      filterMentorId={filterMentorId}
    />
  );
};

export default withFirebaseIndexHandling(PayoutListWithIndex);
