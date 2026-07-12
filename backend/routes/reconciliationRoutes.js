import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { getReconciliationReport, exportReconciliationCsv } from '../controllers/reconciliationController.js';

const router = express.Router();

// Full-system reconciliation is deliberately broader than the per-organizer
// settlement report — any authenticated organizer account can run it. There
// is no admin role in this system yet; if one is introduced later, this is
// where it should be tightened to requireRole('admin') instead.
router.get('/', protect, requireRole('organizer'), getReconciliationReport);
router.get('/export', protect, requireRole('organizer'), exportReconciliationCsv);

export default router;
