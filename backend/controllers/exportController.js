import { getSettlementData } from '../services/settlementService.js';
import { getReconciliationData } from '../services/reconciliationService.js';
import { buildRevenueLedgerSheet, buildEventSummarySheet } from '../utils/settlementSheets.js';
import {
  buildOrphanedEventSheet,
  buildOrphanedUserSheet,
  buildDuplicateSeatSheet,
  buildInvalidAmountSheet,
} from '../utils/reconciliationSheets.js';
import { compileCsvWorkbook, sendCsvDownload } from '../utils/csvExportEngine.js';

// GET /api/exports/full-ledger
// Compiles every ledger sheet — revenue, event summary, and every
// reconciliation integrity check — into one comprehensive downloadable CSV.
export const exportFullLedger = async (req, res) => {
  try {
    const [settlement, reconciliation] = await Promise.all([getSettlementData(), getReconciliationData()]);

    const workbook = compileCsvWorkbook([
      buildRevenueLedgerSheet(settlement),
      buildEventSummarySheet(settlement),
      buildOrphanedEventSheet(reconciliation),
      buildOrphanedUserSheet(reconciliation),
      buildDuplicateSeatSheet(reconciliation),
      buildInvalidAmountSheet(reconciliation),
    ]);

    sendCsvDownload(res, `full-ledger-export-${Date.now()}.csv`, workbook);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
