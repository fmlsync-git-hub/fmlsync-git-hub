// --- Secure Twilio Proxy Server Example ---
// This is a simple Node.js server using the Express framework.
// Its purpose is to securely handle API requests to Twilio without exposing
// your secret credentials on the frontend application.

// --- How to use this file ---
// 1. Install dependencies: In a new folder, run `npm init -y`, then `npm install express twilio cors dotenv`.
// 2. Create a `.env` file in the same folder with your Twilio credentials:
//    TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//    TWILIO_AUTH_TOKEN=your_auth_token_here
//    TWILIO_PHONE_NUMBER=+1234567890
// 3. Run the server: `node proxy-server-example.js`.
// 4. Deploy this server to a hosting provider (like Vercel, Netlify, Heroku, etc.).
//    - Make sure to set the environment variables in your hosting provider's settings.
//    - The frontend app will make requests to your deployed server's URL.

// Import necessary libraries
const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
require('dotenv').config(); // Loads environment variables from a .env file

// --- Configuration ---
const app = express();
const port = process.env.PORT || 3001; // Use port from environment or default to 3001

// Get Twilio credentials securely from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// --- Security & Middleware ---

// Enable CORS (Cross-Origin Resource Sharing)
// IMPORTANT: For production, you should restrict the origin to your app's actual domain
// Example: const corsOptions = { origin: 'https://your-app-domain.com' };
app.use(cors());

// Enable the server to parse JSON request bodies
app.use(express.json());

// --- API Endpoint ---

// This is the endpoint your frontend will call.
// It listens for POST requests at the path '/api/send-message'.
app.post('/api/send-message', (req, res) => {
    // Basic validation to ensure we have the required Twilio credentials
    if (!accountSid || !authToken || !twilioPhoneNumber) {
        console.error('Twilio credentials are not configured on the server.');
        return res.status(500).json({ error: 'Notification service is not configured.' });
    }

    // Extract the recipients' phone numbers (as an array) and message from the request body
    const { to, body } = req.body;

    // Validate the incoming request data
    if (!Array.isArray(to) || to.length === 0 || !body) {
        return res.status(400).json({ error: 'Request body must include a "to" array of recipients and a "body" string.' });
    }

    // Initialize the Twilio client
    const client = twilio(accountSid, authToken);

    // Create an array of promises, one for each message to be sent
    const messagePromises = to.map(number => {
        console.log(`Queueing message to ${number}...`);
        return client.messages.create({
            body: body,
            from: twilioPhoneNumber,
            to: number,
        });
    });

    // Use Promise.all to send all messages concurrently
    Promise.all(messagePromises)
        .then(messages => {
            // Success response
            const sentSids = messages.map(m => m.sid);
            console.log(`All messages sent successfully. SIDs: ${sentSids.join(', ')}`);
            res.status(200).json({ success: true, messageSids: sentSids });
        })
        .catch(error => {
            // Error response if any of the messages fail
            console.error('Twilio API Error:', error);
            res.status(500).json({ success: false, error: error.message });
        });
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Twilio proxy server listening on port ${port}`);
});
