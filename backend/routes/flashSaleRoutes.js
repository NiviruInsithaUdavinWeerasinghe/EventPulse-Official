import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { purchaseFlashSale, getActiveFlashSales } from '../controllers/flashSaleController.js';

const router = express.Router();

// POST /api/flash-sales/purchase — vendor-only, moves real wallet money.
router.post('/purchase', protect, requireRole('vendor'), purchaseFlashSale);

// GET /api/flash-sales/active — any authenticated attendee reads the current broadcast banners.
router.get('/active', protect, getActiveFlashSales);

export default router;
