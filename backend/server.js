import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import eventRoutes from './routes/eventRoutes.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'EventPulse Official API server is healthy and running.' });
});

// API Routes
app.use('/api/events', eventRoutes);

app.listen(PORT, () => {
  console.log(`EventPulse Official backend server running on port ${PORT}`);
});
