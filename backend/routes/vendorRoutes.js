import express from 'express';
import { submitVendorApplication } from '../controllers/eventController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { processVendorCheckout } from '../controllers/vendorController.js';

const router = express.Router();

// POST /api/vendors/apply
router.post('/apply', submitVendorApplication);

// POST /api/vendors/checkout (EP-80) - Requires JWT and Vendor role
router.post('/checkout', protect, requireRole('vendor'), processVendorCheckout);

export default router;
