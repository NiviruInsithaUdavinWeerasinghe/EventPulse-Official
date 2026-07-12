import { getSettlementData } from '../services/settlementService.js';
import { buildRevenueLedgerSheet, buildEventSummarySheet } from '../utils/settlementSheets.js';
import { compileCsvWorkbook, sendCsvDownload } from '../utils/csvExportEngine.js';

// GET /api/settlements
export const getSettlementReport = async (req, res) => {
  try {
    const data = await getSettlementData();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/settlements/export
export const exportSettlementCsv = async (req, res) => {
  try {
    const data = await getSettlementData();
    const workbook = compileCsvWorkbook([buildRevenueLedgerSheet(data), buildEventSummarySheet(data)]);
    sendCsvDownload(res, `settlement-report-${Date.now()}.csv`, workbook);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
