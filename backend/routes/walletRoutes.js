import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { initWallet, scanEntryQr, topUpWallet } from '../controllers/walletController.js';

const router = express.Router();

// All wallet routes require a valid JWT AND the customer role.
// Non-authenticated requests → 401. Wrong role → 403.
router.use(protect, requireRole('customer'));

// POST /api/wallet/init
// Initialize (or return) the wallet for the authenticated customer.
router.post('/init', initWallet);

// POST /api/wallet/scan-entry
// Process an entry QR scan and activate the wallet profile.
router.post('/scan-entry', scanEntryQr);

// POST /api/wallet/topup
// Top up user wallet balance after payment validation.
router.post('/topup', topUpWallet);

export default router;
