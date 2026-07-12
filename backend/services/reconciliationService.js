import Ticket from '../models/Ticket.js';

// Full-system integrity sweep over every ticket ("digital ledger entry") in
// the database — not scoped to one organizer's events. There is no separate
// ledger/transaction model in this app yet, so the Ticket collection itself
// is the source of truth for money movement (each document is one sale).

// Tickets whose `event` or `user` reference no longer resolves to a real
// document (e.g. the event or account was deleted after the sale).
const findOrphanedTickets = async () => {
  const byEvent = await Ticket.aggregate([
    { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'eventDoc' } },
    { $match: { eventDoc: { $size: 0 } } },
    { $project: { eventDoc: 0 } },
  ]);

  const byUser = await Ticket.aggregate([
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userDoc' } },
    { $match: { userDoc: { $size: 0 } } },
    { $project: { userDoc: 0 } },
  ]);

  return { missingEvent: byEvent, missingUser: byUser };
};

// Two non-cancelled tickets sold for the same seat at the same event —
// a double-booking that would break physical seating/settlement math.
const findDuplicateSeatBookings = async () => {
  const groups = await Ticket.aggregate([
    { $match: { status: { $in: ['Active', 'Used'] } } },
    {
      $group: {
        _id: { event: '$event', seat: '$seat' },
        count: { $sum: 1 },
        ticketIds: { $push: '$_id' },
        tiers: { $push: '$tier' },
        prices: { $push: '$price' },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $lookup: { from: 'events', localField: '_id.event', foreignField: '_id', as: 'eventDoc' } },
    {
      $project: {
        _id: 0,
        event: { $arrayElemAt: ['$eventDoc.name', 0] },
        eventId: '$_id.event',
        seat: '$_id.seat',
        count: 1,
        ticketIds: 1,
        tiers: 1,
        prices: 1,
      },
    },
  ]);

  return groups;
};

// Tickets with a non-positive price — can't have been a legitimate sale.
const findInvalidAmountTickets = () =>
  Ticket.find({ price: { $lte: 0 } }).select('_id event user tier seat price status createdAt');

// Runs every integrity check and shapes the combined result, shared by the
// JSON report endpoint and the CSV export.
export const getReconciliationData = async () => {
  const [totalLedgerEntries, orphaned, duplicateSeats, invalidAmounts] = await Promise.all([
    Ticket.countDocuments(),
    findOrphanedTickets(),
    findDuplicateSeatBookings(),
    findInvalidAmountTickets(),
  ]);

  const issueCount =
    orphaned.missingEvent.length + orphaned.missingUser.length + duplicateSeats.length + invalidAmounts.length;

  return {
    generatedAt: new Date(),
    totalLedgerEntries,
    integrityStatus: issueCount === 0 ? 'PASS' : 'ISSUES_FOUND',
    issueCount,
    checks: {
      orphanedTickets: orphaned,
      duplicateSeatBookings: duplicateSeats,
      invalidAmountTickets: invalidAmounts,
    },
  };
};
