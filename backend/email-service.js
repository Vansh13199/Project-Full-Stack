const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const resend = new Resend(process.env.RESEND_API_KEY);

const ddbClient = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const crypto = require('crypto');
const XLSX = require('xlsx');

// Session expiry duration in minutes
const SESSION_EXPIRY_MINUTES = 10;
// Max distance in meters for location validation
const MAX_DISTANCE_METERS = 100;

// Haversine formula to calculate distance between two GPS coordinates
function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const USERS_TABLE = 'Attendance-db';
const SESSIONS_TABLE = 'Attendance-Sessions';
const LOGS_TABLE = 'Attendance-Logs';
const SUBJECTS_TABLE = 'Subjects';
const ENROLLMENTS_TABLE = 'Attendance-Enrollments';

const TIMETABLE_DATA = [
    { day: "Monday", time: "09:30 - 10:20 AM", subjectCode: "24CSP-210", subjectTitle: "Full Stack Development-I", subjectType: "P", group: "GP-A" },
    { day: "Monday", time: "10:20 - 11:10 AM", subjectCode: "24CSP-210", subjectTitle: "Full Stack Development-I", subjectType: "P", group: "GP-A" },
    { day: "Monday", time: "11:20 - 12:10 PM", subjectCode: "24CSP-209", subjectTitle: "Competitive Coding-I", subjectType: "P", group: "GP-A" },
    { day: "Monday", time: "12:10 - 1:00 PM", subjectCode: "24CSP-209", subjectTitle: "Competitive Coding-I", subjectType: "P", group: "GP-A" },
    { day: "Monday", time: "1:55 - 2:45 PM", subjectCode: "24CST-208", subjectTitle: "Software Engineering", subjectType: "L", group: "GP-All" },
    { day: "Monday", time: "2:45 - 3:35 PM", subjectCode: "24TDP-291", subjectTitle: "SOFT SKILLS - II", subjectType: "P", group: "GP-A" },
    { day: "Monday", time: "3:35 - 4:25 PM", subjectCode: "24TDP-291", subjectTitle: "SOFT SKILLS - II", subjectType: "P", group: "GP-A" },

    { day: "Tuesday", time: "09:30 - 10:20 AM", subjectCode: "24CSH-206", subjectTitle: "Design and Analysis of Algorithms", subjectType: "P", group: "GP-A" },
    { day: "Tuesday", time: "10:20 - 11:10 AM", subjectCode: "24CSH-206", subjectTitle: "Design and Analysis of Algorithms", subjectType: "P", group: "GP-A" },
    { day: "Tuesday", time: "11:20 - 12:10 PM", subjectCode: "24CST-205", subjectTitle: "Operating Systems", subjectType: "L", group: "GP-All" },
    { day: "Tuesday", time: "12:10 - 1:00 PM", subjectCode: "24CSH-206", subjectTitle: "Design and Analysis of Algorithms", subjectType: "L", group: "GP-All" },
    { day: "Tuesday", time: "2:45 - 3:35 PM", subjectCode: "24TDP-291", subjectTitle: "SOFT SKILLS - II", subjectType: "P", group: "GP-A" },
    { day: "Tuesday", time: "3:35 - 4:25 PM", subjectCode: "24TDP-291", subjectTitle: "SOFT SKILLS - II", subjectType: "P", group: "GP-A" },

    { day: "Wednesday", time: "09:30 - 10:20 AM", subjectCode: "24CSH-206", subjectTitle: "Design and Analysis of Algorithms", subjectType: "L", group: "GP-All" },
    { day: "Wednesday", time: "10:20 - 11:10 AM", subjectCode: "24CST-205", subjectTitle: "Operating Systems", subjectType: "L", group: "GP-All" },
    { day: "Wednesday", time: "11:20 - 12:10 PM", subjectCode: "24CSH-207", subjectTitle: "Object Oriented Programming using Java", subjectType: "L", group: "GP-All" },
    { day: "Wednesday", time: "1:05 - 1:55 PM", subjectCode: "24CST-208", subjectTitle: "Software Engineering", subjectType: "L", group: "GP-All" },
    { day: "Wednesday", time: "1:55 - 2:45 PM", subjectCode: "24TDT-292", subjectTitle: "APTITUDE - II", subjectType: "T", group: "GP-A" },
    { day: "Wednesday", time: "2:45 - 3:35 PM", subjectCode: "24TDT-292", subjectTitle: "APTITUDE - II", subjectType: "T", group: "GP-A" },
    { day: "Wednesday", time: "3:35 - 4:25 PM", subjectCode: "24CSR-208", subjectTitle: "Semester Mini Project", subjectType: "P", group: "GP-A" },

    { day: "Thursday", time: "09:30 - 10:20 AM", subjectCode: "24CSH-207", subjectTitle: "Object Oriented Programming using Java", subjectType: "P", group: "GP-A" },
    { day: "Thursday", time: "10:20 - 11:10 AM", subjectCode: "24CSH-207", subjectTitle: "Object Oriented Programming using Java", subjectType: "P", group: "GP-A" },
    { day: "Thursday", time: "11:20 - 12:10 PM", subjectCode: "24CST-205", subjectTitle: "Operating Systems", subjectType: "L", group: "GP-All" },
    { day: "Thursday", time: "12:10 - 1:00 PM", subjectCode: "24CSH-206", subjectTitle: "Design and Analysis of Algorithms", subjectType: "L", group: "GP-All" },
    { day: "Thursday", time: "1:55 - 2:45 PM", subjectCode: "24CST-208", subjectTitle: "Software Engineering", subjectType: "L", group: "GP-All" },
    { day: "Thursday", time: "2:45 - 3:35 PM", subjectCode: "24TDT-292", subjectTitle: "APTITUDE - II", subjectType: "T", group: "GP-A" },
    { day: "Thursday", time: "3:35 - 4:25 PM", subjectCode: "24TDT-292", subjectTitle: "APTITUDE - II", subjectType: "T", group: "GP-A" },

    { day: "Friday", time: "09:30 - 10:20 AM", subjectCode: "24CSP-210", subjectTitle: "Full Stack Development-I", subjectType: "P", group: "GP-A" },
    { day: "Friday", time: "10:20 - 11:10 AM", subjectCode: "24CSP-210", subjectTitle: "Full Stack Development-I", subjectType: "P", group: "GP-A" },
    { day: "Friday", time: "11:20 - 12:10 PM", subjectCode: "24CSH-207", subjectTitle: "Object Oriented Programming using Java", subjectType: "L", group: "GP-All" },
    { day: "Friday", time: "1:05 - 1:55 PM", subjectCode: "24CST-211", subjectTitle: "Introduction to Machine Learning (Through SWAYAM)", subjectType: "L", group: "GP-All" }
];

function getMinutesFromMidnight(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.match(/^(\d+):(\d+)\s+(AM|PM)$/);
    if (!match) return 0;
    let [_, hours, minutes, period] = match;
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

function getActiveTimetableClass() {
    const now = new Date();
    // Offset +5:30 for India explicitly if server is not in IST, but let's assume server is in IST
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = days[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let slot of TIMETABLE_DATA) {
        if (slot.day !== currentDay) continue;
        const [startStr, endStr] = slot.time.split(" - ");
        // Because "10:20 - 11:10 AM", the first string might lack AM/PM if it's derived.
        // In the image timetable strings are like "09:30 - 10:20 AM", so startStr="09:30", endStr="10:20 AM".
        // Let's standardise the parsing by injecting the period if lacking.
        let endPeriod = endStr.slice(-2); // "AM" or "PM"
        let startFixed = startStr.includes('AM') || startStr.includes('PM') ? startStr : `${startStr} ${endPeriod}`;
        // special case for 11:20 - 12:10 PM, 11:20 should be AM!
        if (startStr.startsWith('11:') && endPeriod === 'PM') startFixed = `${startStr} AM`;
        
        const startMins = getMinutesFromMidnight(startFixed);
        const endMins = getMinutesFromMidnight(endStr.trim());
        
        if (currentMinutes >= startMins && currentMinutes < endMins) {
            return slot;
        }
    }
    return null;
}

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        if (!name || !email || !phone || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Domain validation
        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (role === 'Student' && emailDomain !== 'cuchd.in') {
            return res.status(400).json({ message: 'Students must register with a @cuchd.in email address.' });
        }
        if (role === 'Teacher' && emailDomain !== 'cumail.in') {
            return res.status(400).json({ message: 'Teachers must register with a @cumail.in email address.' });
        }

        const getParams = {
            TableName: USERS_TABLE,
            Key: { email }
        };
        const existingUser = await docClient.send(new GetCommand(getParams));

        if (existingUser.Item) {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            email,
            name,
            phone,
            role,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        const putParams = {
            TableName: USERS_TABLE,
            Item: newUser
        };

        await docClient.send(new PutCommand(putParams));

        delete newUser.password;

        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error during registration', error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const getParams = {
            TableName: USERS_TABLE,
            Key: { email }
        };
        const { Item: user } = await docClient.send(new GetCommand(getParams));

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Domain validation on login
        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (user.role === 'Student' && emailDomain !== 'cuchd.in') {
            return res.status(403).json({ message: 'Students must login with a @cuchd.in email.' });
        }
        if (user.role === 'Teacher' && emailDomain !== 'cumail.in') {
            return res.status(403).json({ message: 'Teachers must login with a @cumail.in email.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        delete user.password;

        res.status(200).json({ message: 'Login successful', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error during login', error: error.message });
    }
});

app.post('/api/auth/reset-password-confirm', async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ message: 'Email and new password are required' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updateParams = {
            TableName: USERS_TABLE,
            Key: { email },
            UpdateExpression: 'set password = :p',
            ExpressionAttributeValues: {
                ':p': hashedPassword
            }
        };

        await docClient.send(new UpdateCommand(updateParams));

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update password', error: error.message });
    }
});

app.post('/api/send-reset-email', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const { Item: user } = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email.' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error while checking email.' });
    }

    const token = Buffer.from(email + ':' + Date.now()).toString('base64');
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5500'}/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`;

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
            to: [email],
            subject: 'Password Reset Request — Attendance Management System',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4f46e5;">Password Reset Request</h2>
                    <p>You requested to reset your password for the Attendance Management System.</p>
                    <p>Click the link below to reset it:</p>
                    <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Reset Password</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">If you didn't request this, please ignore this email.</p>
                </div>
            `
        });

        if (error) {
            console.error('Resend error:', error);
            return res.status(500).json({ message: 'Failed to send email. Check server logs.', error });
        }

        console.log(`Email sent to ${email}`, data);
        res.status(200).json({ message: 'Reset email sent successfully' });
    } catch (error) {
        console.error('Unexpected error sending email:', error);
        res.status(500).json({ message: 'Failed to send email. Check server logs.', error: error.message });
    }
});

app.get('/api/timetable', (req, res) => {
    res.status(200).json({ timetable: TIMETABLE_DATA });
});

// ========================
// SUBJECTS & ENROLLMENTS ENDPOINTS
// ========================

app.post('/api/subjects/create', async (req, res) => {
    try {
        const { subjectName, teacherEmail } = req.body;
        if (!subjectName || !teacherEmail) {
            return res.status(400).json({ message: 'Subject name and teacher email are required' });
        }

        const { Item: user } = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email: teacherEmail } }));
        if (!user || user.role !== 'Teacher') {
            return res.status(403).json({ message: 'Unauthorized.' });
        }

        const subjectId = crypto.randomUUID();
        const newSubject = { subjectId, subjectName, teacherEmail, createdAt: new Date().toISOString() };
        await docClient.send(new PutCommand({ TableName: SUBJECTS_TABLE, Item: newSubject }));

        res.status(201).json({ message: 'Subject created successfully', subject: newSubject });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating subject', error: error.message });
    }
});

app.get('/api/subjects/list', async (req, res) => {
    try {
        const { teacherEmail } = req.query;
        let data;
        try {
            const params = {
                TableName: SUBJECTS_TABLE,
                IndexName: 'TeacherEmailIndex',
                KeyConditionExpression: 'teacherEmail = :te',
                ExpressionAttributeValues: { ':te': teacherEmail }
            };
            data = await docClient.send(new QueryCommand(params));
        } catch (indexError) {
            console.log("TeacherEmailIndex missing, falling back to ScanCommand.");
            const scanParams = {
                TableName: SUBJECTS_TABLE,
                FilterExpression: 'teacherEmail = :te',
                ExpressionAttributeValues: { ':te': teacherEmail }
            };
            data = await docClient.send(new ScanCommand(scanParams));
        }
        res.status(200).json({ subjects: data.Items || [] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching subjects', error: error.message });
    }
});

app.post('/api/subjects/enroll', async (req, res) => {
    try {
        const { teacherEmail, subjectId, studentEmail } = req.body;
        if (!teacherEmail || !subjectId || !studentEmail) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Verify teacher owns the subject
        const { Item: subject } = await docClient.send(new GetCommand({ TableName: SUBJECTS_TABLE, Key: { subjectId } }));
        if (!subject || subject.teacherEmail !== teacherEmail) {
            return res.status(403).json({ message: 'Unauthorized or subject not found' });
        }

        // Verify student exists
        const { Item: student } = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email: studentEmail } }));
        if (!student || student.role !== 'Student') {
            return res.status(404).json({ message: 'Student not found in system' });
        }

        await docClient.send(new PutCommand({
            TableName: ENROLLMENTS_TABLE,
            Item: {
                subjectId,
                studentEmail,
                subjectName: subject.subjectName,
                enrolledAt: new Date().toISOString()
            }
        }));

        res.status(201).json({ message: 'Student enrolled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error enrolling student', error: error.message });
    }
});

app.get('/api/subjects/enrollments', async (req, res) => {
    try {
        const { subjectId } = req.query;
        if (!subjectId) return res.status(400).json({ message: 'Subject ID required' });

        const params = {
            TableName: ENROLLMENTS_TABLE,
            KeyConditionExpression: 'subjectId = :subjectId',
            ExpressionAttributeValues: { ':subjectId': subjectId }
        };
        const data = await docClient.send(new QueryCommand(params));
        res.status(200).json({ enrollments: data.Items || [] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching enrollments', error: error.message });
    }
});

app.post('/api/subjects/enroll-all', async (req, res) => {
    try {
        const { teacherEmail, studentEmail } = req.body;
        if (!teacherEmail || !studentEmail) {
            return res.status(400).json({ message: 'Teacher email and student email are required' });
        }

        // Verify student exists
        const { Item: student } = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email: studentEmail } }));
        if (!student || student.role !== 'Student') {
            return res.status(404).json({ message: 'Student not found in system' });
        }

        // Get all subjects for this teacher
        let subjectData;
        try {
            const params = {
                TableName: SUBJECTS_TABLE,
                IndexName: 'TeacherEmailIndex',
                KeyConditionExpression: 'teacherEmail = :te',
                ExpressionAttributeValues: { ':te': teacherEmail }
            };
            subjectData = await docClient.send(new QueryCommand(params));
        } catch (indexError) {
            const scanParams = {
                TableName: SUBJECTS_TABLE,
                FilterExpression: 'teacherEmail = :te',
                ExpressionAttributeValues: { ':te': teacherEmail }
            };
            subjectData = await docClient.send(new ScanCommand(scanParams));
        }

        const subjects = subjectData.Items || [];
        if (subjects.length === 0) {
            return res.status(404).json({ message: 'No subjects found for this teacher' });
        }

        // Enroll in each subject
        const enrollResults = [];
        for (const subject of subjects) {
            await docClient.send(new PutCommand({
                TableName: ENROLLMENTS_TABLE,
                Item: {
                    subjectId: subject.subjectId,
                    studentEmail,
                    subjectName: subject.subjectName,
                    enrolledAt: new Date().toISOString()
                }
            }));
            enrollResults.push(subject.subjectName);
        }

        res.status(200).json({ 
            message: `Student enrolled in all ${enrollResults.length} subjects successfully.`,
            enrolledSubjects: enrollResults 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error in bulk enrollment', error: error.message });
    }
});

app.post('/api/subjects/unenroll', async (req, res) => {
    try {
        const { subjectId, studentEmail, teacherEmail } = req.body;
        if (!subjectId || !studentEmail || !teacherEmail) {
            return res.status(400).json({ message: 'Subject ID, student email, and teacher email are required' });
        }

        // Verify teacher owns the subject
        const { Item: subject } = await docClient.send(new GetCommand({ TableName: SUBJECTS_TABLE, Key: { subjectId } }));
        if (!subject || subject.teacherEmail !== teacherEmail) {
            return res.status(403).json({ message: 'Unauthorized. You do not manage this subject.' });
        }

        await docClient.send(new DeleteCommand({
            TableName: ENROLLMENTS_TABLE,
            Key: {
                subjectId,
                studentEmail
            }
        }));

        res.status(200).json({ message: 'Student removed from subject successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing student from subject', error: error.message });
    }
});

// ========================
// ATTENDANCE SESSIONS & LOGS
// ========================

app.post('/api/attendance/generate-session', async (req, res) => {
    try {
        const { teacherEmail, subjectId, latitude, longitude } = req.body;

        if (!teacherEmail || !subjectId) {
            return res.status(400).json({ message: 'Teacher email and subject are required' });
        }

        const { Item: user } = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email: teacherEmail } }));
        if (!user || user.role !== 'Teacher') {
            return res.status(403).json({ message: 'Unauthorized. Only teachers can generate sessions.' });
        }

        const { Item: subject } = await docClient.send(new GetCommand({ TableName: SUBJECTS_TABLE, Key: { subjectId } }));
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found.' });
        }

        // --- TIMETABLE STRICT VALIDATION ---
        const activeClass = getActiveTimetableClass();
        if (!activeClass) {
            return res.status(403).json({ message: 'Action Denied: There are no classes scheduled right now according to the timetable.' });
        }

        const nameMatch = subject.subjectName === activeClass.subjectCode || subject.subjectName === activeClass.subjectTitle;
        if (!nameMatch) {
            return res.status(403).json({ message: `Timetable Exception: It is currently time for ${activeClass.subjectCode} (${activeClass.subjectTitle}). You cannot take attendance for ${subject.subjectName} right now.` });
        }
        // --- END TIMETABLE VALIDATION ---

        const now = new Date();
        const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_MINUTES * 60 * 1000);

        const sessionId = crypto.randomUUID();
        const newSession = {
            sessionId,
            teacherEmail,
            subjectId,
            subjectName: subject.subjectName,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            latitude: latitude || null,
            longitude: longitude || null,
            status: 'active'
        };

        await docClient.send(new PutCommand({ TableName: SESSIONS_TABLE, Item: newSession }));

        res.status(201).json({
            message: 'Session generated successfully',
            sessionId,
            subjectName: subject.subjectName,
            expiresAt: expiresAt.toISOString(),
            durationMinutes: SESSION_EXPIRY_MINUTES
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error while generating session', error: error.message });
    }
});

app.post('/api/attendance/mark', async (req, res) => {
    try {
        const { sessionId, studentEmail, latitude, longitude, deviceFingerprint } = req.body;

        if (!sessionId || !studentEmail) {
            return res.status(400).json({ message: 'Session ID and Student email are required' });
        }

        const { Item: session } = await docClient.send(new GetCommand({ TableName: SESSIONS_TABLE, Key: { sessionId } }));

        if (!session || session.status !== 'active') {
            return res.status(404).json({ message: 'Invalid or inactive session.' });
        }

        // Check expiry
        if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
            // Auto-expire
            await docClient.send(new UpdateCommand({
                TableName: SESSIONS_TABLE,
                Key: { sessionId },
                UpdateExpression: 'set #s = :s',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: { ':s': 'expired' }
            }));
            return res.status(410).json({ message: 'This session has expired. Please ask the teacher for a new QR code.' });
        }

        // Location validation
        if (session.latitude && session.longitude) {
            if (!latitude || !longitude) {
                return res.status(403).json({ message: 'Location verification is required for this session. Please enable GPS and try again.' });
            }
            const distance = getDistanceMeters(session.latitude, session.longitude, latitude, longitude);
            if (distance > MAX_DISTANCE_METERS) {
                return res.status(403).json({ message: `You are too far from the classroom (${Math.round(distance)}m away). Must be within ${MAX_DISTANCE_METERS}m.` });
            }
        }

        // Device fingerprint check — same device, same session, different student = blocked
        if (deviceFingerprint) {
            const allSessionLogs = await docClient.send(new ScanCommand({ TableName: LOGS_TABLE }));
            const sameDeviceSameSession = (allSessionLogs.Items || []).find(
                log => log.sessionId === sessionId && log.deviceFingerprint === deviceFingerprint && log.studentEmail !== studentEmail
            );
            if (sameDeviceSameSession) {
                return res.status(403).json({ message: 'This device has already been used to mark attendance for another student in this session.' });
            }
        }

        // Check if already marked
        const { Item: existingLog } = await docClient.send(new GetCommand({ TableName: LOGS_TABLE, Key: { sessionId, studentEmail } }));
        if (existingLog) {
            return res.status(409).json({ message: 'Attendance already marked for this session.' });
        }

        const logEntry = {
            sessionId,
            studentEmail,
            subjectId: session.subjectId || 'unknown',
            subjectName: session.subjectName || 'Unknown',
            teacherEmail: session.teacherEmail,
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
            latitude: latitude || null,
            longitude: longitude || null,
            deviceFingerprint: deviceFingerprint || null
        };

        await docClient.send(new PutCommand({ TableName: LOGS_TABLE, Item: logEntry }));

        res.status(201).json({ message: 'Attendance marked successfully', subjectName: session.subjectName });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error while marking attendance', error: error.message });
    }
});

// Get attendance history for a student
app.get('/api/attendance/history', async (req, res) => {
    try {
        const { studentEmail } = req.query;
        if (!studentEmail) {
            return res.status(400).json({ message: 'Student email is required' });
        }

        // Scan all logs and filter by student email
        const result = await docClient.send(new ScanCommand({ TableName: LOGS_TABLE }));
        const myLogs = (result.Items || []).filter(log => log.studentEmail === studentEmail);

        // Sort by date descending
        myLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.status(200).json({ records: myLogs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching attendance history', error: error.message });
    }
});

// Get student-wise attendance for a teacher's subjects
app.get('/api/attendance/teacher-view', async (req, res) => {
    try {
        const { teacherEmail } = req.query;
        if (!teacherEmail) {
            return res.status(400).json({ message: 'Teacher email is required' });
        }

        // Get all logs
        const logsResult = await docClient.send(new ScanCommand({ TableName: LOGS_TABLE }));
        const allLogs = logsResult.Items || [];

        // Filter logs that belong to this teacher
        const teacherLogs = allLogs.filter(log => log.teacherEmail === teacherEmail);

        // Sort by date descending
        teacherLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.status(200).json({ records: teacherLogs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching teacher attendance view', error: error.message });
    }
});

// Get total session count per subject (for attendance % calculation)
app.get('/api/attendance/session-count', async (req, res) => {
    try {
        const result = await docClient.send(new ScanCommand({ TableName: SESSIONS_TABLE }));
        const sessions = result.Items || [];
        
        // Group by subjectId
        const formattedCounts = {};
        sessions.forEach(s => {
            if (s.subjectId) {
                formattedCounts[s.subjectId] = (formattedCounts[s.subjectId] || 0) + 1;
            }
        });
        
        res.status(200).json({ sessionCounts: formattedCounts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Inner error fetching context', error: error.message });
    }
});

// Calculate explicit absent sessions for a student
app.get('/api/attendance/absents', async (req, res) => {
    try {
        const { studentEmail } = req.query;
        if (!studentEmail) return res.status(400).json({ message: 'studentEmail required' });

        // 1. Get student's enrollments (We must use Scan since studentEmail is Range Key without an index, or we get all and filter)
        const enrollmentsData = await docClient.send(new ScanCommand({
            TableName: ENROLLMENTS_TABLE,
            FilterExpression: 'studentEmail = :e',
            ExpressionAttributeValues: { ':e': studentEmail }
        }));
        const enrolledSubjects = enrollmentsData.Items || [];
        
        if (enrolledSubjects.length === 0) {
            return res.status(200).json({ absents: [] }); // No enrollments = no absents
        }

        const subjectIds = enrolledSubjects.map(e => e.subjectId);

        // 2. Get all expired sessions for these subjects
        const sessionsData = await docClient.send(new ScanCommand({ TableName: SESSIONS_TABLE }));
        const expectedSessions = (sessionsData.Items || []).filter(s => 
            subjectIds.includes(s.subjectId) && s.status === 'expired'
        );

        // 3. Get all logs for this student
        const logsData = await docClient.send(new QueryCommand({
            TableName: LOGS_TABLE,
            IndexName: 'StudentEmailIndex', // Assume this GSI exists, or we scan
            KeyConditionExpression: 'studentEmail = :e',
            ExpressionAttributeValues: { ':e': studentEmail }
        })).catch(async () => {
            // Fallback if GSI doesn't exist
            return await docClient.send(new ScanCommand({
                TableName: LOGS_TABLE,
                FilterExpression: 'studentEmail = :e',
                ExpressionAttributeValues: { ':e': studentEmail }
            }));
        });
        const attendedSessionIds = new Set((logsData.Items || []).map(l => l.sessionId));

        // 4. Any expected session not in attendedSessionIds is an absent
        const absentSessions = expectedSessions.filter(s => !attendedSessionIds.has(s.sessionId));

        // Let's sort them from newest to oldest
        absentSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({ absents: absentSessions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error calculating absents', error: error.message });
    }
});

// Export attendance as Excel
app.get('/api/attendance/export', async (req, res) => {
    try {
        const { teacherEmail, subjectId } = req.query;
        if (!teacherEmail) {
            return res.status(400).json({ message: 'Teacher email is required' });
        }

        const logsResult = await docClient.send(new ScanCommand({ TableName: LOGS_TABLE }));
        let logs = (logsResult.Items || []).filter(log => log.teacherEmail === teacherEmail);
        
        if (subjectId && subjectId !== 'all') {
            logs = logs.filter(log => log.subjectId === subjectId);
        }

        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const rows = logs.map(log => ({
            'Student Email': log.studentEmail,
            'Subject': log.subjectName || 'Unknown',
            'Date': log.date || '',
            'Time': log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
            'Session ID': log.sessionId
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        
        // Auto-width columns
        const colWidths = Object.keys(rows[0] || {}).map(key => ({ wch: Math.max(key.length, 20) }));
        worksheet['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error exporting attendance', error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
