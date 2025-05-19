import React from 'react';
import './MessageBox.css';

const MessageBox = ({ 
  message, 
  type = 'info', 
  onClose, 
  onConfirm, 
  onCancel,
  isConfirmation = false,
  confirmText = 'Yes',
  cancelText = 'No',
  autoClose = 3000 
}) => {
  // Handle clicks on the overlay
  const handleOverlayClick = (e) => {
    // Only close if clicking the overlay itself, not its children
    if (e.target === e.currentTarget) {
      if (isConfirmation) {
        onCancel?.(); // Call onCancel for confirmation dialogs
      } else {
        onClose?.(); // Call onClose for regular messages
      }
    }
  };

  React.useEffect(() => {
    if (autoClose && !isConfirmation) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose, isConfirmation]);

  return (
    <div className="message-box-overlay" onClick={handleOverlayClick}>
      <div 
        className={`message-box-content ${type}`} 
        onClick={e => e.stopPropagation()}
      >
        <button className="message-box-close" onClick={onClose}>&times;</button>
        <div 
          className="message-box-message"
          dangerouslySetInnerHTML={{ __html: message }}
        />
        
        {isConfirmation ? (
          <div className="message-box-actions">
            <button className="confirm-button" onClick={onConfirm}>
              {confirmText}
            </button>
            <button className="cancel-button" onClick={onCancel || onClose}>
              {cancelText}
            </button>
          </div>
        ) : (
          <button className="message-box-close" onClick={onClose}>×</button>
        )}
      </div>
    </div>
  );
};

export default MessageBox; 