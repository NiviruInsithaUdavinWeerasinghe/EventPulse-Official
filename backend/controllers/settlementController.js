import { getSettlementData, getVendorPayoutData } from '../services/settlementService.js';
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

// GET /api/settlements/vendor-payouts
export const getVendorPayoutReport = async (req, res) => {
  try {
    const data = await getVendorPayoutData();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/export-settlement or /api/settlements/export-vendor-payouts
export const exportVendorPayoutCsv = async (req, res) => {
  try {
    const data = await getVendorPayoutData();
    
    // Format headers and rows for CSV
    const headers = ['Vendor ID', 'Vendor Name', 'Total Scans', 'Gross Revenue (LKR)', 'Platform Fee (LKR)', 'Final Net Payout (LKR)'];
    const rows = data.vendors.map((v) => [
      `"${v.vendorId}"`,
      `"${v.vendorName.replace(/"/g, '""')}"`,
      v.totalScans,
      v.grossRevenue.toFixed(2),
      v.platformFee.toFixed(2),
      v.netPayout.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=event_vendor_payouts_final.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

