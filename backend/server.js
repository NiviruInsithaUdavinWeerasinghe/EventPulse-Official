import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { initWebSocket } from './socketManager.js';

dotenv.config();

import connectDB from './config/db.js';
import eventRoutes from './routes/eventRoutes.js';
import authRoutes from './routes/auth.js';
import vendorRoutes from './routes/vendorRoutes.js';
import payhereRoutes from './routes/payhereRoutes.js';
import walletRoutes from './routes/walletRoutes.js';

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize WebSocket server
initWebSocket(server);

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
app.use('/api/vendors', vendorRoutes);

// Wallet service routes (customer-only — JWT + role guard applied inside walletRoutes)
app.use('/api/wallet', walletRoutes);

// PayHere payment routes (EP-55 - mesan)
app.use('/api/payhere', payhereRoutes);

server.listen(PORT, () => {
  console.log(`EventPulse Official backend server running on port ${PORT}`);
});