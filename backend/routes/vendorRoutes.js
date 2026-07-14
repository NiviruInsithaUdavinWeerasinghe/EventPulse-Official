import express from 'express';
import { submitVendorApplication } from '../controllers/eventController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { processVendorCheckout, getSalesPerformance } from '../controllers/vendorController.js';
import VendorApplication from '../models/VendorApplication.js';

const router = express.Router();

// POST /api/vendors/apply
router.post('/apply', submitVendorApplication);

// GET /api/vendors/applications/vendor/:vendorId
// EP-126: Used by the Proximity Ads dashboard to find the vendor's approved stall/event
router.get('/applications/vendor/:vendorId', async (req, res) => {
  try {
    const applications = await VendorApplication.find({ vendorId: req.params.vendorId })
      .populate('eventId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/vendors/checkout (EP-80) - Requires JWT and Vendor role
router.post('/checkout', protect, requireRole('vendor'), processVendorCheckout);

// GET /api/vendors/sales-performance - Requires JWT and Vendor role
router.get('/sales-performance', protect, requireRole('vendor'), getSalesPerformance);

export default router;