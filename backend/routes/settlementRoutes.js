import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import {
  getSettlementReport,
  exportSettlementCsv,
  getVendorPayoutReport,
  exportVendorPayoutCsv,
} from '../controllers/settlementController.js';

const router = express.Router();

// Every route below requires a valid session belonging to an 'organizer' account.
router.use(protect, requireRole('organizer'));

router.get('/', getSettlementReport);
router.get('/export', exportSettlementCsv);
router.get('/vendor-payouts', getVendorPayoutReport);
router.get('/export-vendor-payouts', exportVendorPayoutCsv);

export default router;

