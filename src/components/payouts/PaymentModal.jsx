import React, { useState } from 'react';
import './Payouts.css';

const PaymentModal = ({ payout, onClose, onConfirmPayment }) => {
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentMethods = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: '💳'
    },
    {
      id: 'upi',
      name: 'UPI',
      icon: '📱'
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      icon: '🏦'
    },
    {
      id: 'wallet',
      name: 'Digital Wallet',
      icon: '👝'
    }
  ];

  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      // Here you would integrate with your actual payment gateway
      // For now, we'll simulate a payment process
      await new Promise(resolve => setTimeout(resolve, 1500));
      onConfirmPayment(payout.id, selectedMethod);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        
        <div className="payment-header">
          <h2>Complete Payment</h2>
          <div className="payment-amount">
            <span className="amount-label">Amount to Pay:</span>
            <span className="amount-value">${(payout.netAmount || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="payment-details">
          <div className="mentor-info">
            <p><strong>Mentor:</strong> {payout.mentorEmail}</p>
            <p><strong>Session Date:</strong> {new Date(payout.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="payment-methods">
            <h3>Select Payment Method</h3>
            <div className="methods-grid">
              {paymentMethods.map(method => (
                <div
                  key={method.id}
                  className={`method-card ${selectedMethod === method.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <span className="method-icon">{method.icon}</span>
                  <span className="method-name">{method.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="payment-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${(payout.netAmount || 0).toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Processing Fee</span>
              <span>$0.00</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${(payout.netAmount || 0).toFixed(2)}</span>
            </div>
          </div>

          <button
            className="pay-now-btn"
            onClick={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal; 