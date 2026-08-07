import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import {
  initWallet,
  scanEntryQr,
  topUpWallet,
  generatePaymentToken,
  getActiveToken,
  getWalletHistory,
} from '../controllers/walletController.js';

const router = express.Router();

// All wallet routes require a valid JWT.
router.use(protect);

// POST /api/wallet/init
// Initialize (or return) the wallet for the authenticated user.
router.post('/init', requireRole('customer', 'vendor'), initWallet);

// POST /api/wallet/scan-entry
// Process an entry QR scan and activate the wallet profile.
router.post('/scan-entry', requireRole('customer'), scanEntryQr);

// POST /api/wallet/topup
// Top up user wallet balance after payment validation.
router.post('/topup', requireRole('customer', 'vendor'), topUpWallet);

// POST /api/wallet/token/generate  (EP-59 / EP-60 / EP-61 — US-403)
// Generate a fresh single-use 60-second payment QR token. Invalidates any prior active token.
router.post('/token/generate', requireRole('customer'), generatePaymentToken);

// GET /api/wallet/token/active  (EP-60 — US-403)
// Return the current Active token if one exists and hasn't expired, otherwise null.
router.get('/token/active', requireRole('customer'), getActiveToken);

// GET /api/wallet/history (EP-19 — US-406-SUB-4)
// Get user wallet transaction history log.
router.get('/history', requireRole('customer', 'vendor'), getWalletHistory);

export default router;

