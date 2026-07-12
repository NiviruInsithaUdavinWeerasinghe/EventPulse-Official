import Ticket from '../models/Ticket.js';

// Platform commission withheld from gross ticket revenue before payout.
export const COMMISSION_RATE = 0.05;

// Net payouts settle to whatever payout method an organizer has on file.
// This report never stores or displays account/routing numbers — only the
// settlement method label — so it stays safe to expose to every organizer
// account under the current (non-tenant-scoped) access model.
export const PAYOUT_METHOD = 'Bank Transfer';
export const PAYOUT_NOTE = 'Registered payout method on file — account credentials are not stored or shown in this report.';

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

// Operational margin: the share of gross revenue retained as platform fee.
// Computed precisely from the actual totals rather than assumed to equal
// the nominal commission rate, so it stays correct even if per-event rates
// ever diverge.
const marginRate = (commission, gross) => (gross > 0 ? round4(commission / gross) : 0);

// Every non-cancelled ticket, newest first, with its event context.
const loadSettlementTickets = () =>
  Ticket.find({ status: { $ne: 'Cancelled' } })
    .populate('event', 'name date')
    .sort({ createdAt: -1 });

// Computes the full settlement picture (summary totals, per-event
// breakdown, and per-ticket transactions) shared by the JSON report
// endpoint and every CSV export that needs ledger data.
export const getSettlementData = async () => {
  const tickets = await loadSettlementTickets();

  const transactions = tickets.map((t) => {
    const gross = t.price;
    const commission = round2(gross * COMMISSION_RATE);
    return {
      id: String(t._id),
      date: t.createdAt,
      event: t.event?.name || 'Unknown Event',
      eventId: t.event?._id ? String(t.event._id) : null,
      tier: t.tier,
      seat: t.seat,
      grossAmount: round2(gross),
      commission,
      operationalMarginRate: marginRate(commission, gross),
      netPayout: round2(gross - commission),
      payoutMethod: PAYOUT_METHOD,
      status: t.status,
    };
  });

  const grossRevenue = round2(transactions.reduce((sum, t) => sum + t.grossAmount, 0));
  const commission = round2(transactions.reduce((sum, t) => sum + t.commission, 0));
  const netPayout = round2(grossRevenue - commission);

  const byEventMap = new Map();
  for (const t of transactions) {
    const key = t.eventId || t.event;
    if (!byEventMap.has(key)) {
      byEventMap.set(key, { event: t.event, eventId: t.eventId, ticketsSold: 0, grossRevenue: 0, commission: 0, netPayout: 0 });
    }
    const entry = byEventMap.get(key);
    entry.ticketsSold += 1;
    entry.grossRevenue = round2(entry.grossRevenue + t.grossAmount);
    entry.commission = round2(entry.commission + t.commission);
    entry.netPayout = round2(entry.netPayout + t.netPayout);
  }

  const byEvent = Array.from(byEventMap.values()).map((entry) => ({
    ...entry,
    operationalMarginRate: marginRate(entry.commission, entry.grossRevenue),
  }));

  return {
    summary: {
      grossRevenue,
      commission,
      operationalMarginRate: marginRate(commission, grossRevenue),
      netPayout,
      ticketsSold: transactions.length,
      commissionRate: COMMISSION_RATE,
      payoutMethod: PAYOUT_METHOD,
      payoutNote: PAYOUT_NOTE,
    },
    byEvent,
    transactions,
  };
};
