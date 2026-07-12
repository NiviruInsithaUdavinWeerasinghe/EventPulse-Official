import { buildCsvSheet } from './csvExportEngine.js';

// Sheet builders shared by the reconciliation-only export and the combined
// full-ledger export, so both stay byte-for-byte consistent.

export const buildOrphanedEventSheet = ({ checks }) =>
  buildCsvSheet(
    'Orphaned Tickets - Missing Event',
    ['Ticket ID', 'Missing Event ID', 'Ticket Tier', 'Seat', 'Amount', 'Status'],
    checks.orphanedTickets.missingEvent.map((t) => [t._id, t.event, t.tier, t.seat, Number(t.price).toFixed(2), t.status])
  );

export const buildOrphanedUserSheet = ({ checks }) =>
  buildCsvSheet(
    'Orphaned Tickets - Missing Account',
    ['Ticket ID', 'Missing User ID', 'Ticket Tier', 'Seat', 'Amount', 'Status'],
    checks.orphanedTickets.missingUser.map((t) => [t._id, t.user, t.tier, t.seat, Number(t.price).toFixed(2), t.status])
  );

export const buildDuplicateSeatSheet = ({ checks }) =>
  buildCsvSheet(
    'Duplicate Seat Bookings',
    ['Event', 'Seat', 'Tickets Sold', 'Ticket IDs'],
    checks.duplicateSeatBookings.map((d) => [d.event || d.eventId, d.seat, d.count, d.ticketIds.join(' | ')])
  );

export const buildInvalidAmountSheet = ({ checks }) =>
  buildCsvSheet(
    'Non-Positive Amount Tickets',
    ['Ticket ID', 'Event ID', 'Ticket Tier', 'Seat', 'Amount', 'Status'],
    checks.invalidAmountTickets.map((t) => [t._id, t.event, t.tier, t.seat, Number(t.price).toFixed(2), t.status])
  );
