import express from 'express';
import { submitVendorApplication } from '../controllers/eventController.js';

const router = express.Router();

// POST /api/vendors/apply
router.post('/apply', submitVendorApplication);

export default router;
