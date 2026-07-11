import crypto from 'crypto';
import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import WalletLedger from '../models/WalletLedger.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';

// ── helpers ────────────────────────────────────────────────────────────────────

/**
 * Generate a deterministic, encrypted wallet account identifier from the userId.
 * Uses HMAC-SHA256 so the same userId always produces the same identifier,
 * but the raw userId cannot be reverse-engineered from it.
 */
function deriveWalletAccountId(userId) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'eventpulse_secret')
    .update(userId.toString())
    .digest('hex');
}

// ── POST /api/wallet/init ──────────────────────────────────────────────────────
/**
 * Initialize (or return the existing) Wallet for the authenticated customer.
 *
 * Role check: the protect + requireRole('customer') middleware already blocks
 * non-customers at the route level. We do a second check here as a defence-in-depth
 * measure in case the route middleware is misconfigured.
 */
export const initWallet = async (req, res) => {
  try {
    // Double-check role at the controller level
    const user = await User.findById(req.user.id).select('role fullName email');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Wallet accounts can only be created for Event Attendees (customer role).',
      });
    }

    // Find existing wallet or create a new one defaulting to LKR 0.00
    let wallet = await Wallet.findOne({ user: req.user.id });
    const isNew = !wallet;

    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user.id,
        // balance defaults to Decimal128("0.00") per the schema
      });
    }

    return res.status(isNew ? 201 : 200).json({
      success: true,
      isNew,
      wallet: {
        walletId: wallet._id,
        accountId: deriveWalletAccountId(req.user.id), // encrypted identifier
        userId: wallet.user,
        balance: wallet.balance.toString(),
        currency: wallet.currency,
        status: wallet.status,
        createdAt: wallet.createdAt,
      },
    });
  } catch (err) {
    console.error('initWallet error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/wallet/scan-entry ────────────────────────────────────────────────
/**
 * Handle an entry QR code scan for the authenticated customer.
 *
 * The QR payload (produced at ticket purchase) is:
 *   { userId, eventId, tier, seat, timestamp }
 *
 * Steps:
 *  1. Parse + validate the QR payload.
 *  2. Confirm the ticket belongs to this customer and is Active.
 *  3. Ensure the customer has an Active Wallet (creates one if missing).
 *  4. Write an EntryActivation ledger entry (balance unchanged — this is a scan event).
 *  5. Return the wallet profile for the frontend confirmation screen.
 */
export const scanEntryQr = async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ success: false, message: 'QR data is required.' });
    }

    // 1. Parse QR payload
    let qrPayload;
    try {
      qrPayload = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR payload format.' });
    }

    const { userId, eventId, tier, seat } = qrPayload;

    if (!userId || !eventId || !tier || !seat) {
      return res.status(400).json({ success: false, message: 'QR payload is incomplete.' });
    }

    // 2. The QR must belong to the authenticated customer (prevent scanning someone else's ticket)
    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'This QR code does not belong to your account.',
      });
    }

    // Confirm the matching Active ticket exists
    const ticket = await Ticket.findOne({
      user: req.user.id,
      event: eventId,
      tier,
      seat,
      status: 'Active',
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'No active ticket found matching this QR code.',
      });
    }

    // 3. Ensure the customer has a Wallet
    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user.id });
    }

    // Ensure wallet is Active
    if (wallet.status !== 'Active') {
      wallet.status = 'Active';
      await wallet.save();
    }

    // 4. Write an EntryActivation ledger entry (amount = 0.00 is a special event marker)
    //    We use 0.01 as minimum allowed amount and mark it as EntryActivation so it appears
    //    in the audit log as a wallet activation event.
    const activationAmount = mongoose.Types.Decimal128.fromString('0.01');
    const currentBalance = wallet.balance;

    await WalletLedger.create({
      wallet: wallet._id,
      transactionType: 'Credit',
      amount: activationAmount,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance, // balance is not changed — this is an event marker
      description: `Entry scan activated — ${tier} seat ${seat}`,
      referenceType: 'EntryActivation',
      referenceId: ticket._id.toString(),
    });

    // 5. Return wallet profile for the confirmation screen
    return res.status(200).json({
      success: true,
      message: 'Wallet activated successfully via entry QR scan.',
      wallet: {
        walletId: wallet._id,
        accountId: deriveWalletAccountId(req.user.id),
        userId: wallet.user,
        balance: wallet.balance.toString(),
        currency: wallet.currency,
        status: wallet.status,
        createdAt: wallet.createdAt,
      },
      ticket: {
        ticketId: ticket._id,
        eventId,
        tier,
        seat,
      },
    });
  } catch (err) {
    console.error('scanEntryQr error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/wallet/topup ──────────────────────────────────────────────────
/**
 * Top up the user's wallet balance after payment validation.
 *
 * Steps:
 *  1. Validate top-up amount and paymentToken.
 *  2. Find the user's Wallet.
 *  3. Increment the balance (using Decimal128).
 *  4. Write a TopUp transaction ledger entry.
 *  5. Return updated wallet info.
 */
export const topUpWallet = async (req, res) => {
  try {
    const { amount, paymentToken } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: 'Top-up amount is required.' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid top-up amount. Must be a positive number.' });
    }

    if (!paymentToken) {
      return res.status(400).json({ success: false, message: 'Payment gateway validation token is required.' });
    }

    // Find the wallet
    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await Wallet.create({ user: req.user.id });
    }

    if (wallet.status !== 'Active') {
      return res.status(400).json({ success: false, message: `Wallet is currently ${wallet.status}. Top-up is not allowed.` });
    }

    const currentBalance = parseFloat(wallet.balance.toString());
    const newBalance = currentBalance + numAmount;

    // Update wallet balance
    wallet.balance = mongoose.Types.Decimal128.fromString(newBalance.toFixed(2));
    await wallet.save();

    // Create ledger entry
    await WalletLedger.create({
      wallet: wallet._id,
      transactionType: 'Credit',
      amount: mongoose.Types.Decimal128.fromString(numAmount.toFixed(2)),
      balanceBefore: mongoose.Types.Decimal128.fromString(currentBalance.toFixed(2)),
      balanceAfter: mongoose.Types.Decimal128.fromString(newBalance.toFixed(2)),
      description: 'Online top-up via card/payment gateway',
      referenceType: 'TopUp',
      referenceId: paymentToken,
    });

    return res.status(200).json({
      success: true,
      message: 'Wallet balance topped up successfully.',
      wallet: {
        walletId: wallet._id,
        accountId: deriveWalletAccountId(req.user.id),
        userId: wallet.user,
        balance: wallet.balance.toString(),
        currency: wallet.currency,
        status: wallet.status,
      },
      transaction: {
        amount: numAmount,
        type: 'credit',
        status: 'completed',
        timestamp: new Date()
      }
    });
  } catch (err) {
    console.error('topUpWallet error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

