const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// AWS SES Config
const ses = new AWS.SES({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// Routes
app.post('/api/send-reset-email', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    
    const token = Buffer.from(email + ':' + Date.now()).toString('base64');
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5500'}/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`;

    const params = {
        Source: process.env.SES_FROM_EMAIL, // Must be verified in SES
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            Subject: {
                Data: 'Password Reset Request — Attendance Management System'
            },
            Body: {
                Html: {
                    Data: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #4f46e5;">Password Reset Request</h2>
                            <p>You requested to reset your password for the Attendance Management System.</p>
                            <p>Click the link below to reset it:</p>
                            <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Reset Password</a>
                            <p style="margin-top: 20px; font-size: 12px; color: #666;">If you didn't request this, please ignore this email.</p>
                        </div>
                    `
                }
            }
        }
    };

    try {
        await ses.sendEmail(params).promise();
        console.log(`Email sent to ${email}`);
        res.status(200).json({ message: 'Reset email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Failed to send email. Check server logs.', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Email Service running on http://localhost:${PORT}`);
    console.log('Ensure you have a .env file with AWS credentials!');
});
