import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import connectDB from './config/db.js';
import eventRoutes from './routes/eventRoutes.js';
import authRoutes from './routes/auth.js';

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Auth routes (EP-31 - Evan)
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'EventPulse Official API server is healthy and running.' });
});

// API Routes (EP-22 - Niviru)
app.use('/api/events', eventRoutes);

app.listen(PORT, () => {
  console.log(`EventPulse Official backend server running on port ${PORT}`);
});
