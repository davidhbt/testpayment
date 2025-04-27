import React, { useState } from 'react';
import axios from 'axios';

const CheckoutForm = () => {
  const [formData, setFormData] = useState({
    amount: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    currency: 'ETB',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txRef, setTxRef] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(''); // Track payment status
  const [iframeUrl, setIframeUrl] = useState(''); // URL for the iframe
  const [showIframe, setShowIframe] = useState(false); // Control iframe visibility

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Send payment data to the backend to initialize the payment
      const response = await axios.post('https://chapaapitest.onrender.com/api/checkout', formData);

      // Extract the payment URL and tx_ref (transaction reference)
      if (response.data.status === 'success') {
        setTxRef(response.data.tx_ref);

        // Set the iframe URL and show the overlay
        setIframeUrl(response.data.checkout_url);
        setShowIframe(true);

        // Start polling the backend for the payment status
        pollPaymentStatus(response.data.tx_ref);
      } else {
        setError('Payment initialization failed!');
      }
    } catch (err) {
      setError('Error initiating payment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Poll the payment status every 3 seconds
  const pollPaymentStatus = async (txRef) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`https://chapaapitest.onrender.com/api/payment-status/${txRef}`);
        const status = response.data.status;

        if (status === 'success' || status === 'failed') {
          setPaymentStatus(status); // Update payment status
          clearInterval(interval); // Stop polling once we get a final status
          setShowIframe(false); // Hide the iframe overlay
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000); // Poll every 3 seconds
  };

  return (
    <div className="checkout-form">
      <h2>Checkout Form</h2>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Amount (ETB):</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Phone Number:</label>
          <input
            type="tel"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          Pay Now
        </button>
      </form>

      {paymentStatus === 'pending' && <p>Please complete the payment in the overlay.</p>}
      {paymentStatus === 'success' && <p>Payment Successful!</p>}
      {paymentStatus === 'failed' && <p>Payment Failed. Please try again.</p>}

      {/* Iframe overlay */}
      {showIframe && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ position: 'relative', width: '80%', height: '80%' }}>
            <iframe
              src={iframeUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Payment"
            ></iframe>
            <button
  onClick={() => setShowIframe(false)}
  style={{
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ff4d4f', // A softer red color
    color: 'white',
    border: 'none',
    borderRadius: '50%', // Make it circular
    width: '40px',
    height: '40px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // Add a subtle shadow
    transition: 'transform 0.2s, background-color 0.2s', // Add hover effects
  }}
  onMouseEnter={(e) => (e.target.style.backgroundColor = '#ff7875')} // Hover effect
  onMouseLeave={(e) => (e.target.style.backgroundColor = '#ff4d4f')} // Reset on hover out
>
  ✕
</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutForm;