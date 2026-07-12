import { getReconciliationData } from '../services/reconciliationService.js';
import {
  buildOrphanedEventSheet,
  buildOrphanedUserSheet,
  buildDuplicateSeatSheet,
  buildInvalidAmountSheet,
} from '../utils/reconciliationSheets.js';
import { compileCsvWorkbook, sendCsvDownload } from '../utils/csvExportEngine.js';

// GET /api/reconciliation
export const getReconciliationReport = async (req, res) => {
  try {
    const data = await getReconciliationData();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reconciliation/export
export const exportReconciliationCsv = async (req, res) => {
  try {
    const data = await getReconciliationData();
    const workbook = compileCsvWorkbook([
      buildOrphanedEventSheet(data),
      buildOrphanedUserSheet(data),
      buildDuplicateSeatSheet(data),
      buildInvalidAmountSheet(data),
    ]);
    sendCsvDownload(res, `reconciliation-report-${Date.now()}.csv`, workbook);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
