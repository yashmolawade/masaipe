import React from 'react';
import './Popup.css';

const Popup = ({ message, type = 'info', onClose, autoClose = 3000 }) => {
  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  return (
    <div className="popup-overlay">
      <div className={`popup-content ${type}`}>
        <div className="popup-message">{message}</div>
        <button className="popup-close" onClick={onClose}>×</button>
      </div>
    </div>
  );
};

export default Popup; 