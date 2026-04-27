import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Initialize dotenv to use environment variables
dotenv.config();

const app = express();

// 1. Initialize Firebase Admin
// Using JSON.parse as the service account is likely stored as a string in your .env
const serviceAccount = JSON.parse(process.env);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.use(cors());
app.use(express.json());

// 3. Route to handle messages
app.post('/send-message', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // A. Save to Firestore
        const docRef = await db.collection('inbox').add({
            name,
            email,
            subject,
            message,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'unread'
        });

        // B. Send Email Notification
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Sending to yourself
            subject: `New Portfolio Message: ${subject || 'No Subject'}`,
            html: `
                <h3>New Contact Form Submission</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
                <hr>
                <p>View in Firestore ID: ${docRef.id}</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, id: docRef.id });

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));