import express from 'express';
import { submitVendorApplication } from '../controllers/eventController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { processVendorCheckout, getSalesPerformance } from '../controllers/vendorController.js';

const router = express.Router();

// POST /api/vendors/apply
router.post('/apply', submitVendorApplication);

// POST /api/vendors/checkout (EP-80) - Requires JWT and Vendor role
router.post('/checkout', protect, requireRole('vendor'), processVendorCheckout);

// GET /api/vendors/sales-performance - Requires JWT and Vendor role
router.get('/sales-performance', protect, requireRole('vendor'), getSalesPerformance);

export default router;
