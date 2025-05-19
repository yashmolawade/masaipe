import { useState, useCallback, useRef } from "react";
import { useLoading } from "../contexts/LoadingContext";

/**
 * Custom hook for making fetch requests with automatic loading state management
 * @returns {Object} Object containing fetch methods with loading state management
 */
const useFetchWithLoader = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { showLoader, hideLoader } = useLoading();
  const activeRequestsRef = useRef(0);

  /**
   * Perform a fetch request with automatic loading indicator
   * @param {Function} fetchFn - Async function that performs the actual fetch
   * @param {string} loadingText - Text to display in the loader
   * @param {boolean} suppressErrors - Whether to suppress errors (useful for background operations)
   * @returns {Promise<any>} - Result of the fetch operation
   */
  const fetchWithLoader = useCallback(
    async (fetchFn, loadingText = "Loading...", suppressErrors = false) => {
      setError(null);

      // Increment active requests counter
      activeRequestsRef.current += 1;

      // Only show loader if this is the first active request
      if (activeRequestsRef.current === 1) {
        showLoader(loadingText);
      }

      try {
        const result = await fetchFn();
        setData(result);
        return result;
      } catch (err) {
        // Check if this is a Firebase persistence-related error (which we can ignore)
        const isFirebasePersistenceError =
          err?.code === "failed-precondition" &&
          err?.message?.includes("persistence layer");

        // Only set error state if it's not a Firebase persistence error or suppressErrors is false
        if (!isFirebasePersistenceError && !suppressErrors) {
          setError(err);
        }

        // Only throw if we're not suppressing errors and it's not a Firebase persistence error
        if (!suppressErrors && !isFirebasePersistenceError) {
          throw err;
        }

        // For Firebase persistence errors or when suppressing errors, just return null
        return null;
      } finally {
        // Decrement active requests counter
        activeRequestsRef.current -= 1;

        // Only hide loader if there are no more active requests
        if (activeRequestsRef.current === 0) {
          hideLoader();
        }
      }
    },
    [showLoader, hideLoader]
  );

  /**
   * Perform a background fetch without showing the loader
   * @param {Function} fetchFn - Async function that performs the actual fetch
   * @param {boolean} suppressErrors - Whether to suppress errors
   * @returns {Promise<any>} - Result of the fetch operation
   */
  const fetchSilently = useCallback(async (fetchFn, suppressErrors = true) => {
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
      return result;
    } catch (err) {
      if (!suppressErrors) {
        setError(err);
        throw err;
      }
      return null;
    }
  }, []);

  return {
    fetchWithLoader,
    fetchSilently,
    data,
    error,
    isLoading: activeRequestsRef.current > 0,
  };
};

export default useFetchWithLoader;
