import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import SessionCard from "./SessionCard";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import "./Sessions.css";

const ITEMS_PER_PAGE = 6;
const SCROLL_AMOUNT = 280; // Width of one card

const SessionList = ({ sessions, isAdmin, payouts }) => {
  const { currentUser } = useAuth();
  const [unpaidPage, setUnpaidPage] = useState(1);
  const [paidPage, setPaidPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [mentorPage, setMentorPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const sessionsGridRefs = useRef({
    unpaid: null,
    review: null,
    paid: null,
    mentor: null,
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scrollCarousel = (direction, gridKey) => {
    if (!isMobile) return;

    const container = sessionsGridRefs.current[gridKey];
    if (!container) return;

    const scrollAmount = direction === "prev" ? -SCROLL_AMOUNT : SCROLL_AMOUNT;
    container.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  const renderSessionGrid = (sessions, gridKey) => {
    if (!sessions.length) return null;

    return (
      <div className="relative">
        <div
          className="sessions-grid"
          ref={(el) => (sessionsGridRefs.current[gridKey] = el)}
        >
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isAdmin={isAdmin}
              payouts={payouts}
            />
          ))}
        </div>
      </div>
    );
  };

  if (sessions.length === 0) {
    return (
      <div className="empty-state">
        <h3>No sessions found</h3>
        <p>
          {isAdmin
            ? "Create a new session to get started."
            : "You have no sessions yet."}
        </p>
      </div>
    );
  }

  // Sort sessions by date first (most recent first)
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Group sessions by status and payment
  const unpaidSessions = sortedSessions.filter(
    (session) => session.uiStatus === "unpaid"
  );
  const underReviewSessions = sortedSessions.filter(
    (session) => session.uiStatus === "review"
  );
  const paidSessions = sortedSessions.filter(
    (session) => session.uiStatus === "paid"
  );

  // Calculate pagination for unpaid sessions
  const unpaidTotalPages = Math.ceil(unpaidSessions.length / ITEMS_PER_PAGE);
  const unpaidStartIndex = (unpaidPage - 1) * ITEMS_PER_PAGE;
  const unpaidEndIndex = unpaidStartIndex + ITEMS_PER_PAGE;
  const unpaidSessionsToShow = unpaidSessions.slice(
    unpaidStartIndex,
    unpaidEndIndex
  );

  // Calculate pagination for review sessions
  const reviewTotalPages = Math.ceil(
    underReviewSessions.length / ITEMS_PER_PAGE
  );
  const reviewStartIndex = (reviewPage - 1) * ITEMS_PER_PAGE;
  const reviewEndIndex = reviewStartIndex + ITEMS_PER_PAGE;
  const reviewSessionsToShow = underReviewSessions.slice(
    reviewStartIndex,
    reviewEndIndex
  );

  // Calculate pagination for paid sessions
  const paidTotalPages = Math.ceil(paidSessions.length / ITEMS_PER_PAGE);
  const paidStartIndex = (paidPage - 1) * ITEMS_PER_PAGE;
  const paidEndIndex = paidStartIndex + ITEMS_PER_PAGE;
  const paidSessionsToShow = paidSessions.slice(paidStartIndex, paidEndIndex);

  // For mentor view, use the sorted sessions
  const mentorTotalPages = Math.ceil(sortedSessions.length / ITEMS_PER_PAGE);
  const mentorStartIndex = (mentorPage - 1) * ITEMS_PER_PAGE;
  const mentorEndIndex = mentorStartIndex + ITEMS_PER_PAGE;
  const mentorSessionsToShow = sortedSessions.slice(
    mentorStartIndex,
    mentorEndIndex
  );

  const PaginationControls = ({ currentPage, totalPages, setPage, label }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="pagination-controls">
        <button
          className="pagination-arrow"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          <svg viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="pagination-arrow"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          <svg viewBox="0 0 24 24">
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="session-list">
      {isAdmin ? (
        <>
          {unpaidSessions.length > 0 && (
            <div className="session-section">
              <h3>
                Unpaid Sessions{" "}
                <span className="count">({unpaidSessions.length})</span>
              </h3>
              {renderSessionGrid(unpaidSessionsToShow, "unpaid")}
              {!isMobile && (
                <PaginationControls
                  currentPage={unpaidPage}
                  totalPages={unpaidTotalPages}
                  setPage={setUnpaidPage}
                  label="Unpaid Sessions"
                />
              )}
            </div>
          )}

          {underReviewSessions.length > 0 && (
            <div className="session-section">
              <h3>
                Under Review{" "}
                <span className="count">({underReviewSessions.length})</span>
              </h3>
              {renderSessionGrid(reviewSessionsToShow, "review")}
              {!isMobile && (
                <PaginationControls
                  currentPage={reviewPage}
                  totalPages={reviewTotalPages}
                  setPage={setReviewPage}
                  label="Under Review Sessions"
                />
              )}
            </div>
          )}

          {paidSessions.length > 0 && (
            <div className="session-section">
              <h3>
                Paid Sessions{" "}
                <span className="count">({paidSessions.length})</span>
              </h3>
              {renderSessionGrid(paidSessionsToShow, "paid")}
              {!isMobile && (
                <PaginationControls
                  currentPage={paidPage}
                  totalPages={paidTotalPages}
                  setPage={setPaidPage}
                  label="Paid Sessions"
                />
              )}
            </div>
          )}
        </>
      ) : (
        <div className="session-section">
          <h3>
            Your Sessions <span className="count">({sessions.length})</span>
          </h3>
          {renderSessionGrid(
            isMobile ? sortedSessions : mentorSessionsToShow,
            "mentor"
          )}
          {!isMobile && (
            <PaginationControls
              currentPage={mentorPage}
              totalPages={mentorTotalPages}
              setPage={setMentorPage}
              label="Your Sessions"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SessionList;
