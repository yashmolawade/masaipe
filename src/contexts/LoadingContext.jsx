import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import UniversalLoader from "../components/common/UniversalLoader";

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const showLoader = useCallback((message = "Loading...") => {
    setLoadingMessage(message);
    setIsLoading(true);
  }, []);

  const hideLoader = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage("");
  }, []);

  const value = useMemo(
    () => ({
      showLoader,
      hideLoader,
      isLoading,
      loadingMessage,
    }),
    [showLoader, hideLoader, isLoading, loadingMessage]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isLoading && <UniversalLoader message={loadingMessage} />}
    </LoadingContext.Provider>
  );
};

export default LoadingContext;
