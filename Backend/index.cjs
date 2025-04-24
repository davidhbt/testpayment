require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = 5400;

let paymentStatuses = {};  // In-memory store for payment statuses

app.use(cors());
app.use(express.json());
app.use('/callback', bodyParser.json());  // For handling raw JSON from Chapa's callback

// 1. Checkout endpoint (User initiates payment)
app.post('/api/checkout', async (req, res) => {
  const { amount, email, first_name, last_name, phone_number, currency = 'ETB' } = req.body;
  const tx_ref = `tx-${Date.now()}`;  // Unique transaction reference

  try {
    const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', {
      amount,
      currency,
      email,
      first_name,
      last_name,
      phone_number,
      tx_ref,
      callback_url: 'http://localhost:5400/callback',  // Your callback URL
      return_url: 'http://localhost:5400/thank-you',  // URL to redirect user after payment
      customizations: {
        title: 'mahi market',
        description: 'Payment for your awesome service'
      }
    }, {
      headers: {
        Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Save payment status as pending
    paymentStatuses[tx_ref] = 'pending';

    // Send payment URL back to the frontend
    res.status(200).json({ status: 'success', checkout_url: response.data.data.checkout_url, tx_ref });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// 2. Webhook to handle Chapa's callback and verify the transaction
app.post('/callback', async (req, res) => {
  const { status, tx_ref, message, data } = req.body;  // Data from Chapa's callback
  console.log('Chapa Callback Data:', req.body); // Log the callback data for debugging

  try {
    // Verify the transaction with Chapa API
    const verifyResponse = await axios.get(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      headers: {
        Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`
      }
    });

    const { status: verifyStatus, data: verifyData } = verifyResponse.data;

    if (verifyStatus === 'success' && verifyData.payment_status === 'SUCCESS') {
      console.log(`Payment verified successfully for tx_ref: ${tx_ref}`);
      // Update payment status to 'success'
      paymentStatuses[tx_ref] = 'success';
      res.status(200).send('Payment successfully verified!');
    } else {
      console.log(`Payment verification failed for tx_ref: ${tx_ref}`);
      // Update payment status to 'failed'
      paymentStatuses[tx_ref] = 'failed';
      res.status(400).send('Payment verification failed!');
    }
  } catch (error) {
    console.error('Error verifying transaction:', error.response?.data || error.message);
    paymentStatuses[tx_ref] = 'failed';
    res.status(500).send('Error verifying transaction');
  }
});

// 3. Polling endpoint for checking payment status
app.get('/api/payment-status/:tx_ref', (req, res) => {
  const { tx_ref } = req.params;
  const status = paymentStatuses[tx_ref] || 'pending';
  res.status(200).json({ tx_ref, status });
});

// Server listening
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
