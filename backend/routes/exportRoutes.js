import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { exportFullLedger } from '../controllers/exportController.js';

const router = express.Router();

router.get('/full-ledger', protect, requireRole('organizer'), exportFullLedger);

export default router;
