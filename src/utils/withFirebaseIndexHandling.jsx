import React, { useState, useEffect } from "react";
import indexManager from "./indexManager";

/**
 * Higher-order component that adds automatic index handling to components
 * that use Firebase Firestore queries
 *
 * @param {React.Component} WrappedComponent - The component to wrap
 * @returns {React.Component} - The wrapped component with index handling
 */
const withFirebaseIndexHandling = (WrappedComponent) => {
  return (props) => {
    const [indexErrors, setIndexErrors] = useState([]);
    const [isCreatingIndex, setIsCreatingIndex] = useState(false);

    // Function to execute a Firestore query with automatic index handling
    const executeQueryWithIndexHandling = async (
      queryFn,
      onSuccess,
      onError
    ) => {
      setIsCreatingIndex(true);

      try {
        const result = await indexManager.executeQueryWithIndexHandling(
          queryFn,
          (data) => {
            setIsCreatingIndex(false);
            if (onSuccess) onSuccess(data);
          },
          (error) => {
            setIsCreatingIndex(false);
            if (indexManager.isIndexError(error)) {
              // Add to our list of index errors
              setIndexErrors((prev) => [...prev, error.message]);
            }
            if (onError) onError(error);
          }
        );

        return result;
      } catch (error) {
        setIsCreatingIndex(false);
        if (onError) onError(error);
        return null;
      }
    };

    // Render our component with the additional props
    return (
      <>
        {indexErrors.length > 0 && (
          <div
            className="index-error-container"
            style={{
              padding: "10px",
              margin: "10px 0",
              backgroundColor: "rgba(255, 235, 230, 0.8)",
              borderRadius: "4px",
              display: isCreatingIndex ? "block" : "none",
            }}
          >
            <h4 style={{ margin: "0 0 8px 0" }}>Creating indexes...</h4>
            <p style={{ margin: "0 0 8px 0" }}>
              Firebase is creating new indexes for your queries. This may take a
              few minutes. You can continue using the application, but some
              results may be incomplete until the indexes are ready.
            </p>
            <div
              className="progress-indicator"
              style={{
                height: "4px",
                background: "linear-gradient(to right, #f06292, #ec407a)",
                width: "100%",
                borderRadius: "2px",
                animation: "progress 2s ease-in-out infinite",
              }}
            />
            <style jsx>{`
              @keyframes progress {
                0% {
                  background-position: -200px 0;
                }
                100% {
                  background-position: calc(200px + 100%) 0;
                }
              }
            `}</style>
          </div>
        )}
        <WrappedComponent
          {...props}
          executeQueryWithIndexHandling={executeQueryWithIndexHandling}
          isCreatingIndex={isCreatingIndex}
        />
      </>
    );
  };
};

export default withFirebaseIndexHandling;
