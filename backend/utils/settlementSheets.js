import { buildCsvSheet } from './csvExportEngine.js';

// Sheet builders shared by the settlement-only export and the combined
// full-ledger export, so both stay byte-for-byte consistent.

const asPercent = (rate) => `${(rate * 100).toFixed(2)}%`;

export const buildRevenueLedgerSheet = ({ transactions }) =>
  buildCsvSheet(
    'Revenue Ledger',
    ['Transaction ID', 'Date', 'Event', 'Ticket Tier', 'Seat', 'Gross Amount', 'Platform Fee (5%)', 'Operational Margin', 'Net Payout', 'Payout Method', 'Status'],
    transactions.map((t) => [
      t.id,
      new Date(t.date).toISOString(),
      t.event,
      t.tier,
      t.seat,
      t.grossAmount.toFixed(2),
      t.commission.toFixed(2),
      asPercent(t.operationalMarginRate),
      t.netPayout.toFixed(2),
      t.payoutMethod,
      t.status,
    ])
  );

export const buildEventSummarySheet = ({ byEvent }) =>
  buildCsvSheet(
    'Event Revenue Summary',
    ['Event', 'Tickets Sold', 'Gross Revenue', 'Platform Fee', 'Operational Margin', 'Net Payout'],
    byEvent.map((e) => [
      e.event,
      e.ticketsSold,
      e.grossRevenue.toFixed(2),
      e.commission.toFixed(2),
      asPercent(e.operationalMarginRate),
      e.netPayout.toFixed(2),
    ])
  );
