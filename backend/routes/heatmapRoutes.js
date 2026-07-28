import express from 'express';
import { getHistoricalHeatmap } from '../controllers/heatmapController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get historical crowd density heatmap
router.get('/history', protect, requireRole('organizer'), getHistoricalHeatmap);

export default router;
