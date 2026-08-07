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

// Computes the vendor financial settlement report (US-603)
export const getVendorPayoutData = async () => {
  const splitPercentageRaw = parseFloat(process.env.PLATFORM_SPLIT_PERCENTAGE) || 5.0;
  const splitRate = splitPercentageRaw / 100;

  // Import models inside service method or top level
  const PaymentTokenModule = await import('../models/PaymentToken.js');
  const UserModule = await import('../models/User.js');
  const PaymentToken = PaymentTokenModule.default;
  const User = UserModule.default;

  // Fetch all tokens with status 'Used'
  const usedTokens = await PaymentToken.find({ status: 'Used' }).populate('vendorId', 'fullName email');

  // Group by vendor
  const vendorMap = new Map();

  // Populate vendor map with all vendor users first if required or from tokens
  const vendorUsers = await User.find({ role: 'vendor' });
  for (const v of vendorUsers) {
    vendorMap.set(String(v._id), {
      vendorId: String(v._id),
      vendorName: v.fullName || v.email || 'Unknown Vendor',
      totalScans: 0,
      grossRevenue: 0,
      platformFee: 0,
      netPayout: 0,
    });
  }

  for (const token of usedTokens) {
    if (!token.vendorId) continue;
    const vId = String(token.vendorId._id || token.vendorId);
    if (!vendorMap.has(vId)) {
      vendorMap.set(vId, {
        vendorId: vId,
        vendorName: token.vendorId.fullName || token.vendorId.email || 'Unknown Vendor',
        totalScans: 0,
        grossRevenue: 0,
        platformFee: 0,
        netPayout: 0,
      });
    }

    const entry = vendorMap.get(vId);
    const amount = token.debitedAmount ? parseFloat(token.debitedAmount.toString()) : 0;
    entry.totalScans += 1;
    entry.grossRevenue = round2(entry.grossRevenue + amount);
  }

  // Calculate platform fee & net payout per vendor with 2 decimal places rounding
  const vendors = Array.from(vendorMap.values()).map((v) => {
    const grossRevenue = round2(v.grossRevenue);
    const platformFee = round2(grossRevenue * splitRate);
    const netPayout = round2(grossRevenue - platformFee);
    return {
      ...v,
      grossRevenue,
      platformFee,
      netPayout,
    };
  });

  const totalScans = vendors.reduce((acc, v) => acc + v.totalScans, 0);
  const totalGrossRevenue = round2(vendors.reduce((acc, v) => acc + v.grossRevenue, 0));
  const totalPlatformFee = round2(vendors.reduce((acc, v) => acc + v.platformFee, 0));
  const totalNetPayout = round2(totalGrossRevenue - totalPlatformFee);

  return {
    splitPercentage: splitPercentageRaw,
    summary: {
      totalVendors: vendors.length,
      totalScans,
      totalGrossRevenue,
      totalPlatformFee,
      totalNetPayout,
    },
    vendors,
  };
};

