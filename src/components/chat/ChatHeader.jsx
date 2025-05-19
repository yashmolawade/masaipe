import React from "react";
import PropTypes from "prop-types";

export const ChatHeader = ({ partnerName }) => {
  return (
    <div className="chat-header">
      <h3>Chat with {partnerName}</h3>
      <p>Send messages about payouts, sessions, and other inquiries</p>
    </div>
  );
};

ChatHeader.propTypes = {
  partnerName: PropTypes.string.isRequired,
};
