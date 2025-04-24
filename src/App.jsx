// src/CheckoutForm.js

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
  const [paymentStatus, setPaymentStatus] = useState('pending');  // Track payment status

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

        // Open the Chapa payment page in a new window
        window.open(response.data.checkout_url, '_blank');

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
          setPaymentStatus(status);  // Update payment status
          clearInterval(interval);  // Stop polling once we get a final status
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
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>First Name:</label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Last Name:</label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
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

      {paymentStatus === 'pending' && <p>Please complete the payment in the new window.</p>}
      {paymentStatus === 'success' && <p>Payment Successful!</p>}
      {paymentStatus === 'failed' && <p>Payment Failed. Please try again.</p>}
    </div>
  );
};

export default CheckoutForm;
