import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import WalletLedger from '../models/WalletLedger.js';
import PaymentToken from '../models/PaymentToken.js';
import User from '../models/User.js';
import { sendNotification } from '../socketManager.js';

/**
 * EP-80 (US-404)
 * Process checkout payment scanned from an attendee's QR token.
 * POST /api/vendors/checkout
 * Request body: { token, amount }
 */
export const processVendorCheckout = async (req, res) => {
  try {
    const { token, amount } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Payment token is required.' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount. Must be a positive number.' });
    }

    // 1. Find the payment token
    const paymentToken = await PaymentToken.findOne({ token });

    if (!paymentToken) {
      return res.status(404).json({ success: false, message: 'Payment token not found.' });
    }

    // 2. Validate token status and expiry
    if (paymentToken.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `This payment token has already been ${paymentToken.status.toLowerCase()}.`,
      });
    }

    if (new Date() >= paymentToken.expiresAt) {
      // Lazy expire token
      paymentToken.status = 'Expired';
      await paymentToken.save();
      return res.status(400).json({ success: false, message: 'This payment token has expired.' });
    }

    // 3. Look up attendee's wallet
    const wallet = await Wallet.findById(paymentToken.wallet);
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Associated wallet not found.' });
    }

    if (wallet.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Associated wallet is not active.' });
    }

    const currentBalance = parseFloat(wallet.balance.toString());

    // US-405: Check if balance is adequate
    if (currentBalance < numAmount) {
      // Send WebSocket rejection event to attendee
      sendNotification(wallet.user.toString(), {
        type: 'TX_REJECTED',
        message: 'Insufficient Wallet Balance',
        amount: numAmount,
        timestamp: new Date(),
      });

      return res.status(400).json({ success: false, message: 'Insufficient Wallet Balance' });
    }

    // 4. Perform atomic balance deduction and ledger writing
    const newBalance = currentBalance - numAmount;
    wallet.balance = mongoose.Types.Decimal128.fromString(newBalance.toFixed(2));
    
    // Mongoose schema validator will throw an error and abort if balance goes negative
    await wallet.save();

    // Mark the payment token as Used
    paymentToken.status = 'Used';
    paymentToken.debitedAmount = mongoose.Types.Decimal128.fromString(numAmount.toFixed(2));
    paymentToken.vendorId = req.user.id; // vendor user id from protect middleware
    await paymentToken.save();

    // Create WalletLedger debit entry
    const ledger = await WalletLedger.create({
      wallet: wallet._id,
      transactionType: 'Debit',
      amount: mongoose.Types.Decimal128.fromString(numAmount.toFixed(2)),
      balanceBefore: mongoose.Types.Decimal128.fromString(currentBalance.toFixed(2)),
      balanceAfter: mongoose.Types.Decimal128.fromString(newBalance.toFixed(2)),
      description: `POS Checkout Payment to Vendor`,
      referenceType: 'VendorPayment',
      referenceId: paymentToken._id.toString(),
    });

    // Fetch vendor user profile details to get their full name
    const vendorUser = await User.findById(req.user.id);
    const vendorName = vendorUser ? vendorUser.fullName : 'Stall Vendor';

    // Broadcast success event to the attendee's client screen
    sendNotification(wallet.user.toString(), {
      type: 'TX_SUCCESS',
      message: 'Transaction completed successfully.',
      amount: numAmount,
      vendorName,
      remainingBalance: newBalance,
      timestamp: ledger.createdAt,
    });

    return res.status(200).json({
      success: true,
      message: 'Transaction completed successfully.',
      transaction: {
        transactionId: ledger._id,
        amount: numAmount,
        currency: wallet.currency,
        timestamp: ledger.createdAt,
      },
    });
  } catch (error) {
    console.error('processVendorCheckout error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

